#!/usr/bin/env node

import dotenv from 'dotenv';
import { testConnection } from '../config/database.js';

dotenv.config();

/**
 * Test webhook setup and configuration
 */

const testWebhookSetup = async () => {
  console.log('🔍 Testing webhook setup...\n');

  // 1. Check environment variables
  console.log('1. Environment Variables:');
  const requiredEnvs = [
    'CLERK_SECRET_KEY',
    'CLERK_PUBLISHABLE_KEY', 
    'CLERK_WEBHOOK_SECRET'
  ];

  let envMissing = false;
  requiredEnvs.forEach(env => {
    const value = process.env[env];
    if (value) {
      console.log(`   ✅ ${env}: ${value.substring(0, 20)}...`);
    } else {
      console.log(`   ❌ ${env}: Missing`);
      envMissing = true;
    }
  });

  if (envMissing) {
    console.log('\n❌ Missing environment variables. Please check your .env file.');
    process.exit(1);
  }

  // 2. Test database connection
  console.log('\n2. Database Connection:');
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      console.log('   ✅ Database connection successful');
    } else {
      console.log('   ❌ Database connection failed');
      process.exit(1);
    }
  } catch (error) {
    console.log(`   ❌ Database error: ${error.message}`);
    process.exit(1);
  }

  // 3. Test webhook endpoint availability
  console.log('\n3. Webhook Endpoint:');
  const PORT = process.env.PORT || 8000;
  const webhookUrl = `http://localhost:${PORT}/api/webhooks/clerk`;
  
  try {
    const response = await fetch(`http://localhost:${PORT}/api/webhooks/clerk`, {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Webhook endpoint accessible');
      console.log(`   📋 Status: ${data.status}`);
      console.log(`   🔗 URL: ${webhookUrl}`);
    } else {
      console.log('   ❌ Webhook endpoint not accessible');
    }
  } catch (error) {
    console.log(`   ❌ Cannot reach webhook endpoint: ${error.message}`);
    console.log('   ℹ️  Make sure the server is running on port', PORT);
  }

  // 4. Instructions for Clerk Dashboard setup
  console.log('\n4. Clerk Dashboard Setup:');
  console.log('   📝 To complete webhook setup:');
  console.log('   1. Go to https://dashboard.clerk.com');
  console.log('   2. Select your application');
  console.log('   3. Go to "Webhooks" in the sidebar');
  console.log('   4. Click "Add Endpoint"');
  console.log(`   5. URL: ${webhookUrl}`);
  console.log('   6. Select these events:');
  console.log('      - user.created');
  console.log('      - user.updated'); 
  console.log('      - user.deleted');
  console.log('   7. Copy the "Signing Secret" to CLERK_WEBHOOK_SECRET in .env');

  // 5. Test user sync functionality
  console.log('\n5. User Sync Test:');
  console.log('   ℹ️  To test user synchronization:');
  console.log('   1. Register a new user in your application');
  console.log('   2. Check the server logs for webhook events');
  console.log('   3. Verify user appears in PostgreSQL users table');
  console.log('   4. Use manual sync endpoint if needed:');
  console.log(`      POST http://localhost:${PORT}/api/webhooks/sync-user/{clerkId}`);

  console.log('\n✅ Webhook setup test completed!');
};

// Run the test
testWebhookSetup().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});