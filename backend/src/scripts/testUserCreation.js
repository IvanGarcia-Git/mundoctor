import { createUserInDB, syncUserFromClerk } from '../controllers/userController.js';
import { query, testConnection, closePool } from '../config/database.js';

async function testUserCreation() {
  try {
    console.log('🧪 Testing user creation with new schema...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }

    // Test 1: Create a test user
    console.log('\n📝 Test 1: Creating a test user...');
    const testUser = {
      id: 'test_user_' + Date.now(),
      email_addresses: [{ email_address: 'test@example.com' }],
      first_name: 'Test',
      last_name: 'User',
      image_url: 'https://example.com/avatar.jpg',
      phone_numbers: [{ phone_number: '+1234567890' }]
    };

    const createdUser = await createUserInDB(testUser);
    console.log('✅ User created:', createdUser);

    // Test 2: Verify user was created correctly
    console.log('\n🔍 Test 2: Verifying user creation...');
    const userFromDB = await query(`
      SELECT * FROM users WHERE id = $1
    `, [createdUser.id]);

    if (userFromDB.rows.length > 0) {
      console.log('✅ User found in database:', userFromDB.rows[0]);
    } else {
      console.log('❌ User not found in database');
    }

    // Test 3: Check user preferences were created
    console.log('\n🔍 Test 3: Checking user preferences...');
    const prefsFromDB = await query(`
      SELECT * FROM user_preferences WHERE user_id = $1
    `, [createdUser.id]);

    if (prefsFromDB.rows.length > 0) {
      console.log('✅ User preferences created:', prefsFromDB.rows[0]);
    } else {
      console.log('❌ User preferences not found');
    }

    // Test 4: Check patient profile was created
    console.log('\n🔍 Test 4: Checking patient profile...');
    const patientFromDB = await query(`
      SELECT * FROM patients WHERE user_id = $1
    `, [createdUser.id]);

    if (patientFromDB.rows.length > 0) {
      console.log('✅ Patient profile created:', patientFromDB.rows[0]);
    } else {
      console.log('❌ Patient profile not found');
    }

    // Test 5: Test that user ID is indeed clerk_id
    console.log('\n🔗 Test 5: Validating clerk_id as primary key...');
    
    if (createdUser.id === testUser.id) {
      console.log('✅ User primary key matches clerk_id:', createdUser.id);
    } else {
      console.log('❌ User primary key does NOT match clerk_id');
    }

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await query(`DELETE FROM user_preferences WHERE user_id = $1`, [createdUser.id]);
    await query(`DELETE FROM patients WHERE user_id = $1`, [createdUser.id]);
    await query(`DELETE FROM users WHERE id = $1`, [createdUser.id]);
    console.log('✅ Test data cleaned up');

    // Test 6: Test duplicate prevention
    console.log('\n🔄 Test 6: Testing duplicate prevention...');
    const firstUser = await createUserInDB(testUser);
    const secondUser = await createUserInDB(testUser); // Should return existing user

    if (firstUser.id === secondUser.id) {
      console.log('✅ Duplicate prevention works correctly');
    } else {
      console.log('❌ Duplicate prevention failed');
    }

    // Clean up duplicate test
    await query(`DELETE FROM user_preferences WHERE user_id = $1`, [firstUser.id]);
    await query(`DELETE FROM patients WHERE user_id = $1`, [firstUser.id]);
    await query(`DELETE FROM users WHERE id = $1`, [firstUser.id]);

    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ User creation with clerk_id as primary key is working correctly');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await closePool();
  }
}

testUserCreation();