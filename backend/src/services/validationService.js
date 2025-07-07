import { clerkClient } from '@clerk/express';
import { query, withTransaction } from '../config/database.js';
import { logInfo, logError, logWarning } from '../utils/logger.js';
import { createAuditLog, AuditActions, RiskLevels } from '../utils/auditLog.js';

// Email validation patterns
const EMAIL_PATTERNS = {
  PROFESSIONAL_DOMAINS: [
    // Medical institutions
    'hospitalsanjuan.es', 'colegiomedicosvalencia.org', 'medicosdemadrid.es',
    // Common professional domains
    'colegiocofenfe.es', 'psicologos.es', 'enfermeria.es',
    // International medical domains
    'ama-assn.org', 'bma.org.uk', 'cmaj.ca'
  ],
  SUSPICIOUS_DOMAINS: [
    '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 
    'mailinator.com', 'yopmail.com', 'temp-mail.org'
  ],
  VALID_EXTENSIONS: ['.com', '.es', '.org', '.edu', '.gov', '.med']
};

// Phone validation patterns (Spanish focus)
const PHONE_PATTERNS = {
  SPANISH_MOBILE: /^(\+34|0034|34)?[6789]\d{8}$/,
  SPANISH_LANDLINE: /^(\+34|0034|34)?[89]\d{8}$/,
  INTERNATIONAL: /^\+[1-9]\d{1,14}$/
};

// Validate email address format and domain
export const validateEmail = async (email, userRole = null) => {
  const validation = {
    isValid: false,
    format: false,
    domain: false,
    professional: false,
    suspicious: false,
    warnings: [],
    errors: []
  };

  try {
    // Basic format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    validation.format = emailRegex.test(email);

    if (!validation.format) {
      validation.errors.push('Invalid email format');
      return validation;
    }

    const [localPart, domain] = email.toLowerCase().split('@');
    
    // Check for suspicious domains
    validation.suspicious = EMAIL_PATTERNS.SUSPICIOUS_DOMAINS.some(
      suspiciousDomain => domain.includes(suspiciousDomain)
    );

    if (validation.suspicious) {
      validation.warnings.push('Email uses temporary/disposable domain');
    }

    // Check for professional domains
    validation.professional = EMAIL_PATTERNS.PROFESSIONAL_DOMAINS.some(
      professionalDomain => domain.includes(professionalDomain)
    );

    // Domain validation
    validation.domain = EMAIL_PATTERNS.VALID_EXTENSIONS.some(
      ext => domain.endsWith(ext)
    );

    // Special validation for professionals
    if (userRole === 'professional') {
      if (validation.suspicious) {
        validation.errors.push('Professional accounts cannot use temporary email addresses');
      }
      
      if (!validation.professional) {
        validation.warnings.push('Consider using a professional medical domain');
      }
    }

    // Check if domain exists (basic check)
    try {
      // In a real implementation, you might want to do DNS lookup
      // For now, we'll just check the format
      validation.domain = true;
    } catch (error) {
      validation.warnings.push('Could not verify domain existence');
    }

    validation.isValid = validation.format && validation.domain && !validation.suspicious;

    logInfo('Email validation completed', {
      email: email.replace(/(.{2}).*@/, '$1***@'), // Mask email for privacy
      role: userRole,
      isValid: validation.isValid,
      professional: validation.professional,
      suspicious: validation.suspicious
    });

    return validation;

  } catch (error) {
    logError(error, { 
      event: 'email_validation_error',
      email: email.replace(/(.{2}).*@/, '$1***@')
    });
    
    validation.errors.push('Email validation service error');
    return validation;
  }
};

// Validate phone number format and region
export const validatePhone = async (phone, expectedCountry = 'ES') => {
  const validation = {
    isValid: false,
    format: false,
    country: null,
    type: null, // 'mobile', 'landline', 'international'
    warnings: [],
    errors: []
  };

  try {
    if (!phone) {
      validation.errors.push('Phone number is required');
      return validation;
    }

    // Clean phone number
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Validate Spanish phone numbers
    if (expectedCountry === 'ES' || cleanPhone.startsWith('+34') || cleanPhone.startsWith('34')) {
      if (PHONE_PATTERNS.SPANISH_MOBILE.test(cleanPhone)) {
        validation.format = true;
        validation.country = 'ES';
        validation.type = 'mobile';
      } else if (PHONE_PATTERNS.SPANISH_LANDLINE.test(cleanPhone)) {
        validation.format = true;
        validation.country = 'ES';
        validation.type = 'landline';
        validation.warnings.push('Mobile numbers are preferred for notifications');
      }
    }

    // Validate international phone numbers
    if (!validation.format && PHONE_PATTERNS.INTERNATIONAL.test(cleanPhone)) {
      validation.format = true;
      validation.country = 'INTERNATIONAL';
      validation.type = 'international';
      validation.warnings.push('International numbers may have limited SMS support');
    }

    if (!validation.format) {
      validation.errors.push('Invalid phone number format');
    }

    validation.isValid = validation.format;

    logInfo('Phone validation completed', {
      phone: phone.replace(/\d{4,}/g, '****'), // Mask phone for privacy
      isValid: validation.isValid,
      country: validation.country,
      type: validation.type
    });

    return validation;

  } catch (error) {
    logError(error, { 
      event: 'phone_validation_error',
      phone: phone.replace(/\d{4,}/g, '****')
    });
    
    validation.errors.push('Phone validation service error');
    return validation;
  }
};

// Verify email through Clerk
export const verifyEmailWithClerk = async (userId, email) => {
  try {
    logInfo('Starting email verification with Clerk', { userId, email: email.replace(/(.{2}).*@/, '$1***@') });

    // Get user from Clerk
    const clerkUser = await clerkClient.users.getUser(userId);
    
    if (!clerkUser) {
      throw new Error('User not found in Clerk');
    }

    // Check if email is already verified
    const emailAddress = clerkUser.emailAddresses.find(
      ea => ea.emailAddress.toLowerCase() === email.toLowerCase()
    );

    if (!emailAddress) {
      throw new Error('Email address not found in Clerk user');
    }

    if (emailAddress.verification?.status === 'verified') {
      logInfo('Email already verified', { userId, email: email.replace(/(.{2}).*@/, '$1***@') });
      
      // Update database
      await query(
        'UPDATE users SET verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );

      // Create audit log
      await createAuditLog({
        userId,
        action: AuditActions.USER_UPDATED,
        resource: 'email_verification',
        resourceId: userId,
        details: {
          email: email.replace(/(.{2}).*@/, '$1***@'),
          status: 'already_verified'
        },
        riskLevel: RiskLevels.LOW,
      });

      return { verified: true, status: 'already_verified' };
    }

    // Trigger verification email
    await clerkClient.emailAddresses.createEmailAddressVerification({
      emailAddressId: emailAddress.id,
    });

    logInfo('Email verification triggered', { userId, emailAddressId: emailAddress.id });

    // Create audit log
    await createAuditLog({
      userId,
      action: AuditActions.USER_UPDATED,
      resource: 'email_verification',
      resourceId: userId,
      details: {
        email: email.replace(/(.{2}).*@/, '$1***@'),
        status: 'verification_sent'
      },
      riskLevel: RiskLevels.LOW,
    });

    return { verified: false, status: 'verification_sent' };

  } catch (error) {
    logError(error, { 
      event: 'email_verification_failed',
      userId,
      email: email.replace(/(.{2}).*@/, '$1***@')
    });
    throw error;
  }
};

// Verify phone through Clerk (if SMS verification is enabled)
export const verifyPhoneWithClerk = async (userId, phone) => {
  try {
    logInfo('Starting phone verification with Clerk', { 
      userId, 
      phone: phone.replace(/\d{4,}/g, '****') 
    });

    // Get user from Clerk
    const clerkUser = await clerkClient.users.getUser(userId);
    
    if (!clerkUser) {
      throw new Error('User not found in Clerk');
    }

    // Check if phone is already verified
    const phoneNumber = clerkUser.phoneNumbers.find(
      pn => pn.phoneNumber === phone
    );

    if (!phoneNumber) {
      // Add phone number to Clerk user
      const newPhoneNumber = await clerkClient.phoneNumbers.createPhoneNumber({
        userId,
        phoneNumber: phone,
      });

      logInfo('Phone number added to Clerk user', { 
        userId, 
        phoneNumberId: newPhoneNumber.id 
      });
    }

    if (phoneNumber?.verification?.status === 'verified') {
      logInfo('Phone already verified', { 
        userId, 
        phone: phone.replace(/\d{4,}/g, '****') 
      });

      // Create audit log
      await createAuditLog({
        userId,
        action: AuditActions.USER_UPDATED,
        resource: 'phone_verification',
        resourceId: userId,
        details: {
          phone: phone.replace(/\d{4,}/g, '****'),
          status: 'already_verified'
        },
        riskLevel: RiskLevels.LOW,
      });

      return { verified: true, status: 'already_verified' };
    }

    // Trigger SMS verification (if available)
    try {
      await clerkClient.phoneNumbers.createPhoneNumberVerification({
        phoneNumberId: phoneNumber?.id || newPhoneNumber.id,
      });

      logInfo('SMS verification triggered', { userId });

      // Create audit log
      await createAuditLog({
        userId,
        action: AuditActions.USER_UPDATED,
        resource: 'phone_verification',
        resourceId: userId,
        details: {
          phone: phone.replace(/\d{4,}/g, '****'),
          status: 'verification_sent'
        },
        riskLevel: RiskLevels.LOW,
      });

      return { verified: false, status: 'verification_sent' };

    } catch (smsError) {
      logWarning('SMS verification not available', { 
        userId, 
        error: smsError.message 
      });

      return { verified: false, status: 'verification_not_available' };
    }

  } catch (error) {
    logError(error, { 
      event: 'phone_verification_failed',
      userId,
      phone: phone.replace(/\d{4,}/g, '****')
    });
    throw error;
  }
};

// Validate professional credentials (Spanish focus)
export const validateProfessionalCredentials = async (credentials) => {
  const validation = {
    isValid: false,
    licenseNumber: false,
    dni: false,
    specialty: false,
    warnings: [],
    errors: []
  };

  try {
    const { licenseNumber, dni, specialty } = credentials;

    // Validate license number (Spanish medical license format)
    if (licenseNumber) {
      // Spanish medical license: NNNNNN/XX format or similar
      const licensePattern = /^\d{4,8}(\/[A-Z]{1,3})?$/;
      validation.licenseNumber = licensePattern.test(licenseNumber);
      
      if (!validation.licenseNumber) {
        validation.errors.push('Invalid medical license number format');
      }
    } else {
      validation.errors.push('Medical license number is required');
    }

    // Validate Spanish DNI
    if (dni) {
      const dniPattern = /^[0-9]{8}[A-Z]$/;
      validation.dni = dniPattern.test(dni);
      
      if (validation.dni) {
        // Validate DNI check letter
        const dniNumbers = dni.substring(0, 8);
        const dniLetter = dni.substring(8);
        const checkLetters = 'TRWAGMYFPDXBNJZSQVHLCKE';
        const expectedLetter = checkLetters[parseInt(dniNumbers) % 23];
        
        if (dniLetter !== expectedLetter) {
          validation.dni = false;
          validation.errors.push('Invalid DNI check letter');
        }
      } else {
        validation.errors.push('Invalid DNI format (must be 8 digits + letter)');
      }
    } else {
      validation.errors.push('DNI is required for professional verification');
    }

    // Validate specialty
    const validSpecialties = [
      'medicina_general', 'cardiologia', 'dermatologia', 'neurologia',
      'pediatria', 'psiquiatria', 'traumatologia', 'ginecologia',
      'oftalmologia', 'otorrinolaringologia', 'urologia', 'endocrinologia'
    ];

    if (specialty) {
      validation.specialty = validSpecialties.includes(specialty);
      if (!validation.specialty) {
        validation.warnings.push('Specialty not in standard list - manual review required');
      }
    } else {
      validation.errors.push('Medical specialty is required');
    }

    validation.isValid = validation.licenseNumber && validation.dni && 
                       (validation.specialty || specialty); // Allow custom specialties

    logInfo('Professional credentials validation completed', {
      licenseNumber: licenseNumber ? '****' : null,
      dni: dni ? dni.substring(0, 2) + '****' + dni.slice(-1) : null,
      specialty,
      isValid: validation.isValid
    });

    return validation;

  } catch (error) {
    logError(error, { 
      event: 'professional_credentials_validation_error',
      credentials: { 
        hasLicense: !!credentials.licenseNumber,
        hasDni: !!credentials.dni,
        specialty: credentials.specialty 
      }
    });
    
    validation.errors.push('Credentials validation service error');
    return validation;
  }
};

// Comprehensive user validation
export const validateUserData = async (userData, userRole) => {
  try {
    logInfo('Starting comprehensive user validation', { 
      role: userRole,
      hasEmail: !!userData.email,
      hasPhone: !!userData.phone 
    });

    const validations = {
      email: null,
      phone: null,
      professional: null,
      overall: {
        isValid: false,
        errors: [],
        warnings: []
      }
    };

    // Validate email
    if (userData.email) {
      validations.email = await validateEmail(userData.email, userRole);
      if (!validations.email.isValid) {
        validations.overall.errors.push(...validations.email.errors);
      }
      validations.overall.warnings.push(...validations.email.warnings);
    }

    // Validate phone
    if (userData.phone) {
      validations.phone = await validatePhone(userData.phone);
      if (!validations.phone.isValid) {
        validations.overall.errors.push(...validations.phone.errors);
      }
      validations.overall.warnings.push(...validations.phone.warnings);
    }

    // Validate professional credentials
    if (userRole === 'professional' && userData.professionalData) {
      validations.professional = await validateProfessionalCredentials(userData.professionalData);
      if (!validations.professional.isValid) {
        validations.overall.errors.push(...validations.professional.errors);
      }
      validations.overall.warnings.push(...validations.professional.warnings);
    }

    // Determine overall validity
    validations.overall.isValid = validations.overall.errors.length === 0;

    // Create audit log for validation
    await createAuditLog({
      userId: userData.userId,
      action: AuditActions.VALIDATION_SUBMITTED,
      resource: 'user_validation',
      resourceId: userData.userId,
      details: {
        role: userRole,
        validationResults: {
          email: validations.email?.isValid,
          phone: validations.phone?.isValid,
          professional: validations.professional?.isValid,
          overall: validations.overall.isValid
        },
        errorCount: validations.overall.errors.length,
        warningCount: validations.overall.warnings.length
      },
      riskLevel: validations.overall.isValid ? RiskLevels.LOW : RiskLevels.MEDIUM,
    });

    return validations;

  } catch (error) {
    logError(error, { 
      event: 'user_validation_error',
      role: userRole 
    });
    throw error;
  }
};

export default {
  validateEmail,
  validatePhone,
  verifyEmailWithClerk,
  verifyPhoneWithClerk,
  validateProfessionalCredentials,
  validateUserData,
};