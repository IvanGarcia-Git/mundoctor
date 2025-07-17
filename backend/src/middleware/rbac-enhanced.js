import { query } from '../config/database.js';
import { logInfo, logWarning, logError } from '../utils/logger.js';
import { createAuditLog, AuditActions, RiskLevels } from '../utils/auditLog.js';
import { AuthorizationError } from './errorHandler.js';

// Enhanced RBAC system with granular permissions
export class RBACSystem {
  constructor() {
    this.permissions = new Map();
    this.roleHierarchy = new Map();
    this.endpointPermissions = new Map();
    this.initializePermissions();
  }

  // Initialize the permission system
  initializePermissions() {
    // Define granular permissions
    const permissions = {
      // User management
      'users:read': 'Read user information',
      'users:write': 'Create and update user information',
      'users:delete': 'Delete user accounts',
      'users:impersonate': 'Impersonate other users',
      
      // Profile management
      'profile:read': 'Read profile information',
      'profile:write': 'Update profile information',
      'profile:validate': 'Validate professional profiles',
      
      // Appointments
      'appointments:read': 'Read appointment information',
      'appointments:write': 'Create and update appointments',
      'appointments:delete': 'Cancel appointments',
      'appointments:manage_all': 'Manage all appointments system-wide',
      
      // Schedules
      'schedules:read': 'Read schedule information',
      'schedules:write': 'Create and update schedules',
      'schedules:delete': 'Delete schedules',
      
      // Services
      'services:read': 'Read service information',
      'services:write': 'Create and update services',
      'services:delete': 'Delete services',
      
      // Reviews
      'reviews:read': 'Read reviews',
      'reviews:write': 'Create and update reviews',
      'reviews:delete': 'Delete reviews',
      'reviews:moderate': 'Moderate reviews',
      
      // Payments
      'payments:read': 'Read payment information',
      'payments:write': 'Process payments',
      'payments:refund': 'Process refunds',
      'payments:admin': 'Access payment admin features',
      
      // Notifications
      'notifications:read': 'Read notifications',
      'notifications:write': 'Create notifications',
      'notifications:send': 'Send notifications',
      'notifications:admin': 'Manage notification system',
      
      // Tickets
      'tickets:read': 'Read support tickets',
      'tickets:write': 'Create and update tickets',
      'tickets:assign': 'Assign tickets',
      'tickets:escalate': 'Escalate tickets',
      
      // Admin functions
      'admin:users': 'User administration',
      'admin:system': 'System administration',
      'admin:analytics': 'Access analytics',
      'admin:settings': 'Manage system settings',
      'admin:audit': 'Access audit logs',
      
      // Super admin
      'super:all': 'All system permissions'
    };

    // Set up permissions
    Object.entries(permissions).forEach(([key, description]) => {
      this.permissions.set(key, { key, description });
    });

    // Define role hierarchy and permissions
    this.roleHierarchy.set('patient', {
      inherits: [],
      permissions: [
        'profile:read',
        'profile:write',
        'appointments:read',
        'appointments:write',
        'reviews:read',
        'reviews:write',
        'notifications:read',
        'tickets:read',
        'tickets:write'
      ]
    });

    this.roleHierarchy.set('professional', {
      inherits: ['patient'],
      permissions: [
        'schedules:read',
        'schedules:write',
        'schedules:delete',
        'services:read',
        'services:write',
        'services:delete',
        'appointments:manage_all', // Can manage their own appointments
        'reviews:moderate', // Can moderate their own reviews
        'payments:read',
        'notifications:write'
      ]
    });

    this.roleHierarchy.set('admin', {
      inherits: ['professional'],
      permissions: [
        'users:read',
        'users:write',
        'users:delete',
        'profile:validate',
        'appointments:manage_all',
        'reviews:moderate',
        'payments:admin',
        'notifications:admin',
        'tickets:assign',
        'tickets:escalate',
        'admin:users',
        'admin:system',
        'admin:analytics',
        'admin:settings',
        'admin:audit'
      ]
    });

    this.roleHierarchy.set('super_admin', {
      inherits: ['admin'],
      permissions: [
        'users:impersonate',
        'payments:refund',
        'super:all'
      ]
    });

    // Define endpoint permissions mapping
    this.endpointPermissions.set('GET:/api/users', ['users:read']);
    this.endpointPermissions.set('POST:/api/users', ['users:write']);
    this.endpointPermissions.set('PUT:/api/users/:id', ['users:write']);
    this.endpointPermissions.set('DELETE:/api/users/:id', ['users:delete']);
    
    this.endpointPermissions.set('GET:/api/appointments', ['appointments:read']);
    this.endpointPermissions.set('POST:/api/appointments', ['appointments:write']);
    this.endpointPermissions.set('PUT:/api/appointments/:id', ['appointments:write']);
    this.endpointPermissions.set('DELETE:/api/appointments/:id', ['appointments:delete']);
    
    this.endpointPermissions.set('GET:/api/admin/*', ['admin:users']);
    this.endpointPermissions.set('POST:/api/admin/*', ['admin:users']);
    this.endpointPermissions.set('PUT:/api/admin/*', ['admin:users']);
    this.endpointPermissions.set('DELETE:/api/admin/*', ['admin:users']);
    
    // Add more endpoint mappings as needed
  }

  // Get all permissions for a role (including inherited)
  getRolePermissions(role) {
    const roleConfig = this.roleHierarchy.get(role);
    if (!roleConfig) {
      return [];
    }

    let permissions = [...roleConfig.permissions];
    
    // Add inherited permissions recursively
    for (const inheritedRole of roleConfig.inherits) {
      permissions = permissions.concat(this.getRolePermissions(inheritedRole));
    }

    return [...new Set(permissions)]; // Remove duplicates
  }

  // Check if user has specific permission
  hasPermission(userRole, permission) {
    const rolePermissions = this.getRolePermissions(userRole);
    return rolePermissions.includes(permission) || rolePermissions.includes('super:all');
  }

  // Check if user has any of the required permissions
  hasAnyPermission(userRole, permissions) {
    return permissions.some(permission => this.hasPermission(userRole, permission));
  }

  // Get required permissions for an endpoint
  getEndpointPermissions(method, path) {
    const endpointKey = `${method}:${path}`;
    
    // Try exact match first
    if (this.endpointPermissions.has(endpointKey)) {
      return this.endpointPermissions.get(endpointKey);
    }
    
    // Try wildcard matches
    for (const [pattern, permissions] of this.endpointPermissions.entries()) {
      if (this.matchesPattern(endpointKey, pattern)) {
        return permissions;
      }
    }
    
    return [];
  }

  // Pattern matching for wildcard endpoints
  matchesPattern(endpoint, pattern) {
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/:\w+/g, '[^/]+');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(endpoint);
  }

  // Add custom permission
  addPermission(key, description) {
    this.permissions.set(key, { key, description });
  }

  // Add endpoint permission mapping
  addEndpointPermission(method, path, permissions) {
    const endpointKey = `${method}:${path}`;
    this.endpointPermissions.set(endpointKey, permissions);
  }

  // Get all permissions for debugging
  getAllPermissions() {
    return Array.from(this.permissions.values());
  }

  // Get role hierarchy for debugging
  getRoleHierarchy() {
    const hierarchy = {};
    for (const [role, config] of this.roleHierarchy.entries()) {
      hierarchy[role] = {
        ...config,
        effectivePermissions: this.getRolePermissions(role)
      };
    }
    return hierarchy;
  }
}

// Global RBAC instance
const rbac = new RBACSystem();

// Enhanced middleware for permission-based authorization
export const requirePermission = (requiredPermissions, options = {}) => {
  const { 
    strict = false,
    logAccess = true,
    customCheck = null
  } = options;

  // Ensure requiredPermissions is an array
  if (!Array.isArray(requiredPermissions)) {
    requiredPermissions = [requiredPermissions];
  }

  return async (req, res, next) => {
    const startTime = Date.now();
    
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required for permission check');
      }

      const userRole = req.user.role;
      const userId = req.user.id;
      
      // Custom permission check if provided
      if (customCheck && typeof customCheck === 'function') {
        const customResult = await customCheck(req.user, requiredPermissions, req);
        if (!customResult) {
          throw new AuthorizationError('Custom permission check failed');
        }
      }

      // Check if user has required permissions
      const hasPermission = strict ? 
        requiredPermissions.every(permission => rbac.hasPermission(userRole, permission)) :
        rbac.hasAnyPermission(userRole, requiredPermissions);

      if (!hasPermission) {
        logWarning('Permission denied', {
          userId,
          userRole,
          requiredPermissions,
          userPermissions: rbac.getRolePermissions(userRole),
          url: req.originalUrl,
          method: req.method,
          ip: req.ip,
          strict
        });

        // Create audit log for permission denial
        await createAuditLog({
          userId,
          action: AuditActions.PERMISSION_DENIED,
          resource: 'endpoint',
          resourceId: req.originalUrl,
          details: {
            userRole,
            requiredPermissions,
            method: req.method,
            strict
          },
          ipAddress: req.ip,
          riskLevel: RiskLevels.MEDIUM,
          success: false
        });

        throw new AuthorizationError(`Insufficient permissions. Required: ${requiredPermissions.join(', ')}`);
      }

      if (logAccess) {
        logInfo('Permission granted', {
          userId,
          userRole,
          requiredPermissions,
          url: req.originalUrl,
          method: req.method,
          duration: Date.now() - startTime
        });
      }

      next();
    } catch (error) {
      logError(error, {
        event: 'permission_check_failed',
        userId: req.user?.id,
        userRole: req.user?.role,
        requiredPermissions,
        url: req.originalUrl,
        duration: Date.now() - startTime
      });

      throw error;
    }
  };
};

// Auto-detect permissions based on endpoint
export const autoPermission = (options = {}) => {
  const { fallbackPermissions = [], ...otherOptions } = options;

  return async (req, res, next) => {
    const method = req.method;
    const path = req.route?.path || req.originalUrl;
    
    // Get required permissions for this endpoint
    const requiredPermissions = rbac.getEndpointPermissions(method, path);
    
    if (requiredPermissions.length === 0) {
      if (fallbackPermissions.length > 0) {
        logWarning('No permissions defined for endpoint, using fallback', {
          method,
          path,
          fallbackPermissions
        });
        return requirePermission(fallbackPermissions, otherOptions)(req, res, next);
      } else {
        logWarning('No permissions defined for endpoint and no fallback', {
          method,
          path
        });
        return next(); // Allow access if no permissions defined
      }
    }

    return requirePermission(requiredPermissions, otherOptions)(req, res, next);
  };
};

// Middleware for resource ownership with permission override
export const requireOwnershipOrPermission = (resourceField, overridePermissions, options = {}) => {
  const { allowAdmin = true } = options;

  return async (req, res, next) => {
    const startTime = Date.now();
    
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      const userId = req.user.id;
      const userRole = req.user.role;
      const resourceId = req.params[resourceField] || req.body[resourceField] || req.query[resourceField];

      // Check if user has override permissions
      if (rbac.hasAnyPermission(userRole, overridePermissions)) {
        logInfo('Resource access granted via permission override', {
          userId,
          userRole,
          overridePermissions,
          resourceField,
          resourceId,
          url: req.originalUrl
        });
        return next();
      }

      // Check resource ownership
      if (userId !== resourceId) {
        if (allowAdmin && userRole === 'admin') {
          logInfo('Resource access granted via admin override', {
            userId,
            userRole,
            resourceField,
            resourceId,
            url: req.originalUrl
          });
          return next();
        }

        logWarning('Resource ownership check failed', {
          userId,
          userRole,
          resourceField,
          resourceId,
          url: req.originalUrl,
          overridePermissions
        });

        throw new AuthorizationError('You can only access your own resources');
      }

      logInfo('Resource ownership verified', {
        userId,
        resourceField,
        resourceId,
        url: req.originalUrl,
        duration: Date.now() - startTime
      });

      next();
    } catch (error) {
      logError(error, {
        event: 'ownership_permission_check_failed',
        userId: req.user?.id,
        resourceField,
        url: req.originalUrl,
        duration: Date.now() - startTime
      });

      throw error;
    }
  };
};

// Context-aware permission checking
export const requireContextualPermission = (getContextualPermissions) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      // Get contextual permissions based on request
      const contextualPermissions = await getContextualPermissions(req);
      
      if (!contextualPermissions || contextualPermissions.length === 0) {
        logWarning('No contextual permissions determined', {
          userId: req.user.id,
          url: req.originalUrl
        });
        return next();
      }

      return requirePermission(contextualPermissions)(req, res, next);
    } catch (error) {
      logError(error, {
        event: 'contextual_permission_failed',
        userId: req.user?.id,
        url: req.originalUrl,
        duration: Date.now() - startTime
      });

      throw error;
    }
  };
};

// Time-based permission checking
export const requireTimeBasedPermission = (requiredPermissions, timeConstraints = {}) => {
  const { 
    allowedHours = null, // Array of allowed hours [9, 17] for 9 AM to 5 PM
    allowedDays = null,  // Array of allowed days [1, 5] for Mon-Fri
    timezone = 'UTC'
  } = timeConstraints;

  return async (req, res, next) => {
    const startTime = Date.now();
    
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Check time constraints
      if (allowedHours && (currentHour < allowedHours[0] || currentHour >= allowedHours[1])) {
        logWarning('Time-based access denied - outside allowed hours', {
          userId: req.user.id,
          currentHour,
          allowedHours,
          url: req.originalUrl
        });
        
        throw new AuthorizationError(`Access only allowed between ${allowedHours[0]}:00 and ${allowedHours[1]}:00`);
      }

      if (allowedDays && (currentDay < allowedDays[0] || currentDay > allowedDays[1])) {
        logWarning('Time-based access denied - outside allowed days', {
          userId: req.user.id,
          currentDay,
          allowedDays,
          url: req.originalUrl
        });
        
        throw new AuthorizationError('Access only allowed on specified days');
      }

      // Check permissions after time validation
      return requirePermission(requiredPermissions)(req, res, next);
    } catch (error) {
      logError(error, {
        event: 'time_based_permission_failed',
        userId: req.user?.id,
        url: req.originalUrl,
        duration: Date.now() - startTime
      });

      throw error;
    }
  };
};

// Common permission combinations
export const requireUserManagement = requirePermission('users:read');
export const requireUserAdmin = requirePermission(['users:read', 'users:write']);
export const requireAppointmentManagement = requirePermission('appointments:manage_all');
export const requireSystemAdmin = requirePermission(['admin:system', 'admin:settings']);
export const requireAuditAccess = requirePermission('admin:audit');

// Export the RBAC instance for external use
export { rbac };

export default {
  RBACSystem,
  rbac,
  requirePermission,
  autoPermission,
  requireOwnershipOrPermission,
  requireContextualPermission,
  requireTimeBasedPermission,
  requireUserManagement,
  requireUserAdmin,
  requireAppointmentManagement,
  requireSystemAdmin,
  requireAuditAccess
};