import { query, testConnection, closePool } from '../config/database.js';

async function checkPatientProfiles() {
  try {
    console.log('🔍 Checking patient_profiles table structure...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }

    // Check patient_profiles structure
    const patientColumns = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'patient_profiles' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 patient_profiles table structure:');
    patientColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'required'})`);
    });

    // Check if there's any data
    const patientData = await query(`
      SELECT COUNT(*) as count FROM patient_profiles
    `);
    
    console.log(`📈 Records in patient_profiles: ${patientData.rows[0].count}`);
    
  } catch (error) {
    console.error('💥 Check failed:', error.message);
  } finally {
    await closePool();
  }
}

checkPatientProfiles();