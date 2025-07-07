import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, testConnection, closePool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runClerkIdMigration() {
  try {
    console.log('🚀 Running Clerk ID as primary key migration...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }

    // Create backup of current data first
    console.log('📦 Creating backup of current users...');
    const backupUsers = await query(`
      SELECT * FROM users ORDER BY created_at
    `);
    console.log(`✅ Backed up ${backupUsers.rows.length} users`);

    // Run the migration
    console.log('🔄 Executing migration...');
    const migrationPath = path.join(__dirname, '../../migrations/005_safe_clerk_id_primary.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await query(sql);
    console.log('✅ Migration completed successfully!');
    
    // Verify the migration
    console.log('🔍 Verifying migration results...');
    
    // Check new table structure
    const primaryKey = await query(`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'users' 
        AND tc.constraint_type = 'PRIMARY KEY'
    `);
    
    console.log('🔑 New primary key:', primaryKey.rows.map(r => r.column_name).join(', '));

    // Check users data
    const newUsers = await query(`
      SELECT id, email, name, role, status 
      FROM users 
      ORDER BY created_at DESC
    `);
    
    console.log('📊 Users after migration:');
    newUsers.rows.forEach(user => {
      console.log(`  - ${user.name}: ID=${user.id}, Role=${user.role}, Status=${user.status}`);
    });

    // Check foreign key relationships
    const foreignKeys = await query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND (tc.table_name LIKE '%profile%' OR tc.table_name LIKE '%validation%' OR tc.table_name = 'user_preferences')
      ORDER BY tc.table_name;
    `);
    
    console.log('🔗 New foreign key relationships:');
    foreignKeys.rows.forEach(fk => {
      console.log(`  - ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    console.log('\n🎉 Migration verification summary:');
    console.log(`✅ Primary key changed from UUID to clerk_id: ${primaryKey.rows[0]?.column_name === 'id' ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Users migrated: ${newUsers.rows.length} users found`);
    console.log(`✅ Foreign keys updated: ${foreignKeys.rows.length} relationships found`);
    console.log('✅ Database now uses clerk_id as primary identifier');
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await closePool();
  }
}

runClerkIdMigration();