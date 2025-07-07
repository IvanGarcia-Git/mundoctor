import { query } from '../config/database.js';

/**
 * Middleware to check user status and enforce restrictions
 * User statuses:
 * - 'incomplete': User needs to complete registration (redirect to complete profile)
 * - 'pending_validation': Professional pending admin approval (limited access)
 * - 'active': User is fully active and can access all features
 */

/**
 * Middleware to require user to have active status
 * Blocks incomplete and pending_validation users
 */
export const requireActiveStatus = async (req, res, next) => {
  try {
    if (!req.auth?.userId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userResult = await query(`
      SELECT id, status, role, name, email
      FROM users 
      WHERE id = $1
    `, [req.auth.userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = userResult.rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Account not fully active',
        code: 'ACCOUNT_INACTIVE',
        status: user.status,
        message: getStatusMessage(user.status, user.role),
        redirect: getStatusRedirect(user.status, user.role)
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('User status check error:', error);
    res.status(500).json({ 
      error: 'Failed to verify user status',
      code: 'STATUS_CHECK_FAILED'
    });
  }
};

/**
 * Middleware to require user to have at least completed registration
 * Blocks only incomplete users, allows pending_validation and active
 */
export const requireCompletedRegistration = async (req, res, next) => {
  try {
    if (!req.auth?.userId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userResult = await query(`
      SELECT id, status, role, name, email
      FROM users 
      WHERE id = $1
    `, [req.auth.userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = userResult.rows[0];

    if (user.status === 'incomplete') {
      return res.status(403).json({
        error: 'Registration incomplete',
        code: 'REGISTRATION_INCOMPLETE',
        status: user.status,
        message: getStatusMessage(user.status, user.role),
        redirect: getStatusRedirect(user.status, user.role)
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Registration status check error:', error);
    res.status(500).json({ 
      error: 'Failed to verify registration status',
      code: 'REGISTRATION_CHECK_FAILED'
    });
  }
};

/**
 * Middleware that attaches user status info without blocking
 * Used for informational purposes or conditional rendering
 */
export const attachUserStatus = async (req, res, next) => {
  try {
    if (!req.auth?.userId) {
      return next();
    }

    const userResult = await query(`
      SELECT id, status, role, name, email, verified, created_at, updated_at
      FROM users 
      WHERE id = $1
    `, [req.auth.userId]);

    if (userResult.rows.length > 0) {
      req.user = userResult.rows[0];
      req.userStatus = {
        status: req.user.status,
        isActive: req.user.status === 'active',
        isPending: req.user.status === 'pending_validation',
        isIncomplete: req.user.status === 'incomplete',
        message: getStatusMessage(req.user.status, req.user.role),
        redirect: getStatusRedirect(req.user.status, req.user.role)
      };
    }

    next();
  } catch (error) {
    console.error('Attach user status error:', error);
    // Don't block the request, just continue without status info
    next();
  }
};

/**
 * Helper function to get status message for frontend
 */
function getStatusMessage(status, role) {
  switch (status) {
    case 'incomplete':
      return role === 'professional' 
        ? 'Por favor completa tu perfil profesional para acceder a todas las funcionalidades'
        : 'Por favor completa tu registro para acceder a todas las funcionalidades';
    
    case 'pending_validation':
      return 'Tu perfil profesional está en revisión. Te notificaremos cuando sea aprobado.';
    
    case 'active':
      return 'Tu cuenta está completamente activa';
    
    default:
      return 'Estado de cuenta desconocido';
  }
}

/**
 * Helper function to get redirect path for frontend
 */
function getStatusRedirect(status, role) {
  switch (status) {
    case 'incomplete':
      return role === 'professional' 
        ? '/profesionales/completar-perfil'
        : '/completar-perfil';
    
    case 'pending_validation':
      return '/verification-pending';
    
    case 'active':
      return null; // No redirect needed
    
    default:
      return '/';
  }
}

/**
 * Function to update user status (for use in controllers)
 */
export const updateUserStatus = async (userId, newStatus) => {
  try {
    const validStatuses = ['incomplete', 'pending_validation', 'active'];
    
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    const result = await query(`
      UPDATE users 
      SET status = $2::user_status, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [userId, newStatus]);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
};

/**
 * Function to automatically determine and set user status based on profile completion
 */
export const refreshUserStatus = async (userId) => {
  try {
    const userResult = await query(`
      SELECT u.*, p.profile_completed, p.verified as professional_verified
      FROM users u
      LEFT JOIN professionals p ON u.id = p.user_id
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];
    let newStatus;

    switch (user.role) {
      case 'patient':
        // Patients are active by default after Clerk registration
        newStatus = 'active';
        break;
      
      case 'professional':
        if (!user.profile_completed) {
          newStatus = 'incomplete';
        } else if (!user.professional_verified) {
          newStatus = 'pending_validation';
        } else {
          newStatus = 'active';
        }
        break;
      
      case 'admin':
        // Admins are active by default
        newStatus = 'active';
        break;
      
      default:
        newStatus = 'incomplete';
    }

    // Only update if status has changed
    if (user.status !== newStatus) {
      return await updateUserStatus(userId, newStatus);
    }

    return user;
  } catch (error) {
    console.error('Error refreshing user status:', error);
    throw error;
  }
};

/**
 * Express route handler to check current user status
 */
export const getUserStatusInfo = async (req, res) => {
  try {
    if (!req.auth?.userId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userResult = await query(`
      SELECT u.*, p.profile_completed, p.verified as professional_verified
      FROM users u
      LEFT JOIN professionals p ON u.id = p.user_id
      WHERE u.id = $1
    `, [req.auth.userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = userResult.rows[0];

    res.json({
      success: true,
      data: {
        status: user.status,
        role: user.role,
        isActive: user.status === 'active',
        isPending: user.status === 'pending_validation',
        isIncomplete: user.status === 'incomplete',
        message: getStatusMessage(user.status, user.role),
        redirect: getStatusRedirect(user.status, user.role),
        profileCompleted: user.profile_completed || false,
        verified: user.professional_verified || user.verified || false
      }
    });
  } catch (error) {
    console.error('Error getting user status info:', error);
    res.status(500).json({ 
      error: 'Failed to get user status information',
      code: 'STATUS_INFO_FAILED'
    });
  }
};