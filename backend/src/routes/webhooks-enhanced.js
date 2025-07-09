import express from 'express';
import { Webhook } from 'svix';
import { 
  createUserInDB, 
  updateUserInDB, 
  deleteUserFromDB,
  handleEmailUpdate,
  handleSMSUpdate,
  handleEmailVerification,
  syncUserFromClerk,
  validateUserSync
} from '../controllers/userController.js';
import { syncUserFromClerk as newSyncUser, validateUserConsistency, rollbackUserCreation } from '../services/clerkSync.js';
import { logInfo, logError, logWarning } from '../utils/logger.js';
import { successResponse, errorResponse, internalServerErrorResponse } from '../utils/responses.js';
import { createAuditLog, AuditActions, RiskLevels } from '../utils/auditLog.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { withTransaction } from '../config/database.js';

const router = express.Router();

// Enhanced webhook event retry system
class WebhookRetrySystem {
  constructor() {
    this.retryQueue = new Map();
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  async processEvent(eventId, eventType, eventData, processingFunction) {
    const retryInfo = this.retryQueue.get(eventId) || { attempts: 0, lastAttempt: null };
    
    try {
      await processingFunction(eventData);
      
      // Success - remove from retry queue
      this.retryQueue.delete(eventId);
      
      logInfo('Webhook event processed successfully', {
        eventId,
        eventType,
        attempts: retryInfo.attempts + 1
      });
      
      return { success: true, attempts: retryInfo.attempts + 1 };
      
    } catch (error) {
      retryInfo.attempts++;
      retryInfo.lastAttempt = new Date();
      retryInfo.lastError = error.message;
      
      if (retryInfo.attempts < this.maxRetries) {
        // Schedule retry
        this.retryQueue.set(eventId, retryInfo);
        
        logWarning('Webhook event failed, will retry', {
          eventId,
          eventType,
          attempt: retryInfo.attempts,
          nextRetryIn: this.retryDelay,
          error: error.message
        });
        
        setTimeout(() => {
          this.processEvent(eventId, eventType, eventData, processingFunction);
        }, this.retryDelay);
        
        return { success: false, willRetry: true, attempts: retryInfo.attempts };
        
      } else {
        // Max retries reached
        this.retryQueue.delete(eventId);
        
        logError(error, {
          event: 'webhook_event_failed_permanently',
          eventId,
          eventType,
          attempts: retryInfo.attempts,
          finalError: error.message
        });
        
        // Create audit log for failed webhook
        await createAuditLog({
          userId: eventData.id || eventData.user_id,
          action: AuditActions.WEBHOOK_FAILED,
          resource: 'webhook',
          resourceId: eventId,
          details: {
            eventType,
            attempts: retryInfo.attempts,
            error: error.message,
            eventData: eventData
          },
          riskLevel: RiskLevels.HIGH,
          success: false
        });
        
        throw error;
      }
    }
  }
}

const retrySystem = new WebhookRetrySystem();

// Enhanced middleware to verify Clerk webhook signature with improved error handling
const verifyWebhookEnhanced = asyncHandler(async (req, res, next) => {
  const startTime = Date.now();
  const ip = req.ip || req.connection.remoteAddress;
  
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    
    if (!WEBHOOK_SECRET) {
      await createAuditLog({
        action: AuditActions.CONFIGURATION_ERROR,
        resource: 'webhook_config',
        details: {
          error: 'CLERK_WEBHOOK_SECRET not configured',
          ip
        },
        ipAddress: ip,
        riskLevel: RiskLevels.CRITICAL
      });
      
      return errorResponse(res, 'Webhook secret not configured', 500);
    }

    const svix_id = req.get('svix-id');
    const svix_timestamp = req.get('svix-timestamp');
    const svix_signature = req.get('svix-signature');

    if (!svix_id || !svix_timestamp || !svix_signature) {
      await createAuditLog({
        action: AuditActions.WEBHOOK_VERIFICATION_FAILED,
        resource: 'webhook',
        details: {
          error: 'Missing svix headers',
          headers: {
            'svix-id': !!svix_id,
            'svix-timestamp': !!svix_timestamp,
            'svix-signature': !!svix_signature,
          },
          ip
        },
        ipAddress: ip,
        riskLevel: RiskLevels.HIGH
      });
      
      return errorResponse(res, 'Missing svix headers', 400);
    }

    const webhook = new Webhook(WEBHOOK_SECRET);
    
    // Verify the webhook signature with enhanced error handling
    try {
      const payload = webhook.verify(req.body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      });

      req.webhookPayload = payload;
      req.webhookMeta = {
        id: svix_id,
        timestamp: svix_timestamp,
        signature: svix_signature,
        processingStartTime: startTime,
        ip
      };
      
      logInfo('Webhook signature verified successfully', {
        type: payload.type,
        svixId: svix_id,
        timestamp: svix_timestamp,
        ip,
        duration: Date.now() - startTime,
      });
      
      next();
      
    } catch (verificationError) {
      await createAuditLog({
        action: AuditActions.WEBHOOK_VERIFICATION_FAILED,
        resource: 'webhook',
        details: {
          error: 'Signature verification failed',
          svixId: svix_id,
          verificationError: verificationError.message,
          ip
        },
        ipAddress: ip,
        riskLevel: RiskLevels.HIGH
      });
      
      throw verificationError;
    }

  } catch (error) {
    logError(error, {
      event: 'webhook_verification_failed',
      ip,
      duration: Date.now() - startTime,
    });
    
    return errorResponse(res, 'Webhook verification failed', 400, error);
  }
});

// Enhanced webhook event processor
const processWebhookEvent = async (eventType, eventData, eventMeta) => {
  const { id: eventId, ip, processingStartTime } = eventMeta;
  
  try {
    logInfo('Processing webhook event', { 
      eventType, 
      eventId, 
      userId: eventData.id || eventData.user_id 
    });

    switch (eventType) {
      case 'user.created':
        await retrySystem.processEvent(eventId, eventType, eventData, async (data) => {
          await withTransaction(async (client) => {
            const user = await createUserInDB(data);
            
            // Validate sync after creation
            const validation = await validateUserConsistency(user.id);
            if (!validation.consistent) {
              logWarning('User sync inconsistency detected after creation', {
                userId: user.id,
                inconsistencies: validation.inconsistencies
              });
            }
            
            return user;
          });
        });
        break;

      case 'user.updated':
        await retrySystem.processEvent(eventId, eventType, eventData, async (data) => {
          await withTransaction(async (client) => {
            const user = await updateUserInDB(data);
            
            // Validate sync after update
            const validation = await validateUserConsistency(user.id);
            if (!validation.consistent) {
              logWarning('User sync inconsistency detected after update', {
                userId: user.id,
                inconsistencies: validation.inconsistencies
              });
            }
            
            return user;
          });
        });
        break;

      case 'user.deleted':
        await retrySystem.processEvent(eventId, eventType, eventData, async (data) => {
          await withTransaction(async (client) => {
            return await deleteUserFromDB(data.id);
          });
        });
        break;

      case 'session.created':
        await retrySystem.processEvent(eventId, eventType, eventData, async (data) => {
          await createAuditLog({
            userId: data.user_id,
            action: AuditActions.SESSION_CREATED,
            resource: 'user_session',
            resourceId: data.id,
            details: {
              sessionId: data.id,
              deviceInfo: data.device_info,
              clientType: data.client_type
            },
            ipAddress: ip,
            riskLevel: RiskLevels.LOW
          });
        });
        break;

      case 'session.ended':
      case 'session.removed':
      case 'session.revoked':
        await retrySystem.processEvent(eventId, eventType, eventData, async (data) => {
          await createAuditLog({
            userId: data.user_id,
            action: AuditActions.SESSION_ENDED,
            resource: 'user_session',
            resourceId: data.id,
            details: {
              sessionId: data.id,
              endReason: eventType.split('.')[1],
              duration: data.duration || null
            },
            ipAddress: ip,
            riskLevel: RiskLevels.LOW
          });
        });
        break;

      case 'email.created':
        await retrySystem.processEvent(eventId, eventType, eventData, async (data) => {
          await handleEmailUpdate(data);
        });
        break;

      case 'sms.created':
        await retrySystem.processEvent(eventId, eventType, eventData, async (data) => {
          await handleSMSUpdate(data);
        });
        break;

      case 'emailAddress.verified':
        await retrySystem.processEvent(eventId, eventType, eventData, async (data) => {
          await handleEmailVerification(data);
        });
        break;

      default:
        logWarning('Unhandled webhook event type', { 
          eventType, 
          eventId,
          availableHandlers: [
            'user.created', 'user.updated', 'user.deleted',
            'session.created', 'session.ended', 'session.removed', 'session.revoked',
            'email.created', 'sms.created', 'emailAddress.verified'
          ]
        });
        break;
    }

    // Create audit log for successful webhook processing
    await createAuditLog({
      userId: eventData.id || eventData.user_id,
      action: AuditActions.WEBHOOK_PROCESSED,
      resource: 'webhook',
      resourceId: eventId,
      details: {
        eventType,
        processingTime: Date.now() - processingStartTime,
        success: true
      },
      ipAddress: ip,
      riskLevel: RiskLevels.LOW
    });

  } catch (error) {
    logError(error, {
      event: 'webhook_processing_failed',
      eventType,
      eventId,
      userId: eventData.id || eventData.user_id
    });
    
    throw error;
  }
};

// GET endpoint for webhook verification (browser testing)
router.get('/clerk', (req, res) => {
  res.status(200).json({
    message: 'Enhanced Clerk webhook endpoint is ready',
    method: 'POST',
    url: '/api/webhooks/clerk',
    events: [
      'user.created', 'user.updated', 'user.deleted',
      'session.created', 'session.ended', 'session.removed', 'session.revoked',
      'email.created', 'sms.created', 'emailAddress.verified'
    ],
    status: 'enhanced_configured',
    features: ['retry_logic', 'audit_logging', 'consistency_validation'],
    retryConfig: {
      maxRetries: retrySystem.maxRetries,
      retryDelay: retrySystem.retryDelay
    }
  });
});

// Enhanced Clerk webhook endpoint with retry logic and improved error handling
router.post('/clerk', 
  // CORS headers for webhook endpoint
  (req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, svix-id, svix-timestamp, svix-signature');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  },
  express.raw({ type: 'application/json' }), 
  verifyWebhookEnhanced,
  asyncHandler(async (req, res) => {
    const { type, data } = req.webhookPayload;
    const eventMeta = req.webhookMeta;
    
    try {
      await processWebhookEvent(type, data, eventMeta);
      
      return successResponse(res, {
        message: `Webhook ${type} processed successfully`,
        eventId: eventMeta.id,
        processingTime: Date.now() - eventMeta.processingStartTime
      });

    } catch (error) {
      logError(error, {
        event: 'webhook_handler_failed',
        eventType: type,
        eventId: eventMeta.id,
        userId: data.id || data.user_id
      });
      
      // Don't return 500 for certain errors to avoid webhook retries from Clerk
      if (error.message.includes('already exists') || error.message.includes('not found')) {
        return successResponse(res, {
          message: `Webhook ${type} handled with warning`,
          warning: error.message,
          eventId: eventMeta.id
        });
      }

      return errorResponse(res, 'Webhook processing failed', 500, {
        eventId: eventMeta.id,
        eventType: type,
        error: error.message
      });
    }
  })
);

// Health check endpoint for webhooks with enhanced monitoring
router.get('/health', asyncHandler(async (req, res) => {
  const retryQueueSize = retrySystem.retryQueue.size;
  const retryQueueItems = Array.from(retrySystem.retryQueue.entries()).map(([id, info]) => ({
    eventId: id,
    attempts: info.attempts,
    lastAttempt: info.lastAttempt,
    lastError: info.lastError
  }));

  res.status(200).json({ 
    status: 'healthy', 
    service: 'enhanced-webhooks',
    timestamp: new Date().toISOString(),
    retrySystem: {
      queueSize: retryQueueSize,
      maxRetries: retrySystem.maxRetries,
      retryDelay: retrySystem.retryDelay,
      activeRetries: retryQueueItems
    },
    features: ['retry_logic', 'audit_logging', 'consistency_validation', 'transaction_support']
  });
}));

// Manual user sync endpoint with enhanced validation
router.post('/sync-user/:clerkId', asyncHandler(async (req, res) => {
  const { clerkId } = req.params;
  const { forceSync = false, validateAfter = true } = req.body;
  
  if (!clerkId) {
    return errorResponse(res, 'Clerk ID is required', 400);
  }

  try {
    logInfo('Manual enhanced sync requested', { clerkId, forceSync, validateAfter });
    
    const result = await withTransaction(async (client) => {
      const user = await newSyncUser(clerkId, {
        createProfile: true,
        updateExisting: forceSync,
        auditInfo: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });

      if (validateAfter) {
        const validation = await validateUserConsistency(clerkId);
        return { user, validation };
      }

      return { user };
    });
    
    return successResponse(res, {
      message: 'User synced successfully with enhanced validation',
      ...result
    });

  } catch (error) {
    logError(error, {
      event: 'enhanced_manual_sync_failed',
      clerkId,
      forceSync,
      validateAfter
    });
    
    return errorResponse(res, 'Enhanced user sync failed', 500, {
      clerkId,
      error: error.message
    });
  }
}));

// Enhanced validation endpoint with consistency checks
router.get('/validate-user/:clerkId', asyncHandler(async (req, res) => {
  const { clerkId } = req.params;
  
  if (!clerkId) {
    return errorResponse(res, 'Clerk ID is required', 400);
  }

  try {
    logInfo('Enhanced validation requested', { clerkId });
    
    const [basicValidation, consistencyValidation] = await Promise.all([
      validateUserSync(clerkId),
      validateUserConsistency(clerkId)
    ]);
    
    return successResponse(res, {
      message: 'Enhanced validation completed',
      basicValidation,
      consistencyValidation,
      overallStatus: basicValidation.synchronized && consistencyValidation.consistent ? 'healthy' : 'needs_attention'
    });

  } catch (error) {
    logError(error, {
      event: 'enhanced_validation_failed',
      clerkId
    });
    
    return errorResponse(res, 'Enhanced validation failed', 500, {
      clerkId,
      error: error.message
    });
  }
}));

// Webhook retry status endpoint
router.get('/retry-status', asyncHandler(async (req, res) => {
  const retryQueueInfo = Array.from(retrySystem.retryQueue.entries()).map(([id, info]) => ({
    eventId: id,
    attempts: info.attempts,
    lastAttempt: info.lastAttempt,
    lastError: info.lastError,
    nextRetryIn: info.attempts < retrySystem.maxRetries ? 
      Math.max(0, (info.lastAttempt?.getTime() || 0) + retrySystem.retryDelay - Date.now()) : 
      null
  }));

  return successResponse(res, {
    message: 'Webhook retry system status',
    retryQueue: retryQueueInfo,
    configuration: {
      maxRetries: retrySystem.maxRetries,
      retryDelay: retrySystem.retryDelay
    },
    statistics: {
      totalPendingRetries: retrySystem.retryQueue.size,
      oldestRetry: retryQueueInfo.length > 0 ? 
        Math.min(...retryQueueInfo.map(item => item.lastAttempt?.getTime() || Date.now())) : 
        null
    }
  });
}));

// Test webhook endpoint (development only) with enhanced features
if (process.env.NODE_ENV === 'development') {
  router.post('/test-enhanced', asyncHandler(async (req, res) => {
    const { type, data, testRetry = false } = req.body;
    
    if (!type || !data) {
      return errorResponse(res, 'Type and data are required for testing', 400);
    }
    
    try {
      logInfo('Enhanced test webhook received', { type, testRetry });
      
      const eventMeta = {
        id: `test-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        processingStartTime: Date.now()
      };
      
      if (testRetry) {
        // Simulate failure for retry testing
        throw new Error('Simulated failure for retry testing');
      }
      
      await processWebhookEvent(type, data, eventMeta);
      
      return successResponse(res, {
        message: `Enhanced test webhook ${type} processed successfully`,
        eventId: eventMeta.id,
        processingTime: Date.now() - eventMeta.processingStartTime
      });

    } catch (error) {
      logError(error, {
        event: 'enhanced_test_webhook_failed',
        type,
        testRetry
      });
      
      return errorResponse(res, 'Enhanced test webhook failed', 500, {
        type,
        error: error.message
      });
    }
  }));
}

export default router;