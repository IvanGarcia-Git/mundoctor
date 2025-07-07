import { query, testConnection, closePool } from '../config/database.js';

async function checkTables() {
  try {
    console.log('🔍 Checking existing tables...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }

    // Check all tables
    const tableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📊 Existing tables:', tableCheck.rows.map(row => row.table_name));
    
    // Check if professional_profiles exists
    const profCheck = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'professional_profiles' 
      ORDER BY ordinal_position
    `);
    
    if (profCheck.rows.length > 0) {
      console.log('✅ professional_profiles table structure:');
      profCheck.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('❌ professional_profiles table does not exist');
    }

    // Check if professional_validations exists
    const validationCheck = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'professional_validations' 
      ORDER BY ordinal_position
    `);
    
    if (validationCheck.rows.length > 0) {
      console.log('✅ professional_validations table structure:');
      validationCheck.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('❌ professional_validations table does not exist');
    }
    
  } catch (error) {
    console.error('💥 Check failed:', error.message);
  } finally {
    await closePool();
  }
}

checkTables();