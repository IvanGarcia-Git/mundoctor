import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { clerkMiddleware } from '@clerk/express';
import { createUserInDB } from './src/controllers/userController.js';
import { Webhook } from 'svix';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

// Middleware
app.use(cors());
app.use(clerkMiddleware());

// Raw body parser for webhook signature verification
app.use('/api/webhooks/clerk', express.raw({ type: 'application/json' }));

// Regular JSON parser for other routes
app.use(express.json());

// Webhook verification middleware
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
      console.warn('Missing svix headers');
      return res.status(400).json({ error: 'Missing svix headers' });
    }

    const webhook = new Webhook(WEBHOOK_SECRET);
    const payload = webhook.verify(req.body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });

    req.webhookPayload = payload;
    next();
  } catch (error) {
    console.error('Webhook verification failed:', error);
    return res.status(400).json({ error: 'Webhook verification failed' });
  }
};

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running', time: new Date().toISOString() });
});

// Webhook endpoint
app.post('/api/webhooks/clerk', verifyWebhook, async (req, res) => {
  try {
    const { type, data } = req.webhookPayload;
    
    console.log(`📥 Received Clerk webhook: ${type}`);
    console.log('Data:', JSON.stringify(data, null, 2));

    switch (type) {
      case 'user.created':
        const newUser = await createUserInDB(data);
        console.log(`✅ User created: ${newUser.email}`);
        break;

      case 'user.updated':
        console.log(`📝 User updated: ${data.email_addresses?.[0]?.email_address}`);
        break;

      case 'user.deleted':
        console.log(`🗑️ User deleted: ${data.id}`);
        break;

      default:
        console.log(`ℹ️ Unhandled webhook type: ${type}`);
        break;
    }

    res.status(200).json({ 
      success: true, 
      message: `Webhook ${type} processed successfully` 
    });

  } catch (error) {
    console.error(`❌ Error processing webhook:`, error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      details: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test webhook server running on port ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/api/webhooks/clerk`);
  console.log(`🔧 Test endpoint: http://localhost:${PORT}/api/test`);
});