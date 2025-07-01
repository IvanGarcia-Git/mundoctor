import { query, testConnection, closePool } from '../config/database.js';

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }

    // Check if data already exists
    const specialtiesCount = await query('SELECT COUNT(*) FROM specialties');
    if (parseInt(specialtiesCount.rows[0].count) > 0) {
      console.log('📊 Database already has data, skipping seed');
      return;
    }

    console.log('📝 Seeding database with initial data...');
    
    // Seed data is already included in 002_seed_data.sql migration
    // This script is for any additional demo data if needed
    
    console.log('🎉 Database seeding completed!');
    
  } catch (error) {
    console.error('💥 Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

export default seedDatabase;