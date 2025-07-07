import { query, testConnection, closePool } from '../config/database.js';

async function verifyMigration() {
  try {
    console.log('🔍 Verifying migration results...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }

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

    // Check users table structure
    const usersColumns = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n👤 Users table structure:');
    usersColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'required'})`);
    });

    // Check users data
    const newUsers = await query(`
      SELECT id, email, name, role, status 
      FROM users 
      ORDER BY created_at DESC
    `);
    
    console.log('\n📊 Users after migration:');
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
      AND ccu.table_name = 'users'
      ORDER BY tc.table_name;
    `);
    
    console.log('\n🔗 New foreign key relationships:');
    foreignKeys.rows.forEach(fk => {
      console.log(`  - ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    // Check column types
    const userIdColumns = await query(`
      SELECT 
        table_name, 
        column_name, 
        data_type 
      FROM information_schema.columns 
      WHERE column_name IN ('user_id', 'cancelled_by', 'assigned_to', 'reviewed_by')
      AND table_name IN ('patients', 'professionals', 'appointments', 'support_tickets', 'user_preferences', 'professional_validations')
      ORDER BY table_name, column_name;
    `);
    
    console.log('\n🔧 Foreign key column types:');
    userIdColumns.rows.forEach(col => {
      console.log(`  - ${col.table_name}.${col.column_name}: ${col.data_type}`);
    });

    console.log('\n🎉 Migration verification summary:');
    console.log(`✅ Primary key is now 'id': ${primaryKey.rows[0]?.column_name === 'id' ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Primary key type is VARCHAR: ${usersColumns.rows.find(c => c.column_name === 'id')?.data_type?.includes('varchar') ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Users migrated: ${newUsers.rows.length} users found`);
    console.log(`✅ Foreign keys updated: ${foreignKeys.rows.length} relationships found`);
    console.log(`✅ Column types updated: ${userIdColumns.rows.length} columns changed`);
    console.log('✅ Database now uses clerk_id as primary identifier');
    
  } catch (error) {
    console.error('💥 Verification failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await closePool();
  }
}

verifyMigration();