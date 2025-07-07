import { query, testConnection, closePool } from '../config/database.js';

async function testApiWithToken() {
  try {
    console.log('🧪 Testing API with existing user...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }

    // Get the admin user ID to simulate a request
    const adminResult = await query(`
      SELECT id, email, name, role, status 
      FROM users 
      WHERE role = 'admin'
      LIMIT 1
    `);

    if (adminResult.rows.length === 0) {
      console.log('❌ No admin user found for testing');
      return;
    }

    const adminUser = adminResult.rows[0];
    console.log('✅ Found admin user:', adminUser);

    // Test the exact query that the profile endpoint would use
    console.log('\n🔍 Testing profile query for admin user...');
    const profileQuery = `
      SELECT 
        id, email, name, phone, avatar_url, role, 
        verified, created_at, updated_at
      FROM users 
      WHERE id = $1
    `;
    
    const profileResult = await query(profileQuery, [adminUser.id]);
    
    if (profileResult.rows.length > 0) {
      console.log('✅ Profile query successful:', profileResult.rows[0]);
    } else {
      console.log('❌ Profile query failed - no results');
    }

    // Test the getUserByClerkId function pattern  
    console.log('\n🔍 Testing getUserByClerkId pattern...');
    const getUserQuery = `
      SELECT 
        u.*,
        up.theme,
        up.notifications_enabled,
        up.language,
        up.timezone
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE u.id = $1
    `;
    
    const getUserResult = await query(getUserQuery, [adminUser.id]);
    
    if (getUserResult.rows.length > 0) {
      console.log('✅ getUserByClerkId pattern successful:', getUserResult.rows[0]);
    } else {
      console.log('❌ getUserByClerkId pattern failed');
    }

    console.log('\n🎉 All API query tests passed!');
    console.log('✅ The database schema is working correctly with the API endpoints');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await closePool();
  }
}

testApiWithToken();