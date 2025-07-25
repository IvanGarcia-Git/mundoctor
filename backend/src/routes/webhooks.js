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

const router = express.Router();

// Enhanced middleware to verify Clerk webhook signature with audit logging
const verifyWebhook = (req, res, next) => {
  const startTime = Date.now();
  const ip = req.ip || req.connection.remoteAddress;
  
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    
    if (!WEBHOOK_SECRET) {
      logError(new Error('CLERK_WEBHOOK_SECRET not configured'), {
        event: 'webhook_configuration_error',
        ip,
      });
      return errorResponse(res, 'Webhook secret not configured', 500);
    }

    const svix_id = req.get('svix-id');
    const svix_timestamp = req.get('svix-timestamp');
    const svix_signature = req.get('svix-signature');

    if (!svix_id || !svix_timestamp || !svix_signature) {
      logWarning('Missing svix headers in webhook request', {
        ip,
        headers: {
          'svix-id': !!svix_id,
          'svix-timestamp': !!svix_timestamp,
          'svix-signature': !!svix_signature,
        },
      });
      return errorResponse(res, 'Missing svix headers', 400);
    }

    const webhook = new Webhook(WEBHOOK_SECRET);
    
    // Verify the webhook signature
    const payload = webhook.verify(req.body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });

    req.webhookPayload = payload;
    
    logInfo('Webhook signature verified successfully', {
      type: payload.type,
      svixId: svix_id,
      timestamp: svix_timestamp,
      ip,
      duration: Date.now() - startTime,
    });
    
    next();

  } catch (error) {
    logError(error, {
      event: 'webhook_verification_failed',
      ip,
      duration: Date.now() - startTime,
    });
    
    return errorResponse(res, 'Webhook verification failed', 400, error);
  }
};

// GET endpoint for webhook verification (browser testing)
router.get('/clerk', (req, res) => {
  res.status(200).json({
    message: 'Clerk webhook endpoint is ready',
    method: 'POST',
    url: '/api/webhooks/clerk',
    events: ['user.created', 'user.updated', 'user.deleted'],
    status: 'configured'
  });
});

// Clerk webhook endpoint - use raw body for signature verification
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
  verifyWebhook, 
  async (req, res) => {
  try {
    const { type, data } = req.webhookPayload;
    
    console.log(`📥 Received Clerk webhook: ${type}`);

    switch (type) {
      case 'user.created':
        await createUserInDB(data);
        console.log(`✅ User created: ${data.email_addresses?.[0]?.email_address}`);
        break;

      case 'user.updated':
        await updateUserInDB(data);
        console.log(`✅ User updated: ${data.email_addresses?.[0]?.email_address}`);
        break;

      case 'user.deleted':
        await deleteUserFromDB(data.id);
        console.log(`✅ User deleted: ${data.id}`);
        break;

      case 'session.created':
        console.log(`📱 Session created for user: ${data.user_id}`);
        // Optional: Log user sessions, update last_seen, etc.
        break;

      case 'session.ended':
        console.log(`📱 Session ended for user: ${data.user_id}`);
        break;

      case 'session.removed':
        console.log(`📱 Session removed for user: ${data.user_id}`);
        break;

      case 'session.revoked':
        console.log(`📱 Session revoked for user: ${data.user_id}`);
        break;

      case 'email.created':
        console.log(`📧 Email created for user: ${data.object.id}`);
        await handleEmailUpdate(data);
        break;

      case 'sms.created':
        console.log(`📱 SMS created for user: ${data.object.id}`);
        await handleSMSUpdate(data);
        break;

      case 'emailAddress.verified':
        console.log(`✅ Email verified for user: ${data.object.id}`);
        await handleEmailVerification(data);
        break;

      default:
        console.log(`ℹ️  Unhandled webhook type: ${type}`);
        break;
    }

    res.status(200).json({ 
      success: true, 
      message: `Webhook ${type} processed successfully` 
    });

  } catch (error) {
    console.error(`❌ Error processing webhook:`, error);
    
    // Don't return 500 for non-critical errors to avoid webhook retries
    if (error.message.includes('already exists')) {
      return res.status(200).json({ 
        success: true, 
        message: 'User already exists, skipped creation' 
      });
    }

    res.status(500).json({ 
      error: 'Webhook processing failed',
      details: error.message 
    });
  }
});

// Health check endpoint for webhooks
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    service: 'webhooks',
    timestamp: new Date().toISOString()
  });
});

// Manual user sync endpoint (admin only)
router.post('/sync-user/:clerkId', async (req, res) => {
  try {
    const { clerkId } = req.params;
    
    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID is required' });
    }

    console.log(`🔄 Manual sync requested for user: ${clerkId}`);
    
    const result = await syncUserFromClerk(clerkId);
    
    res.status(200).json({
      success: true,
      message: 'User synced successfully',
      user: result
    });

  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({
      error: 'User sync failed',
      details: error.message
    });
  }
});

// Validate user sync status endpoint (admin/debug)
router.get('/validate-user/:clerkId', async (req, res) => {
  try {
    const { clerkId } = req.params;
    
    if (!clerkId) {
      return res.status(400).json({ error: 'Clerk ID is required' });
    }

    console.log(`🔍 Validating sync for user: ${clerkId}`);
    
    const validation = await validateUserSync(clerkId);
    
    res.status(200).json({
      success: true,
      validation
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      details: error.message
    });
  }
});

// Test webhook endpoint (development only)
if (process.env.NODE_ENV === 'development') {
  router.post('/test', async (req, res) => {
    try {
      const { type, data } = req.body;
      
      console.log(`🧪 Test webhook: ${type}`);
      
      switch (type) {
        case 'user.created':
          await createUserInDB(data);
          break;
        case 'user.updated':
          await updateUserInDB(data);
          break;
        case 'user.deleted':
          await deleteUserFromDB(data.id);
          break;
        default:
          return res.status(400).json({ error: `Unsupported test type: ${type}` });
      }

      res.status(200).json({ 
        success: true, 
        message: `Test webhook ${type} processed` 
      });

    } catch (error) {
      console.error('Test webhook error:', error);
      res.status(500).json({ 
        error: 'Test webhook failed',
        details: error.message 
      });
    }
  });
}

export default router;