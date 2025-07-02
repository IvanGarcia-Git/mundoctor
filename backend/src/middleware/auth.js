import { requireAuth as clerkRequireAuth, clerkClient } from '@clerk/express';
import { query } from '../config/database.js';

// Clerk authentication middleware
export const requireAuth = clerkRequireAuth();

// Middleware to attach user data from database
export const attachUser = async (req, res, next) => {
  try {
    if (!req.auth?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userResult = await query(`
      SELECT 
        u.*,
        up.theme,
        up.notifications_enabled,
        up.language,
        up.timezone
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.clerk_id = $1
    `, [req.auth.userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    console.error('Attach user error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
};

// Role-based authorization middleware
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

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