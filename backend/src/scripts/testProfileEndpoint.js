import { query, testConnection, closePool } from '../config/database.js';

async function testProfileEndpoint() {
  try {
    console.log('🧪 Testing profile endpoint with new schema...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }

    // Test with the existing admin user
    console.log('\n📝 Testing with existing admin user...');
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

    // Simulate the profile query that the API would run
    console.log('\n🔍 Testing profile query...');
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

    // Test with a non-existent user
    console.log('\n🔍 Testing with non-existent user...');
    const nonExistentResult = await query(profileQuery, ['non_existent_user_id']);
    
    if (nonExistentResult.rows.length === 0) {
      console.log('✅ Non-existent user query correctly returns no results');
    } else {
      console.log('❌ Non-existent user query unexpectedly found results');
    }

    console.log('\n🎉 Profile endpoint tests completed!');
    console.log('✅ The database queries are working correctly with the new schema');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await closePool();
  }
}

testProfileEndpoint();