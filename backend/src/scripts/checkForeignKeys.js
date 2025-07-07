import { query, testConnection, closePool } from '../config/database.js';

async function checkForeignKeys() {
  try {
    console.log('🔍 Checking foreign key relationships...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }

    // Check all foreign key relationships
    const foreignKeys = await query(`
      SELECT 
        tc.table_name AS table_name,
        kcu.column_name AS column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name AS constraint_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.column_name;
    `);
    
    console.log('\n🔗 All foreign key relationships:');
    foreignKeys.rows.forEach(fk => {
      console.log(`  - ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name} (${fk.constraint_name})`);
    });

    // Check specifically those that reference users table
    console.log('\n👤 Tables that reference users table:');
    const userReferences = foreignKeys.rows.filter(fk => fk.foreign_table_name === 'users');
    userReferences.forEach(fk => {
      console.log(`  - ${fk.table_name}.${fk.column_name} → users.${fk.foreign_column_name}`);
    });

    // Check data in referenced tables
    console.log('\n📊 Data in tables that reference users:');
    for (const ref of userReferences) {
      try {
        const count = await query(`SELECT COUNT(*) as count FROM ${ref.table_name}`);
        console.log(`  - ${ref.table_name}: ${count.rows[0].count} records`);
      } catch (error) {
        console.log(`  - ${ref.table_name}: Error counting - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('💥 Check failed:', error.message);
  } finally {
    await closePool();
  }
}

checkForeignKeys();