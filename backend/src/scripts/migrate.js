import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, testConnection, closePool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.join(__dirname, '../../migrations');

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...');
    
    // Wait for database with retry logic
    console.log('⏳ Waiting for database to be ready...');
    let retries = 30;
    let isConnected = false;
    
    while (retries > 0 && !isConnected) {
      isConnected = await testConnection();
      if (!isConnected) {
        console.log(`   Retrying in 2 seconds... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        retries--;
      }
    }
    
    if (!isConnected) {
      console.error('❌ Could not connect to database after 60 seconds');
      console.error('💡 Please verify that PostgreSQL is running:');
      console.error('   docker-compose up -d postgres');
      console.error('   docker-compose logs postgres');
      process.exit(1);
    }

    // Read migration files
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('📝 No migration files found');
      return;
    }

    console.log(`📂 Found ${migrationFiles.length} migration files:`);
    migrationFiles.forEach(file => console.log(`   - ${file}`));

    // Execute migrations
    for (const file of migrationFiles) {
      console.log(`\n🔄 Executing migration: ${file}`);
      
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await query(sql);
        console.log(`✅ Migration ${file} completed successfully`);
      } catch (error) {
        console.error(`❌ Error executing migration ${file}:`, error.message);
        throw error;
      }
    }

    console.log('\n🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run migrations if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}

export default runMigrations;