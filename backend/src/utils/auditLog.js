import { query, withTransaction } from '../config/database.js';
import { logInfo, logError, logWarning } from './logger.js';

// Audit log actions enum
export const AuditActions = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  TOKEN_REFRESH: 'token_refresh',
  
  // User Management
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  USER_SUSPENDED: 'user_suspended',
  USER_ACTIVATED: 'user_activated',
  
  // Profile Management
  PROFILE_CREATED: 'profile_created',
  PROFILE_UPDATED: 'profile_updated',
  PROFILE_COMPLETED: 'profile_completed',
  
  // Role Management
  ROLE_ASSIGNED: 'role_assigned',
  ROLE_CHANGED: 'role_changed',
  
  // Professional Validation
  VALIDATION_SUBMITTED: 'validation_submitted',
  VALIDATION_APPROVED: 'validation_approved',
  VALIDATION_REJECTED: 'validation_rejected',
  DOCUMENTS_UPLOADED: 'documents_uploaded',
  
  // Appointments
  APPOINTMENT_CREATED: 'appointment_created',
  APPOINTMENT_UPDATED: 'appointment_updated',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  APPOINTMENT_COMPLETED: 'appointment_completed',
  
  // Payments
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',
  REFUND_ISSUED: 'refund_issued',
  
  // Administrative
  ADMIN_ACCESS: 'admin_access',
  SYSTEM_CONFIG_CHANGED: 'system_config_changed',
  DATA_EXPORT: 'data_export',
  DATA_IMPORT: 'data_import',
  
  // Security
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  PASSWORD_RESET: 'password_reset',
  
  // Data Access
  SENSITIVE_DATA_ACCESS: 'sensitive_data_access',
  PATIENT_DATA_ACCESS: 'patient_data_access',
  MEDICAL_RECORD_ACCESS: 'medical_record_access',
};

// Risk levels for audit events
export const RiskLevels = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// Create audit log entry
export const createAuditLog = async ({
  userId,
  action,
  resource,
  resourceId = null,
  details = {},
  ipAddress = null,
  userAgent = null,
  riskLevel = RiskLevels.LOW,
  success = true,
  errorMessage = null,
}) => {
  try {
    const auditData = {
      user_id: userId,
      action,
      resource,
      resource_id: resourceId,
      details: JSON.stringify(details),
      ip_address: ipAddress,
      user_agent: userAgent,
      risk_level: riskLevel,
      success,
      error_message: errorMessage,
      timestamp: new Date(),
    };

    await query(`
      INSERT INTO audit_logs (
        user_id, action, resource, resource_id, details,
        ip_address, user_agent, risk_level, success, error_message, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      auditData.user_id,
      auditData.action,
      auditData.resource,
      auditData.resource_id,
      auditData.details,
      auditData.ip_address,
      auditData.user_agent,
      auditData.risk_level,
      auditData.success,
      auditData.error_message,
      auditData.timestamp,
    ]);

    logInfo('Audit log created', {
      userId,
      action,
      resource,
      riskLevel,
      success,
    });

    // Alert on high-risk activities
    if (riskLevel === RiskLevels.HIGH || riskLevel === RiskLevels.CRITICAL) {
      logWarning('High-risk audit event detected', {
        userId,
        action,
        resource,
        riskLevel,
        details,
        ipAddress,
      });
    }

  } catch (error) {
    logError(error, {
      event: 'audit_log_creation_failed',
      userId,
      action,
      resource,
    });
    // Don't throw - audit logging failure shouldn't break the main operation
  }
};

// Middleware to automatically create audit logs for requests
export const auditMiddleware = (options = {}) => {
  const {
    action = null,
    resource = null,
    riskLevel = RiskLevels.LOW,
    extractResourceId = null,
    extractDetails = null,
  } = options;

  return async (req, res, next) => {
    // Store original methods to capture response
    const originalSend = res.send;
    const originalJson = res.json;
    
    let responseData = null;
    let responseStatus = null;

    // Override response methods to capture data
    res.send = function(data) {
      responseData = data;
      responseStatus = res.statusCode;
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      responseData = data;
      responseStatus = res.statusCode;
      return originalJson.call(this, data);
    };

    // Continue with the request
    next();

    // After response is sent, create audit log
    res.on('finish', async () => {
      try {
        if (!req.user?.id) return;

        const auditAction = action || `${req.method.toLowerCase()}_${resource || 'resource'}`;
        const resourceId = extractResourceId ? extractResourceId(req) : req.params.id;
        const details = extractDetails ? extractDetails(req, responseData) : {
          method: req.method,
          url: req.originalUrl,
          statusCode: responseStatus,
          requestBody: req.method !== 'GET' ? req.body : undefined,
        };

        await createAuditLog({
          userId: req.user.id,
          action: auditAction,
          resource: resource || req.route?.path || req.originalUrl,
          resourceId,
          details,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          riskLevel,
          success: responseStatus < 400,
          errorMessage: responseStatus >= 400 ? responseData?.message : null,
        });
      } catch (error) {
        logError(error, { event: 'audit_middleware_error' });
      }
    });
  };
};

// Get audit logs with filtering
export const getAuditLogs = async ({
  userId = null,
  action = null,
  resource = null,
  riskLevel = null,
  startDate = null,
  endDate = null,
  limit = 100,
  offset = 0,
}) => {
  try {
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (userId) {
      whereConditions.push(`user_id = $${paramIndex++}`);
      params.push(userId);
    }

    if (action) {
      whereConditions.push(`action = $${paramIndex++}`);
      params.push(action);
    }

    if (resource) {
      whereConditions.push(`resource = $${paramIndex++}`);
      params.push(resource);
    }

    if (riskLevel) {
      whereConditions.push(`risk_level = $${paramIndex++}`);
      params.push(riskLevel);
    }

    if (startDate) {
      whereConditions.push(`timestamp >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`timestamp <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const result = await query(`
      SELECT 
        al.*,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...params, limit, offset]);

    return result.rows;
  } catch (error) {
    logError(error, { event: 'get_audit_logs_failed' });
    throw error;
  }
};

// Get audit statistics
export const getAuditStats = async ({ 
  userId = null, 
  startDate = null, 
  endDate = null 
}) => {
  try {
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (userId) {
      whereConditions.push(`user_id = $${paramIndex++}`);
      params.push(userId);
    }

    if (startDate) {
      whereConditions.push(`timestamp >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`timestamp <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const result = await query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE success = true) as successful_events,
        COUNT(*) FILTER (WHERE success = false) as failed_events,
        COUNT(*) FILTER (WHERE risk_level = 'high') as high_risk_events,
        COUNT(*) FILTER (WHERE risk_level = 'critical') as critical_events,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT action) as unique_actions
      FROM audit_logs
      ${whereClause}
    `, params);

    return result.rows[0];
  } catch (error) {
    logError(error, { event: 'get_audit_stats_failed' });
    throw error;
  }
};

// Clean up old audit logs (for compliance with data retention policies)
export const cleanupAuditLogs = async (retentionDays = 365) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await query(`
      DELETE FROM audit_logs 
      WHERE timestamp < $1 AND risk_level NOT IN ('high', 'critical')
    `, [cutoffDate]);

    logInfo('Audit logs cleanup completed', {
      deletedCount: result.rowCount,
      cutoffDate,
      retentionDays,
    });

    return result.rowCount;
  } catch (error) {
    logError(error, { event: 'audit_cleanup_failed' });
    throw error;
  }
};

// Helper functions for common audit scenarios
export const auditLogin = (userId, ipAddress, userAgent, success = true, errorMessage = null) => {
  return createAuditLog({
    userId,
    action: success ? AuditActions.LOGIN : AuditActions.LOGIN_FAILED,
    resource: 'authentication',
    details: { loginMethod: 'clerk' },
    ipAddress,
    userAgent,
    riskLevel: success ? RiskLevels.LOW : RiskLevels.MEDIUM,
    success,
    errorMessage,
  });
};

export const auditProfileAccess = (userId, targetUserId, ipAddress, userAgent) => {
  return createAuditLog({
    userId,
    action: AuditActions.PATIENT_DATA_ACCESS,
    resource: 'user_profile',
    resourceId: targetUserId,
    details: { accessType: 'profile_view' },
    ipAddress,
    userAgent,
    riskLevel: userId === targetUserId ? RiskLevels.LOW : RiskLevels.MEDIUM,
  });
};

export const auditAdminAction = (userId, action, resource, resourceId, details, ipAddress, userAgent) => {
  return createAuditLog({
    userId,
    action,
    resource,
    resourceId,
    details,
    ipAddress,
    userAgent,
    riskLevel: RiskLevels.HIGH,
  });
};

export default {
  createAuditLog,
  auditMiddleware,
  getAuditLogs,
  getAuditStats,
  cleanupAuditLogs,
  auditLogin,
  auditProfileAccess,
  auditAdminAction,
  AuditActions,
  RiskLevels,
};