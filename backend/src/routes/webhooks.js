import express from 'express';
import { Webhook } from 'svix';
import { createUserInDB, updateUserInDB, deleteUserFromDB } from '../controllers/userController.js';

const router = express.Router();

// Middleware to verify Clerk webhook signature
const verifyWebhook = (req, res, next) => {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    
    if (!WEBHOOK_SECRET) {
      console.error('CLERK_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const svix_id = req.get('svix-id');
    const svix_timestamp = req.get('svix-timestamp');
    const svix_signature = req.get('svix-signature');

    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error('Missing svix headers');
      return res.status(400).json({ error: 'Missing svix headers' });
    }

    const webhook = new Webhook(WEBHOOK_SECRET);
    
    // Verify the webhook signature
    const payload = webhook.verify(JSON.stringify(req.body), {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });

    req.webhookPayload = payload;
    next();

  } catch (error) {
    console.error('Webhook verification failed:', error.message);
    return res.status(400).json({ 
      error: 'Webhook verification failed',
      details: error.message 
    });
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

// Clerk webhook endpoint
router.post('/clerk', verifyWebhook, async (req, res) => {
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
        // Update user email if needed
        break;

      case 'sms.created':
        console.log(`📱 SMS created for user: ${data.object.id}`);
        // Update user phone if needed
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