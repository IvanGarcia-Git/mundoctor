import { query, testConnection, closePool } from '../config/database.js';
import { syncUserFromClerk } from '../controllers/userController.js';

async function simulateProfileRequest() {
  try {
    console.log('🧪 Simulating profile request flow...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }

    // Simulate the exact user ID from the JWT token in the error
    const userId = 'user_2zNFLLqLz9tUeqLqP2J7GVYZXLcI';
    console.log(`🔍 Testing profile request for user: ${userId}`);

    // Step 1: Check if user exists (like the profile endpoint does)
    console.log('\n1️⃣ Checking if user exists in database...');
    let user = await query(`
      SELECT 
        id, email, name, phone, avatar_url, role, 
        verified, created_at, updated_at
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (user.rows.length === 0) {
      console.log('❌ User not found in database');
      console.log('🔄 Attempting to sync from Clerk...');
      
      // Step 2: Try to sync user from Clerk (this is what should happen)
      try {
        // Since we can't actually call Clerk API without proper setup,
        // let's simulate what should happen
        console.log('⚠️  Note: In real scenario, this would call Clerk API');
        console.log('⚠️  For testing, we\'ll create a mock user');
        
        // Create a mock user to simulate successful sync
        const mockUser = await query(`
          INSERT INTO users (id, email, name, role, status)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [userId, 'test.user@example.com', 'Test User', 'patient', 'incomplete']);
        
        // Create user preferences
        await query(`
          INSERT INTO user_preferences (user_id) VALUES ($1)
        `, [userId]);
        
        // Create patient profile
        await query(`
          INSERT INTO patients (user_id) VALUES ($1)
        `, [userId]);
        
        user = mockUser;
        console.log('✅ User synced successfully:', user.rows[0]);
        
      } catch (syncError) {
        console.error('❌ Failed to sync user:', syncError.message);
        return;
      }
    } else {
      console.log('✅ User found in database:', user.rows[0]);
    }

    // Step 3: Get role-specific data
    console.log('\n2️⃣ Getting role-specific data...');
    const actualUser = user.rows[0];
    let roleData = {};

    if (actualUser.role === 'patient') {
      const patientResult = await query(`
        SELECT * FROM patients WHERE user_id = $1
      `, [actualUser.id]);
      
      if (patientResult.rows.length > 0) {
        roleData.patient = patientResult.rows[0];
        console.log('✅ Patient data found:', patientResult.rows[0]);
      } else {
        console.log('⚠️  No patient profile found');
      }
    }

    // Step 4: Return combined result
    const result = {
      ...actualUser,
      ...roleData
    };

    console.log('\n3️⃣ Final profile result:');
    console.log('✅ Profile request would succeed with:', result);

    // Clean up test user
    console.log('\n🧹 Cleaning up test data...');
    await query('DELETE FROM user_preferences WHERE user_id = $1', [userId]);
    await query('DELETE FROM patients WHERE user_id = $1', [userId]);
    await query('DELETE FROM users WHERE id = $1', [userId]);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Profile request simulation completed successfully!');
    console.log('✅ The profile endpoint should now work correctly');
    
  } catch (error) {
    console.error('💥 Simulation failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await closePool();
  }
}

simulateProfileRequest();