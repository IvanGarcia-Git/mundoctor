import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, testConnection, closePool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function addValidationsTable() {
  try {
    console.log('🚀 Adding professional validations table...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }

    // Run the migration
    const migrationPath = path.join(__dirname, '../../migrations/004_add_professional_validations.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Executing migration...');
    await query(sql);
    console.log('✅ Migration completed successfully!');
    
    // Verify the new table
    const tableCheck = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'professional_validations' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 professional_validations table structure:');
    tableCheck.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

addValidationsTable();