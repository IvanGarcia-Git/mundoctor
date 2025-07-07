import { query, testConnection, closePool } from '../config/database.js';
import { createUserInDB } from '../controllers/userController.js';

async function testClerkUser() {
  try {
    console.log('🧪 Testing with real Clerk user ID...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }

    // This is the actual user ID from the JWT token in the error
    const clerkUserId = 'user_2zNFLLqLz9tUeqLqP2J7GVYZXLcI';
    console.log(`🔍 Looking for user: ${clerkUserId}`);

    // Check if this user exists in our database
    const userResult = await query(`
      SELECT id, email, name, role, status 
      FROM users 
      WHERE id = $1
    `, [clerkUserId]);

    if (userResult.rows.length > 0) {
      console.log('✅ User found in database:', userResult.rows[0]);
      
      // Test the profile query that would be used by the API
      const profileQuery = `
        SELECT 
          id, email, name, phone, avatar_url, role, 
          verified, created_at, updated_at
        FROM users 
        WHERE id = $1
      `;
      
      const profileResult = await query(profileQuery, [clerkUserId]);
      console.log('✅ Profile query would return:', profileResult.rows[0]);
      
    } else {
      console.log('❌ User not found in database');
      console.log('💡 This explains the error - the user needs to be created');
      
      // Simulate creating this user (with mock data since we don't have access to Clerk API)
      console.log('\n🔧 Testing user creation with mock data...');
      const mockClerkUser = {
        id: clerkUserId,
        email_addresses: [{ email_address: 'test.user@example.com' }],
        first_name: 'Test',
        last_name: 'User',
        image_url: null,
        phone_numbers: []
      };

      try {
        const createdUser = await createUserInDB(mockClerkUser);
        console.log('✅ User created successfully:', createdUser);
        
        // Now test the profile query
        const profileResult = await query(`
          SELECT 
            id, email, name, phone, avatar_url, role, 
            verified, created_at, updated_at
          FROM users 
          WHERE id = $1
        `, [clerkUserId]);
        
        console.log('✅ Profile query now works:', profileResult.rows[0]);
        
        // Clean up the test user
        await query('DELETE FROM user_preferences WHERE user_id = $1', [clerkUserId]);
        await query('DELETE FROM patients WHERE user_id = $1', [clerkUserId]);
        await query('DELETE FROM users WHERE id = $1', [clerkUserId]);
        console.log('🧹 Test user cleaned up');
        
      } catch (createError) {
        console.error('❌ Failed to create user:', createError.message);
      }
    }

    console.log('\n🎉 Clerk user test completed!');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await closePool();
  }
}

testClerkUser();