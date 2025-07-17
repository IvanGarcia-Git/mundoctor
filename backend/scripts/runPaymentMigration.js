import { query } from '../src/config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPaymentMigration() {
  try {
    console.log('🚀 Running payment tables migration...');
    
    const migrationPath = path.join(__dirname, '../migrations/016_add_payment_tables_v2.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    await query(migration);
    
    console.log('✅ Payment tables migration completed successfully');
    
    // Verify tables were created
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('payments', 'subscriptions', 'invoices', 'invoice_items', 'transactions', 'webhook_events', 'subscription_plans')
      ORDER BY table_name
    `);
    
    console.log('📋 Created tables:');
    tables.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    console.log('🎉 Payment system is ready!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

runPaymentMigration();