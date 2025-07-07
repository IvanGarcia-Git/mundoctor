import { z } from 'zod';
import { validationErrorResponse } from '../utils/responses.js';
import { logWarning } from '../utils/logger.js';

// Generic validation middleware factory
export const validateSchema = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      let dataToValidate;
      
      switch (source) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        case 'headers':
          dataToValidate = req.headers;
          break;
        default:
          dataToValidate = req.body;
      }

      // Validate the data
      const validatedData = await schema.parseAsync(dataToValidate);
      
      // Replace the original data with validated data
      req[source] = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: err.received,
        }));

        logWarning('Validation failed', { 
          source, 
          errors: validationErrors,
          originalData: source === 'body' ? req.body : req[source]
        });

        return validationErrorResponse(res, validationErrors);
      }

      // Handle other validation errors
      logWarning('Unexpected validation error', { error: error.message });
      return validationErrorResponse(res, [{ 
        field: 'unknown', 
        message: 'Validation failed due to unexpected error' 
      }]);
    }
  };
};

// Common validation schemas
export const schemas = {
  // User schemas
  userId: z.string().min(1, 'User ID is required'),
  
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  phone: z.string()
    .regex(/^[+]?[0-9\s\-\(\)]{10,15}$/, 'Invalid phone number format')
    .optional(),
  
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters'),
  
  // User role schema
  userRole: z.enum(['admin', 'professional', 'patient'], {
    errorMap: () => ({ message: 'Role must be admin, professional, or patient' })
  }),
  
  // User status schema
  userStatus: z.enum(['active', 'inactive', 'pending_validation', 'suspended'], {
    errorMap: () => ({ message: 'Invalid user status' })
  }),

  // Professional schemas
  specialty: z.string()
    .min(1, 'Specialty is required')
    .max(100, 'Specialty must not exceed 100 characters'),
  
  licenseNumber: z.string()
    .min(1, 'License number is required')
    .max(50, 'License number must not exceed 50 characters'),
  
  dni: z.string()
    .regex(/^[0-9]{8}[A-Z]$/, 'DNI must be in format: 8 digits followed by a letter')
    .optional(),
  
  experienceYears: z.number()
    .int('Experience years must be a whole number')
    .min(0, 'Experience years cannot be negative')
    .max(50, 'Experience years cannot exceed 50'),
  
  consultationFee: z.number()
    .min(0, 'Consultation fee cannot be negative')
    .max(1000, 'Consultation fee cannot exceed 1000'),
  
  // Pagination schemas
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),

  // Date schemas
  dateString: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  
  dateTimeString: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, 'DateTime must be in ISO 8601 format'),
  
  // File upload schemas
  fileUpload: z.object({
    originalname: z.string(),
    mimetype: z.string(),
    size: z.number().max(10 * 1024 * 1024, 'File size must not exceed 10MB'),
    buffer: z.instanceof(Buffer).optional(),
    filename: z.string().optional(),
    path: z.string().optional(),
  }),

  // Common ID schemas
  mongoId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId format'),
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Search schemas
  searchQuery: z.object({
    q: z.string().min(1, 'Search query cannot be empty').optional(),
    filters: z.record(z.any()).optional(),
  }),
};

// Pre-built validation middlewares for common use cases
export const validateBody = (schema) => validateSchema(schema, 'body');
export const validateParams = (schema) => validateSchema(schema, 'params');
export const validateQuery = (schema) => validateSchema(schema, 'query');
export const validateHeaders = (schema) => validateSchema(schema, 'headers');

// Common validation middleware combinations
export const validateUserId = validateParams(z.object({
  id: schemas.userId,
}));

export const validatePagination = validateQuery(schemas.pagination);

export const validateUserRegistration = validateBody(z.object({
  email: schemas.email,
  password: schemas.password,
  name: schemas.name,
  phone: schemas.phone,
  role: schemas.userRole,
}));

export const validateUserUpdate = validateBody(z.object({
  name: schemas.name.optional(),
  phone: schemas.phone,
  email: schemas.email.optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
}));

export const validateProfessionalProfile = validateBody(z.object({
  specialty: schemas.specialty,
  licenseNumber: schemas.licenseNumber,
  dni: schemas.dni,
  experienceYears: schemas.experienceYears.optional(),
  consultationFee: schemas.consultationFee.optional(),
  bio: z.string().max(1000, 'Bio must not exceed 1000 characters').optional(),
  education: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  availableHours: z.record(z.array(z.string())).optional(),
}));

export const validateRoleSelection = validateBody(z.object({
  role: schemas.userRole,
  profileData: z.object({
    licenseNumber: schemas.licenseNumber.optional(),
    dni: schemas.dni.optional(),
    specialty: schemas.specialty.optional(),
  }).optional(),
}));

// Input sanitization middleware
export const sanitizeInput = (req, res, next) => {
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Remove potential script tags and normalize whitespace
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);
  
  next();
};

export default {
  validateSchema,
  validateBody,
  validateParams,
  validateQuery,
  validateHeaders,
  validateUserId,
  validatePagination,
  validateUserRegistration,
  validateUserUpdate,
  validateProfessionalProfile,
  validateRoleSelection,
  sanitizeInput,
  schemas,
};