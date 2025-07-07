import { query, testConnection, closePool } from '../config/database.js';

async function checkUserStatus() {
  try {
    console.log('🔍 Checking user status implementation...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }

    // Check if status column exists
    try {
      const columnCheck = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'status'
      `);
      
      if (columnCheck.rows.length > 0) {
        console.log('✅ Status column exists:', columnCheck.rows[0]);
      } else {
        console.log('❌ Status column does not exist');
      }
    } catch (error) {
      console.error('Error checking column:', error.message);
    }

    // Check if user_status type exists
    try {
      const typeCheck = await query(`
        SELECT typname FROM pg_type WHERE typname = 'user_status'
      `);
      
      if (typeCheck.rows.length > 0) {
        console.log('✅ user_status type exists');
      } else {
        console.log('❌ user_status type does not exist');
      }
    } catch (error) {
      console.error('Error checking type:', error.message);
    }

    // Check current user data
    try {
      const userCheck = await query(`
        SELECT id, role, status FROM users LIMIT 5
      `);
      console.log('📊 Sample user data:', userCheck.rows);
    } catch (error) {
      console.error('Error checking users:', error.message);
    }
    
  } catch (error) {
    console.error('💥 Check failed:', error.message);
  } finally {
    await closePool();
  }
}

checkUserStatus();