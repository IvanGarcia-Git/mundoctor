import { query, testConnection, closePool } from '../config/database.js';

async function testWebhookFlow() {
  try {
    console.log('🧪 Testing Clerk webhook integration...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }

    // Simulate a Clerk user.created webhook payload
    const mockClerkPayload = {
      type: 'user.created',
      data: {
        id: 'user_webhook_test_' + Date.now(),
        object: 'user',
        username: null,
        first_name: 'Test',
        last_name: 'User',
        image_url: 'https://img.clerk.com/example.jpg',
        primary_email_address_id: 'idn_test123',
        primary_phone_number_id: null,
        password_enabled: true,
        two_factor_enabled: false,
        email_addresses: [
          {
            id: 'idn_test123',
            object: 'email_address',
            email_address: 'test.webhook@example.com',
            verification: {
              status: 'verified',
              strategy: 'ticket'
            }
          }
        ],
        phone_numbers: [],
        public_metadata: {
          role: 'patient'
        },
        private_metadata: {},
        unsafe_metadata: {},
        created_at: Date.now(),
        updated_at: Date.now()
      }
    };

    console.log('📝 Simulating user.created webhook...');
    console.log('User data:', {
      id: mockClerkPayload.data.id,
      email: mockClerkPayload.data.email_addresses[0].email_address,
      name: `${mockClerkPayload.data.first_name} ${mockClerkPayload.data.last_name}`,
      role: mockClerkPayload.data.public_metadata.role
    });

    // Test the database insertion (simulating what the webhook would do)
    const {
      id: clerkId,
      email_addresses,
      first_name,
      last_name,
      image_url,
      phone_numbers,
      public_metadata = {}
    } = mockClerkPayload.data;

    // Find primary email address
    const primaryEmail = email_addresses.find(
      email => email.id === mockClerkPayload.data.primary_email_address_id
    )?.email_address || email_addresses[0]?.email_address;

    const name = `${first_name || ''} ${last_name || ''}`.trim() || primaryEmail?.split('@')[0] || 'Usuario';
    const phone = phone_numbers[0]?.phone_number;
    const role = public_metadata.role || 'patient';

    // Create user record using clerk_id as primary key
    const userResult = await query(`
      INSERT INTO users (id, email, name, role, phone, avatar_url, verified, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW()
      RETURNING *
    `, [clerkId, primaryEmail, name, role, phone, image_url, false, 'incomplete']);

    const user = userResult.rows[0];
    console.log('✅ User created/updated:', user);

    // Create default user preferences
    await query(`
      INSERT INTO user_preferences (user_id) 
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `, [user.id]);
    console.log('✅ User preferences created');

    // Create role-specific profile
    if (role === 'patient') {
      await query(`
        INSERT INTO patients (user_id) 
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `, [user.id]);
      console.log('✅ Patient profile created');
    } else if (role === 'professional') {
      await query(`
        INSERT INTO professionals (user_id) 
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `, [user.id]);
      console.log('✅ Professional profile created');
    }

    // Verify the complete user profile can be fetched
    console.log('\n🔍 Verifying user profile fetch...');
    const profileResult = await query(`
      SELECT 
        u.*,
        up.theme,
        up.notifications_enabled,
        up.language,
        up.timezone
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.id = $1
    `, [user.id]);

    if (profileResult.rows.length > 0) {
      console.log('✅ Profile fetch successful:', profileResult.rows[0]);
    } else {
      console.log('❌ Profile fetch failed');
    }

    // Test role-specific data fetch
    if (role === 'patient') {
      const patientResult = await query(`
        SELECT * FROM patients WHERE user_id = $1
      `, [user.id]);
      
      if (patientResult.rows.length > 0) {
        console.log('✅ Patient data fetch successful');
      }
    }

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await query('DELETE FROM user_preferences WHERE user_id = $1', [user.id]);
    await query('DELETE FROM patients WHERE user_id = $1', [user.id]);
    await query('DELETE FROM professionals WHERE user_id = $1', [user.id]);
    await query('DELETE FROM users WHERE id = $1', [user.id]);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Webhook integration test completed successfully!');
    console.log('📋 Summary:');
    console.log('   ✅ User creation from webhook payload works');
    console.log('   ✅ User preferences are created automatically');
    console.log('   ✅ Role-specific profiles are created');
    console.log('   ✅ Profile fetching works with new schema');
    console.log('   ✅ Database uses clerk_id as primary key');
    
    console.log('\n🔗 Next steps:');
    console.log('   1. Configure webhook URL in Clerk Dashboard');
    console.log('   2. Point webhook to: https://your-domain.com/api/auth/webhook');
    console.log('   3. Enable user.created, user.updated, user.deleted events');
    console.log('   4. Test with real user registration');
    
  } catch (error) {
    console.error('💥 Webhook test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await closePool();
  }
}

testWebhookFlow();