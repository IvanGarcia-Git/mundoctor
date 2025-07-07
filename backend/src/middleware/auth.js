import { requireAuth as clerkRequireAuth, clerkClient } from '@clerk/express';
import { query } from '../config/database.js';
import { logInfo, logWarning, logError } from '../utils/logger.js';
import { unauthorizedResponse, forbiddenResponse, badRequestResponse, internalServerErrorResponse } from '../utils/responses.js';
import { AuthenticationError, AuthorizationError, AppError } from './errorHandler.js';

// Enhanced Clerk authentication middleware with comprehensive logging
export const requireAuth = (req, res, next) => {
  const startTime = Date.now();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  
  logInfo('Authentication attempt', {
    url: req.originalUrl,
    method: req.method,
    ip,
    userAgent,
    hasToken: !!req.headers.authorization,
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
      });
      
      throw new AuthenticationError('Authentication failed');
    }
    
    logInfo('Authentication successful', {
      userId: req.auth?.userId,
      url: req.originalUrl,
      ip,
      duration,
    });
    
    next();
  });
};

// Enhanced middleware to attach user data from database with comprehensive user info
export const attachUser = async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    if (!req.auth?.userId) {
      throw new AuthenticationError('Authentication required');
    }

    const userResult = await query(`
      SELECT 
        u.*,
        up.theme,
        up.notifications_enabled,
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

    if (userResult.rows.length === 0) {
      logWarning('User not found in database', {
        userId: req.auth.userId,
        url: req.originalUrl,
      });
      throw new AuthenticationError('User not found in database');
    }

    const user = userResult.rows[0];
    req.user = user;
    
    // Log user access
    logInfo('User data attached', {
      userId: user.id,
      role: user.role,
      status: user.status,
      url: req.originalUrl,
      duration: Date.now() - startTime,
    });
    
    next();
  } catch (error) {
    logError(error, {
      event: 'attach_user_failed',
      userId: req.auth?.userId,
      url: req.originalUrl,
      duration: Date.now() - startTime,
    });
    
    throw error;
  }
};

// Enhanced role-based authorization middleware with audit logging
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      logWarning('Authorization failed - insufficient permissions', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
      });
      
      throw new AuthorizationError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
    }

    logInfo('Authorization successful', {
      userId: req.user.id,
      userRole: req.user.role,
      url: req.originalUrl,
      method: req.method,
    });

    next();
  };
};

// Professional-specific middleware
export const requireProfessional = requireRole(['professional']);

// Patient-specific middleware  
export const requirePatient = requireRole(['patient']);

// Admin-specific middleware
export const requireAdmin = requireRole(['admin']);

// Middleware to check if professional profile is complete
export const requireCompleteProfile = async (req, res, next) => {
  try {
    if (req.user.role !== 'professional') {
      return next();
    }

    const profResult = await query(`
      SELECT profile_completed, verified 
      FROM professionals 
      WHERE user_id = $1
    `, [req.user.id]);

    if (profResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Professional profile not found',
        action: 'complete_profile'
      });
    }

    const professional = profResult.rows[0];

    if (!professional.profile_completed) {
      return res.status(400).json({ 
        error: 'Profile incomplete',
        action: 'complete_profile'
      });
    }

    if (!professional.verified) {
      return res.status(400).json({ 
        error: 'Profile not verified',
        action: 'pending_verification'
      });
    }

    next();
  } catch (error) {
    console.error('Check profile error:', error);
    res.status(500).json({ error: 'Failed to check profile status' });
  }
};

// Middleware to validate API key for webhooks
export const validateWebhook = (req, res, next) => {
  const signature = req.headers['svix-signature'];
  
  if (!signature) {
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  // In production, you should verify the webhook signature
  // For now, we'll just check if it exists
  next();
};

// Rate limiting for sensitive endpoints
export const sensitiveRateLimit = (req, res, next) => {
  // This would integrate with express-rate-limit for specific endpoints
  // like password reset, profile updates, etc.
  next();
};