import { query, testConnection, closePool } from '../config/database.js';

async function checkCurrentSchema() {
  try {
    console.log('🔍 Checking current database schema...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }

    // Check users table structure
    console.log('\n👤 Users table structure:');
    const usersColumns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    usersColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'required'})${col.column_default ? ` DEFAULT ${col.column_default}` : ''}`);
    });

    // Check primary key
    const primaryKey = await query(`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'users' 
        AND tc.constraint_type = 'PRIMARY KEY'
    `);
    
    console.log('\n🔑 Primary key:', primaryKey.rows.map(r => r.column_name).join(', '));

    // Check current users
    const currentUsers = await query(`
      SELECT id, clerk_id, name, role, status 
      FROM users 
      ORDER BY created_at DESC
    `);
    
    console.log('\n📊 Current users:');
    currentUsers.rows.forEach(user => {
      console.log(`  - ${user.name}: ID=${user.id}, Clerk_ID=${user.clerk_id}, Role=${user.role}, Status=${user.status}`);
    });

    // Check foreign key relationships
    console.log('\n🔗 Current foreign key relationships:');
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
      AND (tc.table_name LIKE '%profile%' OR tc.table_name LIKE '%validation%')
      ORDER BY tc.table_name;
    `);
    
    foreignKeys.rows.forEach(fk => {
      console.log(`  - ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    // Check if we need migration
    const needsMigration = primaryKey.rows[0]?.column_name !== 'clerk_id';
    console.log(`\n🚨 Migration needed: ${needsMigration ? 'YES' : 'NO'}`);
    
    if (needsMigration) {
      console.log('   - Current primary key uses UUID, should use clerk_id directly');
      console.log('   - Foreign keys reference UUID instead of clerk_id');
    } else {
      console.log('   - Schema already uses clerk_id as primary key');
    }
    
  } catch (error) {
    console.error('💥 Check failed:', error.message);
  } finally {
    await closePool();
  }
}

checkCurrentSchema();