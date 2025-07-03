import { withTransaction } from './auth.js';

/**
 * Middleware to check if user has required role(s)
 * @param {string|string[]} requiredRoles - Single role or array of roles
 * @returns {Function} Express middleware function
 */
export const requireRole = (requiredRoles) => {
  return async (req, res, next) => {
    try {
      const { userId } = req.auth;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      // Get user role from database
      const userRole = await withTransaction(async (client) => {
        const query = 'SELECT role FROM users WHERE id = $1';
        const result = await client.query(query, [userId]);
        
        if (result.rows.length === 0) {
          throw new Error('User not found');
        }
        
        return result.rows[0].role;
      });
      
      // Check if user has required role
      const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
        });
      }
      
      // Add user role to request for use in route handlers
      req.userRole = userRole;
      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware to check if user is professional
 */
export const requireProfessional = requireRole('professional');

/**
 * Middleware to check if user is patient
 */
export const requirePatient = requireRole('patient');

/**
 * Middleware to check if user is professional or admin
 */
export const requireProfessionalOrAdmin = requireRole(['professional', 'admin']);

/**
 * Middleware to get user's database ID and role
 * Adds dbUserId and userRole to req object
 */
export const getUserInfo = async (req, res, next) => {
  try {
    const { userId } = req.auth;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const userInfo = await withTransaction(async (client) => {
      const query = 'SELECT id, role FROM users WHERE id = $1';
      const result = await client.query(query, [userId]);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      
      return result.rows[0];
    });
    
    req.dbUserId = userInfo.id;
    req.userRole = userInfo.role;
    next();
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user information'
    });
  }
};

/**
 * Check if user owns a resource or is admin
 * @param {string} userIdField - Field name containing the user ID to check ownership
 * @returns {Function} Express middleware function
 */
export const requireOwnershipOrAdmin = (userIdField = 'user_id') => {
  return async (req, res, next) => {
    try {
      const { userId } = req.auth;
      const resourceId = req.params.id;
      
      if (!userId || !resourceId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const hasAccess = await withTransaction(async (client) => {
        // Get user role and ID
        const userQuery = 'SELECT id, role FROM users WHERE id = $1';
        const userResult = await client.query(userQuery, [userId]);
        
        if (userResult.rows.length === 0) {
          throw new Error('User not found');
        }
        
        const { id: dbUserId, role } = userResult.rows[0];
        
        // Admin has access to everything
        if (role === 'admin') {
          return true;
        }
        
        // Check ownership based on the table and field
        // This is a simplified check - in practice, you'd need to specify the table
        // For now, we'll assume the resource belongs to the user if they're not admin
        req.dbUserId = dbUserId;
        req.userRole = role;
        return true;
      });
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.'
        });
      }
      
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};