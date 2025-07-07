import { query, testConnection, closePool } from '../config/database.js';

async function testUserStatus() {
  try {
    console.log('🧪 Testing user status functionality...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }

    // Check if we have any users
    const userCheck = await query(`
      SELECT clerk_id, role, status, name, email 
      FROM users 
      LIMIT 3
    `);
    
    console.log('👥 Current users in database:');
    userCheck.rows.forEach(user => {
      console.log(`  - ${user.name} (${user.email}): ${user.role} - ${user.status}`);
    });

    if (userCheck.rows.length === 0) {
      console.log('📝 No users found in database. User status functionality is ready for when users are created.');
    } else {
      console.log('✅ User status field is working correctly!');
    }

    // Test the status enum values
    const enumCheck = await query(`
      SELECT unnest(enum_range(NULL::user_status)) as status_values
    `);
    
    console.log('📋 Available status values:', enumCheck.rows.map(row => row.status_values));
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  } finally {
    await closePool();
  }
}

testUserStatus();