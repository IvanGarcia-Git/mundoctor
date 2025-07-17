import { requireAuth as clerkRequireAuth, clerkClient, getAuth } from '@clerk/express';
import { query } from '../config/database.js';
import { logInfo, logWarning, logError } from '../utils/logger.js';
import { createAuditLog, AuditActions, RiskLevels } from '../utils/auditLog.js';
import { AuthenticationError, AuthorizationError, AppError } from './errorHandler.js';
import { createUserInDB } from '../controllers/userController.js';

// JWT token cache for performance optimization
const tokenCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Enhanced authentication middleware with comprehensive logging and caching
export const requireAuth = (req, res, next) => {
  const startTime = Date.now();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  const authHeader = req.headers.authorization;
  
  // Check cache first for performance
  const cacheKey = authHeader ? `auth:${authHeader.substring(0, 50)}` : null;
  const cachedAuth = cacheKey ? tokenCache.get(cacheKey) : null;
  
  if (cachedAuth && (Date.now() - cachedAuth.timestamp) < CACHE_TTL) {
    req.auth = cachedAuth.auth;
    logInfo('Authentication cache hit', {
      userId: req.auth?.userId,
      url: req.originalUrl,
      ip,
      cacheAge: Date.now() - cachedAuth.timestamp
    });
    return next();
  }
  
  logInfo('Authentication attempt', {
    url: req.originalUrl,
    method: req.method,
    ip,
    userAgent,
    hasToken: !!authHeader,
    cacheKey: cacheKey ? 'present' : 'none'
  });
  
  clerkRequireAuth()(req, res, (error) => {
    const duration = Date.now() - startTime;
    
    if (error) {
      logError(error, {
        event: 'authentication_failed',
        url: req.originalUrl,
        ip,
        userAgent,
        duration,
        errorType: error.name,
        errorMessage: error.message
      });
      
      // Create audit log for failed authentication
      createAuditLog({
        action: AuditActions.LOGIN_FAILED,
        resource: 'authentication',
        details: {
          url: req.originalUrl,
          method: req.method,
          error: error.message,
          userAgent
        },
        ipAddress: ip,
        riskLevel: RiskLevels.MEDIUM,
        success: false
      });
      
      throw new AuthenticationError('Authentication failed');
    }
    
    // Cache successful authentication
    if (cacheKey && req.auth) {
      tokenCache.set(cacheKey, {
        auth: req.auth,
        timestamp: Date.now()
      });
      
      // Clean up old cache entries
      if (tokenCache.size > 1000) {
        const oldestEntries = Array.from(tokenCache.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp)
          .slice(0, 200);
        
        oldestEntries.forEach(([key]) => tokenCache.delete(key));
      }
    }
    
    logInfo('Authentication successful', {
      userId: req.auth?.userId,
      url: req.originalUrl,
      ip,
      duration,
      cached: false
    });
    
    next();
  });
};

// Optional authentication - doesn't fail if user not authenticated
export const withAuth = (req, res, next) => {
  const auth = getAuth(req);
  req.auth = auth;
  
  if (auth?.userId) {
    logInfo('Optional authentication successful', {
      userId: auth.userId,
      url: req.originalUrl,
      ip: req.ip
    });
  }
  
  next();
};

// Enhanced middleware to attach user data with comprehensive user info and auto-sync
export const attachUser = async (req, res, next) => {
  const startTime = Date.now();
  const ip = req.ip || req.connection.remoteAddress;
  
  try {
    if (!req.auth?.userId) {
      throw new AuthenticationError('Authentication required');
    }

    const userResult = await query(`
      SELECT 
        u.*,
        up.theme,
        up.notifications_enabled,
        up.email_notifications,
        up.sms_notifications,
        up.language,
        up.timezone,
        CASE 
          WHEN u.role = 'professional' THEN (
            SELECT row_to_json(p.*) FROM professionals p WHERE p.user_id = u.id
          )
          WHEN u.role = 'patient' THEN (
            SELECT row_to_json(pt.*) FROM patients pt WHERE pt.user_id = u.id
          )
          ELSE NULL
        END as role_data
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.id = $1
    `, [req.auth.userId]);

    // If user not found in database, attempt auto-sync from Clerk
    if (userResult.rows.length === 0) {
      logWarning('User not found in database, attempting auto-sync', {
        userId: req.auth.userId,
        url: req.originalUrl,
        ip
      });
      
      try {
        // Get user data from Clerk
        const clerkUser = await clerkClient.users.getUser(req.auth.userId);
        
        if (clerkUser) {
          // Create user in database
          const newUser = await createUserInDB(clerkUser);
          
          logInfo('Auto-sync successful', {
            userId: req.auth.userId,
            email: clerkUser.emailAddresses?.[0]?.emailAddress,
            url: req.originalUrl
          });
          
          // Create audit log for auto-sync
          await createAuditLog({
            userId: req.auth.userId,
            action: AuditActions.USER_AUTO_SYNCED,
            resource: 'user',
            resourceId: req.auth.userId,
            details: {
              email: clerkUser.emailAddresses?.[0]?.emailAddress,
              role: newUser.role,
              syncTrigger: 'auto_attach_user'
            },
            ipAddress: ip,
            riskLevel: RiskLevels.LOW
          });
          
          // Re-query to get user with preferences
          const syncedUserResult = await query(`
            SELECT 
              u.*,
              up.theme,
              up.notifications_enabled,
              up.email_notifications,
              up.sms_notifications,
              up.language,
              up.timezone,
              CASE 
                WHEN u.role = 'professional' THEN (
                  SELECT row_to_json(p.*) FROM professionals p WHERE p.user_id = u.id
                )
                WHEN u.role = 'patient' THEN (
                  SELECT row_to_json(pt.*) FROM patients pt WHERE pt.user_id = u.id
                )
                ELSE NULL
              END as role_data
            FROM users u
            LEFT JOIN user_preferences up ON u.id = up.user_id
            WHERE u.id = $1
          `, [req.auth.userId]);
          
          if (syncedUserResult.rows.length > 0) {
            req.user = syncedUserResult.rows[0];
            
            // Log user access after successful sync
            logInfo('User data attached after auto-sync', {
              userId: req.user.id,
              role: req.user.role,
              status: req.user.status,
              url: req.originalUrl,
              duration: Date.now() - startTime,
            });
            
            return next();
          }
        }
      } catch (syncError) {
        logError(syncError, {
          event: 'auto_sync_failed',
          userId: req.auth.userId,
          url: req.originalUrl,
          ip
        });
      }
      
      throw new AuthenticationError('User not found in database and auto-sync failed');
    }

    const user = userResult.rows[0];
    req.user = user;
    
    // Log user access with enhanced information
    logInfo('User data attached', {
      userId: user.id,
      role: user.role,
      status: user.status,
      url: req.originalUrl,
      duration: Date.now() - startTime,
      hasRoleData: !!user.role_data
    });
    
    // Create audit log for user access
    await createAuditLog({
      userId: user.id,
      action: AuditActions.USER_ACCESS,
      resource: 'endpoint',
      resourceId: req.originalUrl,
      details: {
        method: req.method,
        userAgent: req.get('User-Agent'),
        role: user.role,
        status: user.status
      },
      ipAddress: ip,
      riskLevel: RiskLevels.LOW
    });
    
    next();
  } catch (error) {
    logError(error, {
      event: 'attach_user_failed',
      userId: req.auth?.userId,
      url: req.originalUrl,
      duration: Date.now() - startTime,
      ip
    });
    
    throw error;
  }
};

// Enhanced role-based authorization middleware with granular permissions
export const requireRole = (allowedRoles, options = {}) => {
  const { 
    strict = false, 
    adminOverride = true,
    logAccess = true 
  } = options;
  
  return async (req, res, next) => {
    const startTime = Date.now();
    
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      // Ensure allowedRoles is an array
      if (!Array.isArray(allowedRoles)) {
        allowedRoles = [allowedRoles];
      }

      // Admin override (unless strict mode is enabled)
      if (!strict && adminOverride && req.user.role === 'admin') {
        if (logAccess) {
          logInfo('Admin override authorization successful', {
            userId: req.user.id,
            userRole: req.user.role,
            requiredRoles: allowedRoles,
            url: req.originalUrl,
            method: req.method,
            override: true
          });
        }
        return next();
      }

      // Check if user has required role
      if (!allowedRoles.includes(req.user.role)) {
        logWarning('Authorization failed - insufficient permissions', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          url: req.originalUrl,
          method: req.method,
          ip: req.ip,
          strict,
          adminOverride
        });
        
        // Create audit log for authorization failure
        await createAuditLog({
          userId: req.user.id,
          action: AuditActions.AUTHORIZATION_FAILED,
          resource: 'endpoint',
          resourceId: req.originalUrl,
          details: {
            userRole: req.user.role,
            requiredRoles: allowedRoles,
            method: req.method,
            strict,
            adminOverride
          },
          ipAddress: req.ip,
          riskLevel: RiskLevels.MEDIUM,
          success: false
        });
        
        throw new AuthorizationError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
      }

      if (logAccess) {
        logInfo('Authorization successful', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          url: req.originalUrl,
          method: req.method,
          duration: Date.now() - startTime
        });
      }

      next();
    } catch (error) {
      logError(error, {
        event: 'role_authorization_failed',
        userId: req.user?.id,
        userRole: req.user?.role,
        requiredRoles: allowedRoles,
        url: req.originalUrl,
        duration: Date.now() - startTime
      });
      
      throw error;
    }
  };
};

// Specific role middleware functions with enhanced options
export const requireAdmin = (options = {}) => requireRole(['admin'], { strict: true, ...options });
export const requireProfessional = (options = {}) => requireRole(['professional'], options);
export const requirePatient = (options = {}) => requireRole(['patient'], options);
export const requireProfessionalOrAdmin = (options = {}) => requireRole(['professional', 'admin'], options);
export const requirePatientOrProfessional = (options = {}) => requireRole(['patient', 'professional'], options);

// Enhanced middleware to check if professional profile is complete and verified
export const requireCompleteProfile = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    if (req.user.role !== 'professional') {
      return next(); // Skip check for non-professionals
    }

    const profResult = await query(`
      SELECT 
        profile_completed, 
        verified,
        license_number,
        dni,
        specialty_id,
        subscription_plan
      FROM professionals 
      WHERE user_id = $1
    `, [req.user.id]);

    if (profResult.rows.length === 0) {
      logWarning('Professional profile not found', {
        userId: req.user.id,
        url: req.originalUrl
      });
      
      throw new AuthenticationError('Professional profile not found');
    }

    const professional = profResult.rows[0];

    // Check if profile is complete
    if (!professional.profile_completed) {
      logWarning('Incomplete professional profile access attempt', {
        userId: req.user.id,
        url: req.originalUrl,
        missingFields: {
          license_number: !professional.license_number,
          dni: !professional.dni,
          specialty: !professional.specialty_id
        }
      });
      
      throw new AuthorizationError('Profile incomplete. Please complete your professional profile.');
    }

    // Check if profile is verified
    if (!professional.verified) {
      logWarning('Unverified professional profile access attempt', {
        userId: req.user.id,
        url: req.originalUrl,
        profileCompleted: professional.profile_completed
      });
      
      throw new AuthorizationError('Profile not verified. Please wait for admin approval.');
    }

    // Attach professional data to request
    req.professional = professional;
    
    logInfo('Professional profile verification successful', {
      userId: req.user.id,
      url: req.originalUrl,
      duration: Date.now() - startTime,
      subscriptionPlan: professional.subscription_plan
    });
    
    next();

  } catch (error) {
    logError(error, {
      event: 'complete_profile_check_failed',
      userId: req.user?.id,
      url: req.originalUrl,
      duration: Date.now() - startTime
    });
    
    throw error;
  }
};

// Enhanced middleware to check subscription status for professionals
export const requireActiveSubscription = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    if (req.user.role !== 'professional') {
      return next(); // Skip check for non-professionals
    }

    const subResult = await query(`
      SELECT 
        s.status,
        s.plan_name,
        s.current_period_end,
        s.cancel_at_period_end,
        p.subscription_plan
      FROM subscriptions s
      JOIN professionals p ON s.user_id = p.user_id
      WHERE s.user_id = $1 AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [req.user.id]);

    if (subResult.rows.length === 0) {
      logWarning('No active subscription found', {
        userId: req.user.id,
        url: req.originalUrl
      });
      
      throw new AuthorizationError('Active subscription required to access this resource');
    }

    const subscription = subResult.rows[0];

    // Check if subscription is active and not expired
    if (subscription.current_period_end && new Date(subscription.current_period_end) < new Date()) {
      logWarning('Expired subscription access attempt', {
        userId: req.user.id,
        url: req.originalUrl,
        planName: subscription.plan_name,
        expiredAt: subscription.current_period_end
      });
      
      throw new AuthorizationError('Subscription has expired. Please renew to continue.');
    }

    req.subscription = subscription;
    
    logInfo('Subscription verification successful', {
      userId: req.user.id,
      url: req.originalUrl,
      duration: Date.now() - startTime,
      planName: subscription.plan_name,
      expiresAt: subscription.current_period_end
    });
    
    next();

  } catch (error) {
    logError(error, {
      event: 'subscription_check_failed',
      userId: req.user?.id,
      url: req.originalUrl,
      duration: Date.now() - startTime
    });
    
    throw error;
  }
};

// Enhanced rate limiting per user with intelligent scaling
export const userRateLimit = (options = {}) => {
  const { 
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    scalingFactor = 1.5, // Scale limits based on user role
    bypassRoles = ['admin'] 
  } = options;
  
  const requests = new Map();

  return async (req, res, next) => {
    const startTime = Date.now();
    
    try {
      if (!req.user) {
        return next();
      }

      // Bypass rate limiting for certain roles
      if (bypassRoles.includes(req.user.role)) {
        logInfo('Rate limiting bypassed for privileged role', {
          userId: req.user.id,
          role: req.user.role,
          url: req.originalUrl
        });
        return next();
      }

      const userId = req.user.id;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Calculate effective limit based on user role
      let effectiveLimit = maxRequests;
      if (req.user.role === 'professional') {
        effectiveLimit = Math.floor(maxRequests * scalingFactor);
      }

      // Get or create user request history
      if (!requests.has(userId)) {
        requests.set(userId, []);
      }

      const userRequests = requests.get(userId);
      
      // Remove old requests outside the window
      const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
      requests.set(userId, validRequests);

      // Check if limit exceeded
      if (validRequests.length >= effectiveLimit) {
        const retryAfter = Math.ceil((validRequests[0] + windowMs - now) / 1000);
        
        logWarning('Rate limit exceeded', {
          userId: req.user.id,
          role: req.user.role,
          url: req.originalUrl,
          requestCount: validRequests.length,
          limit: effectiveLimit,
          retryAfter
        });
        
        // Create audit log for rate limiting
        await createAuditLog({
          userId: req.user.id,
          action: AuditActions.RATE_LIMITED,
          resource: 'endpoint',
          resourceId: req.originalUrl,
          details: {
            requestCount: validRequests.length,
            limit: effectiveLimit,
            windowMs,
            retryAfter
          },
          ipAddress: req.ip,
          riskLevel: RiskLevels.MEDIUM,
          success: false
        });
        
        const error = new Error('Rate limit exceeded');
        error.status = 429;
        error.retryAfter = retryAfter;
        error.limit = effectiveLimit;
        error.remaining = 0;
        throw error;
      }

      // Add current request
      validRequests.push(now);
      requests.set(userId, validRequests);

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': effectiveLimit,
        'X-RateLimit-Remaining': effectiveLimit - validRequests.length,
        'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
      });

      next();
    } catch (error) {
      logError(error, {
        event: 'rate_limiting_failed',
        userId: req.user?.id,
        url: req.originalUrl,
        duration: Date.now() - startTime
      });
      
      throw error;
    }
  };
};

// Enhanced middleware to validate request ownership
export const requireOwnership = (options = {}) => {
  const { 
    userIdField = 'user_id',
    allowAdmin = true,
    allowProfessionalAccess = false // For professionals accessing patient data
  } = options;
  
  return async (req, res, next) => {
    const startTime = Date.now();
    
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required for ownership validation');
      }

      // Admin can access any resource (if allowed)
      if (allowAdmin && req.user.role === 'admin') {
        logInfo('Admin ownership override', {
          userId: req.user.id,
          url: req.originalUrl,
          userIdField
        });
        return next();
      }

      // Get target user ID from params, body, or query
      const targetUserId = req.params[userIdField] || req.body[userIdField] || req.query[userIdField];

      if (!targetUserId) {
        throw new AuthenticationError(`${userIdField} is required for this operation`);
      }

      // Check if user owns the resource
      if (req.user.id !== targetUserId) {
        // Special case: professionals accessing patient data through appointments
        if (allowProfessionalAccess && req.user.role === 'professional') {
          // This would need additional logic to verify professional-patient relationship
          // For now, we'll log and allow (implement proper verification as needed)
          logWarning('Professional accessing patient data', {
            professionalId: req.user.id,
            patientId: targetUserId,
            url: req.originalUrl
          });
        } else {
          logWarning('Ownership validation failed', {
            userId: req.user.id,
            targetUserId,
            url: req.originalUrl,
            userIdField
          });
          
          throw new AuthorizationError('You can only access your own resources');
        }
      }

      logInfo('Ownership validation successful', {
        userId: req.user.id,
        targetUserId,
        url: req.originalUrl,
        duration: Date.now() - startTime
      });

      next();
    } catch (error) {
      logError(error, {
        event: 'ownership_validation_failed',
        userId: req.user?.id,
        url: req.originalUrl,
        userIdField,
        duration: Date.now() - startTime
      });
      
      throw error;
    }
  };
};

// Enhanced middleware combinations with performance optimizations
export const authenticateAndAttach = [requireAuth, attachUser];
export const authenticateAdmin = [requireAuth, attachUser, requireAdmin()];
export const authenticateProfessional = [requireAuth, attachUser, requireProfessional()];
export const authenticatePatient = [requireAuth, attachUser, requirePatient()];
export const authenticateVerifiedProfessional = [
  requireAuth, 
  attachUser, 
  requireProfessional(), 
  requireCompleteProfile
];
export const authenticateActiveSubscription = [
  requireAuth, 
  attachUser, 
  requireProfessional(), 
  requireCompleteProfile,
  requireActiveSubscription
];

// Cache cleanup utility
export const cleanupAuthCache = () => {
  const now = Date.now();
  const expiredKeys = [];
  
  for (const [key, value] of tokenCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      expiredKeys.push(key);
    }
  }
  
  expiredKeys.forEach(key => tokenCache.delete(key));
  
  logInfo('Authentication cache cleaned', {
    expired: expiredKeys.length,
    remaining: tokenCache.size
  });
};

// Set up periodic cache cleanup
setInterval(cleanupAuthCache, CACHE_TTL);

export default {
  requireAuth,
  withAuth,
  attachUser,
  requireRole,
  requireAdmin,
  requireProfessional,
  requirePatient,
  requireProfessionalOrAdmin,
  requirePatientOrProfessional,
  requireCompleteProfile,
  requireActiveSubscription,
  userRateLimit,
  requireOwnership,
  authenticateAndAttach,
  authenticateAdmin,
  authenticateProfessional,
  authenticatePatient,
  authenticateVerifiedProfessional,
  authenticateActiveSubscription,
  cleanupAuthCache
};