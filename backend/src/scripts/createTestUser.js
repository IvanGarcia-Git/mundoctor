import { query, testConnection, closePool } from '../config/database.js';
import { createUserInDB } from '../controllers/userController.js';

async function createTestUser() {
  try {
    console.log('🧪 Creating test user to fix frontend error...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }

    // Create the exact user that the frontend is trying to access
    const clerkUserId = 'user_2zNFLLqLz9tUeqLqP2J7GVYZXLcI';
    console.log(`🔧 Creating user: ${clerkUserId}`);

    // Check if user already exists
    const existingUser = await query(`
      SELECT id FROM users WHERE id = $1
    `, [clerkUserId]);

    if (existingUser.rows.length > 0) {
      console.log('✅ User already exists in database');
      
      // Verify user can be fetched
      const userProfile = await query(`
        SELECT 
          id, email, name, phone, avatar_url, role, 
          verified, created_at, updated_at
        FROM users 
        WHERE id = $1
      `, [clerkUserId]);
      
      console.log('✅ User profile:', userProfile.rows[0]);
      
    } else {
      console.log('💡 User does not exist, creating now...');
      
      // Create mock Clerk user data
      const mockClerkUser = {
        id: clerkUserId,
        email_addresses: [{ email_address: 'user@test.com' }],
        first_name: 'Test',
        last_name: 'User', 
        image_url: null,
        phone_numbers: []
      };

      const createdUser = await createUserInDB(mockClerkUser);
      console.log('✅ User created successfully:', createdUser);
    }

    console.log('\n🎉 Test user is ready!');
    console.log('🌐 The frontend should now be able to fetch the user profile');
    console.log('🔗 Try accessing the frontend again');
    
  } catch (error) {
    console.error('💥 Failed to create test user:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await closePool();
  }
}

createTestUser();