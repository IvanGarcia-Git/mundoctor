import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, testConnection, closePool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function addUserStatus() {
  try {
    console.log('🚀 Adding user status field...');
    
    // Test connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }

    // Read and execute the migration
    const migrationPath = path.join(__dirname, '../../migrations/002_add_user_status_simple.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Executing user status migration...');
    await query(sql);
    console.log('✅ User status field added successfully!');
    
    // Verify the migration
    const userCheck = await query(`
      SELECT role, status, COUNT(*) as count 
      FROM users 
      GROUP BY role, status
    `);
    console.log('📊 User status distribution:', userCheck.rows);
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

addUserStatus();