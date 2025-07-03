import { query, testConnection, closePool } from '../config/database.js';

async function checkAllTables() {
  try {
    console.log('🔍 Checking all tables in database...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }

    // Get all tables
    const tables = await query(`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📋 All tables in database:');
    tables.rows.forEach(table => {
      console.log(`  - ${table.table_name} (${table.table_type})`);
    });

    // Check if specific tables exist
    const importantTables = ['users', 'patient_profiles', 'professional_profiles', 'professional_validations'];
    
    console.log('\n🔍 Checking important tables:');
    for (const tableName of importantTables) {
      const exists = tables.rows.some(row => row.table_name === tableName);
      console.log(`  - ${tableName}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
      
      if (exists) {
        try {
          const count = await query(`SELECT COUNT(*) as count FROM ${tableName}`);
          console.log(`    Records: ${count.rows[0].count}`);
        } catch (error) {
          console.log(`    Error counting records: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Check failed:', error.message);
  } finally {
    await closePool();
  }
}

checkAllTables();