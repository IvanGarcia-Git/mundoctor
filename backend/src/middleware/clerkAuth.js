import { requireAuth as clerkRequireAuth, clerkClient, getAuth } from '@clerk/express';
import { query } from '../config/database.js';
import { createUserInDB } from '../controllers/userController.js';

// Enhanced Clerk authentication middleware with database integration
export const requireAuth = clerkRequireAuth();

// Optional authentication - doesn't fail if user not authenticated
export const withAuth = (req, res, next) => {
  const auth = getAuth(req);
  req.auth = auth;
  next();
};

// Middleware to attach user data from database with auto-sync fallback
export const attachUser = async (req, res, next) => {
  try {
    if (!req.auth?.userId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No valid authentication token provided'
      });
    }

    const userResult = await query(`
      SELECT 
        u.*,
        up.theme,
        up.notifications_enabled,
        up.email_notifications,
        up.sms_notifications,
        up.language,
        up.timezone
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.clerk_id = $1
    `, [req.auth.userId]);

    // If user not found in database, attempt auto-sync from Clerk
    if (userResult.rows.length === 0) {
      console.log(`🔄 User ${req.auth.userId} not found in DB, attempting auto-sync...`);
      
      try {
        // Get user data from Clerk
        const clerkUser = await clerkClient.users.getUser(req.auth.userId);
        
        if (clerkUser) {
          // Create user in database
          const newUser = await createUserInDB(clerkUser);
          console.log(`✅ Auto-sync successful for user: ${clerkUser.emailAddresses?.[0]?.emailAddress}`);
          
          // Re-query to get user with preferences
          const syncedUserResult = await query(`
            SELECT 
              u.*,
              up.theme,
              up.notifications_enabled,
              up.email_notifications,
              up.sms_notifications,
              up.language,
              up.timezone
            FROM users u
            LEFT JOIN user_preferences up ON u.id = up.user_id
            WHERE u.clerk_id = $1
          `, [req.auth.userId]);
          
          if (syncedUserResult.rows.length > 0) {
            req.user = syncedUserResult.rows[0];
            return next();
          }
        }
      } catch (syncError) {
        console.error('Auto-sync failed:', syncError);
      }
      
      return res.status(404).json({ 
        error: 'User not found',
        message: 'User not found in database and auto-sync failed. Please try logging out and back in.',
        action: 'complete_registration'
      });
    }

    req.user = userResult.rows[0];
    next();

  } catch (error) {
    console.error('Attach user error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user data',
      message: 'Unable to retrieve user information'
    });
  }
};

// Role-based authorization middleware
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'User data not attached. Ensure requireAuth and attachUser are used first.'
      });
    }

    if (!Array.isArray(allowedRoles)) {
      allowedRoles = [allowedRoles];
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
};

// Specific role middleware functions
export const requireAdmin = requireRole(['admin']);
export const requireProfessional = requireRole(['professional']);
export const requirePatient = requireRole(['patient']);
export const requireProfessionalOrAdmin = requireRole(['professional', 'admin']);
export const requirePatientOrProfessional = requireRole(['patient', 'professional']);

// Middleware to check if professional profile is complete and verified
export const requireCompleteProfile = async (req, res, next) => {
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
        specialty_id
      FROM professionals 
      WHERE user_id = $1
    `, [req.user.id]);

    if (profResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Professional profile not found',
        message: 'Professional profile not created. Please complete your profile.',
        action: 'complete_profile'
      });
    }

    const professional = profResult.rows[0];

    // Check if profile is complete
    if (!professional.profile_completed) {
      return res.status(400).json({ 
        error: 'Profile incomplete',
        message: 'Please complete your professional profile before accessing this resource.',
        action: 'complete_profile',
        missingFields: {
          license_number: !professional.license_number,
          dni: !professional.dni,
          specialty: !professional.specialty_id
        }
      });
    }

    // Check if profile is verified
    if (!professional.verified) {
      return res.status(403).json({ 
        error: 'Profile not verified',
        message: 'Your professional profile is pending verification. Please wait for admin approval.',
        action: 'pending_verification'
      });
    }

    // Attach professional data to request
    req.professional = professional;
    next();

  } catch (error) {
    console.error('Check profile error:', error);
    res.status(500).json({ 
      error: 'Failed to check profile status',
      message: 'Unable to verify professional profile'
    });
  }
};

// Middleware to check subscription status for professionals
export const requireActiveSubscription = async (req, res, next) => {
  try {
    if (req.user.role !== 'professional') {
      return next(); // Skip check for non-professionals
    }

    const subResult = await query(`
      SELECT 
        s.plan,
        s.is_active,
        s.end_date,
        p.subscription_plan
      FROM professionals p
      LEFT JOIN subscriptions s ON p.id = s.professional_id AND s.is_active = true
      WHERE p.user_id = $1
    `, [req.user.id]);

    if (subResult.rows.length === 0) {
      return res.status(403).json({ 
        error: 'No subscription found',
        message: 'Professional subscription required to access this resource.',
        action: 'upgrade_subscription'
      });
    }

    const subscription = subResult.rows[0];

    // Check if subscription is active and not expired
    if (!subscription.is_active || (subscription.end_date && new Date(subscription.end_date) < new Date())) {
      return res.status(403).json({ 
        error: 'Subscription inactive',
        message: 'Your subscription has expired. Please renew to continue.',
        action: 'renew_subscription',
        plan: subscription.subscription_plan
      });
    }

    req.subscription = subscription;
    next();

  } catch (error) {
    console.error('Check subscription error:', error);
    res.status(500).json({ 
      error: 'Failed to check subscription status',
      message: 'Unable to verify subscription'
    });
  }
};

// Rate limiting for sensitive endpoints per user
export const userRateLimit = (windowMs = 15 * 60 * 1000, maxRequests = 10) => {
  const requests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create user request history
    if (!requests.has(userId)) {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
    requests.set(userId, validRequests);

    // Check if limit exceeded
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Maximum ${maxRequests} requests per ${windowMs / 1000 / 60} minutes.`,
        retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
      });
    }

    // Add current request
    validRequests.push(now);
    requests.set(userId, validRequests);

    next();
  };
};

// Middleware to validate request ownership (user can only access their own data)
export const requireOwnership = (userIdField = 'user_id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'User authentication required for ownership validation'
      });
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Get target user ID from params, body, or query
    const targetUserId = req.params[userIdField] || req.body[userIdField] || req.query[userIdField];

    if (!targetUserId) {
      return res.status(400).json({ 
        error: 'Missing user identifier',
        message: `${userIdField} is required for this operation`
      });
    }

    // Check if user owns the resource
    if (req.user.id !== targetUserId) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only access your own resources'
      });
    }

    next();
  };
};

// Combine common middleware chains
export const authenticateAndAttach = [requireAuth, attachUser];
export const authenticateAdmin = [requireAuth, attachUser, requireAdmin];
export const authenticateProfessional = [requireAuth, attachUser, requireProfessional];
export const authenticatePatient = [requireAuth, attachUser, requirePatient];
export const authenticateVerifiedProfessional = [requireAuth, attachUser, requireProfessional, requireCompleteProfile];