import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, testConnection, closePool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🚀 Running new table migration...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }

    // Run the new migration
    const migrationPath = path.join(__dirname, '../../migrations/003_use_clerk_id_as_primary.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Executing migration...');
    await query(sql);
    console.log('✅ Migration completed successfully!');
    
    // Verify the new tables
    const tableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('patient_profiles', 'professional_profiles', 'professional_validations', 'professional_subscriptions')
      ORDER BY table_name
    `);
    
    console.log('📊 New tables created:', tableCheck.rows.map(row => row.table_name));
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

runMigration();