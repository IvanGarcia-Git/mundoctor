import { query, testConnection, closePool } from '../config/database.js';

/**
 * Database optimization script
 * Adds indexes and optimizes queries for better performance
 */

const optimizations = [
  // User table optimizations
  {
    name: 'users_role_index',
    query: 'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);',
    description: 'Index on role for faster role-based filtering'
  },
  {
    name: 'users_created_at_index',
    query: 'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);',
    description: 'Index on created_at for time-based queries'
  },
  {
    name: 'users_status_index',
    query: 'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);',
    description: 'Index on status for status filtering'
  },
  {
    name: 'users_verified_index',
    query: 'CREATE INDEX IF NOT EXISTS idx_users_verified ON users(verified);',
    description: 'Index on verified status'
  },

  // Professional table optimizations
  {
    name: 'professionals_user_id_index',
    query: 'CREATE INDEX IF NOT EXISTS idx_professionals_user_id ON professionals(user_id);',
    description: 'Index on user_id for joins with users table'
  },
  {
    name: 'professionals_specialty_index',
    query: 'CREATE INDEX IF NOT EXISTS idx_professionals_specialty ON professionals(specialty_name);',
    description: 'Index on specialty for specialty-based searches'
  },
  {
    name: 'professionals_verified_index',
    query: 'CREATE INDEX IF NOT EXISTS idx_professionals_verified ON professionals(verified_at);',
    description: 'Index on verification status for professionals'
  },

  // Patient table optimizations
  {
    name: 'patients_user_id_index',
    query: 'CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);',
    description: 'Index on user_id for joins with users table'
  },

  // User preferences table optimizations
  {
    name: 'user_preferences_user_id_index',
    query: 'CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);',
    description: 'Index on user_id for joins with users table'
  },

  // Appointment table optimizations (if exists)
  {
    name: 'appointments_professional_id_index',
    query: 'CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON appointments(professional_id);',
    description: 'Index on professional_id for professional queries'
  },
  {
    name: 'appointments_patient_id_index',
    query: 'CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);',
    description: 'Index on patient_id for patient queries'
  },
  {
    name: 'appointments_date_index',
    query: 'CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);',
    description: 'Index on appointment date for date-based queries'
  },
  {
    name: 'appointments_status_index',
    query: 'CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);',
    description: 'Index on appointment status'
  },
  {
    name: 'appointments_created_at_index',
    query: 'CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at);',
    description: 'Index on created_at for sorting recent appointments'
  },

  // Reviews table optimizations (if exists)
  {
    name: 'reviews_professional_id_index',
    query: 'CREATE INDEX IF NOT EXISTS idx_reviews_professional_id ON reviews(professional_id);',
    description: 'Index on professional_id for professional reviews'
  },
  {
    name: 'reviews_patient_id_index',
    query: 'CREATE INDEX IF NOT EXISTS idx_reviews_patient_id ON reviews(patient_id);',
    description: 'Index on patient_id for patient reviews'
  },
  {
    name: 'reviews_rating_index',
    query: 'CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);',
    description: 'Index on rating for rating-based queries'
  },
  {
    name: 'reviews_created_at_index',
    query: 'CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);',
    description: 'Index on created_at for sorting recent reviews'
  },

  // Composite indexes for common queries
  {
    name: 'users_role_status_composite',
    query: 'CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);',
    description: 'Composite index on role and status for dashboard queries'
  },
  {
    name: 'users_role_created_at_composite',
    query: 'CREATE INDEX IF NOT EXISTS idx_users_role_created_at ON users(role, created_at);',
    description: 'Composite index on role and created_at for growth metrics'
  }
];

async function runOptimizations() {
  try {
    console.log('🚀 Starting database optimization...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Could not connect to database');
      process.exit(1);
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const optimization of optimizations) {
      try {
        console.log(`\n📊 Creating ${optimization.name}...`);
        console.log(`   ${optimization.description}`);
        
        const startTime = Date.now();
        await query(optimization.query);
        const duration = Date.now() - startTime;
        
        console.log(`   ✅ Created in ${duration}ms`);
        successCount++;
        
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
          console.log(`   ⏭️  Skipped (table doesn't exist or index already exists)`);
          skipCount++;
        } else {
          console.error(`   ❌ Error: ${error.message}`);
          errorCount++;
        }
      }
    }

    console.log('\n📈 Database optimization completed!');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (successCount > 0) {
      console.log('\n🔍 Running ANALYZE to update statistics...');
      try {
        await query('ANALYZE;');
        console.log('   ✅ Database statistics updated');
      } catch (error) {
        console.error(`   ❌ Error updating statistics: ${error.message}`);
      }
    }

    // Get index information
    console.log('\n📊 Current indexes:');
    try {
      const indexQuery = `
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname;
      `;
      const indexResult = await query(indexQuery);
      
      if (indexResult.rows.length > 0) {
        const groupedIndexes = indexResult.rows.reduce((acc, row) => {
          if (!acc[row.tablename]) {
            acc[row.tablename] = [];
          }
          acc[row.tablename].push(row.indexname);
          return acc;
        }, {});

        Object.entries(groupedIndexes).forEach(([table, indexes]) => {
          console.log(`   📋 ${table}: ${indexes.length} indexes`);
          indexes.forEach(index => {
            console.log(`      - ${index}`);
          });
        });
      } else {
        console.log('   No indexes found');
      }
    } catch (error) {
      console.error(`   ❌ Error fetching index information: ${error.message}`);
    }

    console.log('\n🎉 Database optimization script completed successfully!');
    
  } catch (error) {
    console.error('💥 Database optimization failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await closePool();
  }
}

runOptimizations();