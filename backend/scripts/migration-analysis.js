import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/database.js';
import { logInfo, logWarning, logError } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Migration analysis and consolidation utility
class MigrationAnalyzer {
  constructor() {
    this.migrationsDir = path.join(__dirname, '..', 'migrations');
    this.migrations = [];
    this.conflicts = [];
    this.redundancies = [];
    this.dependencies = [];
  }

  // Analyze all migration files
  async analyzeMigrations() {
    logInfo('Starting migration analysis...');
    
    try {
      // Read all migration files
      const files = fs.readdirSync(this.migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      for (const file of files) {
        const filePath = path.join(this.migrationsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        const migration = {
          filename: file,
          path: filePath,
          content: content,
          tables: this.extractTables(content),
          operations: this.extractOperations(content),
          dependencies: this.extractDependencies(content),
          size: content.length,
          lineCount: content.split('\n').length
        };

        this.migrations.push(migration);
      }

      // Analyze conflicts and redundancies
      this.detectConflicts();
      this.detectRedundancies();
      this.buildDependencyGraph();

      logInfo('Migration analysis completed', {
        totalMigrations: this.migrations.length,
        conflicts: this.conflicts.length,
        redundancies: this.redundancies.length
      });

      return this.generateReport();
    } catch (error) {
      logError(error, { event: 'migration_analysis_failed' });
      throw error;
    }
  }

  // Extract table operations from migration content
  extractTables(content) {
    const tables = {
      created: [],
      altered: [],
      dropped: [],
      referenced: []
    };

    // Extract CREATE TABLE statements
    const createMatches = content.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/gi);
    if (createMatches) {
      tables.created = createMatches.map(match => 
        match.replace(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?/gi, '').trim()
      );
    }

    // Extract ALTER TABLE statements
    const alterMatches = content.match(/ALTER\s+TABLE\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi);
    if (alterMatches) {
      tables.altered = alterMatches.map(match => 
        match.replace(/ALTER\s+TABLE\s+/gi, '').trim()
      );
    }

    // Extract DROP TABLE statements
    const dropMatches = content.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/gi);
    if (dropMatches) {
      tables.dropped = dropMatches.map(match => 
        match.replace(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?/gi, '').trim()
      );
    }

    // Extract REFERENCES (foreign keys)
    const refMatches = content.match(/REFERENCES\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi);
    if (refMatches) {
      tables.referenced = refMatches.map(match => 
        match.replace(/REFERENCES\s+/gi, '').trim()
      );
    }

    return tables;
  }

  // Extract SQL operations from migration content
  extractOperations(content) {
    const operations = {
      createTable: (content.match(/CREATE\s+TABLE/gi) || []).length,
      alterTable: (content.match(/ALTER\s+TABLE/gi) || []).length,
      dropTable: (content.match(/DROP\s+TABLE/gi) || []).length,
      createIndex: (content.match(/CREATE\s+(?:UNIQUE\s+)?INDEX/gi) || []).length,
      dropIndex: (content.match(/DROP\s+INDEX/gi) || []).length,
      insert: (content.match(/INSERT\s+INTO/gi) || []).length,
      update: (content.match(/UPDATE\s+/gi) || []).length,
      delete: (content.match(/DELETE\s+FROM/gi) || []).length,
      createFunction: (content.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION/gi) || []).length,
      createTrigger: (content.match(/CREATE\s+TRIGGER/gi) || []).length,
      createView: (content.match(/CREATE\s+(?:OR\s+REPLACE\s+)?VIEW/gi) || []).length
    };

    return operations;
  }

  // Extract dependencies from migration content
  extractDependencies(content) {
    const dependencies = [];
    
    // Extract table dependencies from foreign keys
    const fkMatches = content.match(/FOREIGN\s+KEY\s*\([^)]+\)\s+REFERENCES\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi);
    if (fkMatches) {
      dependencies.push(...fkMatches.map(match => {
        const table = match.match(/REFERENCES\s+([a-zA-Z_][a-zA-Z0-9_]*)/i)[1];
        return { type: 'foreign_key', table };
      }));
    }

    // Extract extension dependencies
    const extMatches = content.match(/CREATE\s+EXTENSION\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_-]*)/gi);
    if (extMatches) {
      dependencies.push(...extMatches.map(match => {
        const extension = match.match(/([a-zA-Z_][a-zA-Z0-9_-]*)$/i)[1];
        return { type: 'extension', name: extension };
      }));
    }

    return dependencies;
  }

  // Detect conflicts between migrations
  detectConflicts() {
    const conflicts = [];
    
    // Check for duplicate migration numbers
    const migrationNumbers = new Map();
    this.migrations.forEach(migration => {
      const number = migration.filename.split('_')[0];
      if (migrationNumbers.has(number)) {
        conflicts.push({
          type: 'duplicate_number',
          number,
          files: [migrationNumbers.get(number), migration.filename]
        });
      } else {
        migrationNumbers.set(number, migration.filename);
      }
    });

    // Check for table conflicts (create/drop same table)
    const tableOperations = new Map();
    this.migrations.forEach(migration => {
      [...migration.tables.created, ...migration.tables.dropped].forEach(table => {
        if (!tableOperations.has(table)) {
          tableOperations.set(table, []);
        }
        tableOperations.get(table).push({
          migration: migration.filename,
          operation: migration.tables.created.includes(table) ? 'create' : 'drop'
        });
      });
    });

    // Identify conflicting operations
    tableOperations.forEach((operations, table) => {
      if (operations.length > 1) {
        const creates = operations.filter(op => op.operation === 'create');
        const drops = operations.filter(op => op.operation === 'drop');
        
        if (creates.length > 1) {
          conflicts.push({
            type: 'multiple_create',
            table,
            migrations: creates.map(op => op.migration)
          });
        }
        
        if (creates.length > 0 && drops.length > 0) {
          conflicts.push({
            type: 'create_drop_conflict',
            table,
            creates: creates.map(op => op.migration),
            drops: drops.map(op => op.migration)
          });
        }
      }
    });

    this.conflicts = conflicts;
  }

  // Detect redundant migrations
  detectRedundancies() {
    const redundancies = [];
    
    // Check for similar migration names
    const similarNames = new Map();
    this.migrations.forEach(migration => {
      const baseName = migration.filename.replace(/^\d+_/, '').replace(/\.sql$/, '');
      const words = baseName.split(/[_-]/);
      const key = words.slice(0, 2).join('_'); // First two words
      
      if (!similarNames.has(key)) {
        similarNames.set(key, []);
      }
      similarNames.get(key).push(migration.filename);
    });

    // Identify groups with multiple similar migrations
    similarNames.forEach((files, key) => {
      if (files.length > 1) {
        redundancies.push({
          type: 'similar_names',
          key,
          files
        });
      }
    });

    // Check for duplicate table operations
    const tableCreations = new Map();
    this.migrations.forEach(migration => {
      migration.tables.created.forEach(table => {
        if (!tableCreations.has(table)) {
          tableCreations.set(table, []);
        }
        tableCreations.get(table).push(migration.filename);
      });
    });

    tableCreations.forEach((files, table) => {
      if (files.length > 1) {
        redundancies.push({
          type: 'duplicate_table_creation',
          table,
          files
        });
      }
    });

    this.redundancies = redundancies;
  }

  // Build dependency graph
  buildDependencyGraph() {
    const graph = new Map();
    
    this.migrations.forEach(migration => {
      const deps = [];
      
      // Add dependencies based on foreign key references
      migration.dependencies.forEach(dep => {
        if (dep.type === 'foreign_key') {
          // Find migrations that create the referenced table
          const creatingMigrations = this.migrations.filter(m => 
            m.tables.created.includes(dep.table)
          );
          deps.push(...creatingMigrations.map(m => m.filename));
        }
      });

      graph.set(migration.filename, {
        dependencies: deps,
        dependents: []
      });
    });

    // Build reverse dependencies
    graph.forEach((info, migration) => {
      info.dependencies.forEach(dep => {
        if (graph.has(dep)) {
          graph.get(dep).dependents.push(migration);
        }
      });
    });

    this.dependencies = graph;
  }

  // Generate comprehensive report
  generateReport() {
    const report = {
      summary: {
        totalMigrations: this.migrations.length,
        totalConflicts: this.conflicts.length,
        totalRedundancies: this.redundancies.length,
        totalSize: this.migrations.reduce((sum, m) => sum + m.size, 0),
        avgSize: Math.round(this.migrations.reduce((sum, m) => sum + m.size, 0) / this.migrations.length)
      },
      migrations: this.migrations.map(m => ({
        filename: m.filename,
        size: m.size,
        lines: m.lineCount,
        operations: m.operations,
        tablesCreated: m.tables.created.length,
        tablesAltered: m.tables.altered.length,
        tablesDropped: m.tables.dropped.length,
        dependencies: m.dependencies.length
      })),
      conflicts: this.conflicts,
      redundancies: this.redundancies,
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  // Generate consolidation recommendations
  generateRecommendations() {
    const recommendations = [];

    // Recommend removing redundant migrations
    if (this.redundancies.length > 0) {
      recommendations.push({
        type: 'remove_redundant',
        priority: 'high',
        description: 'Remove or consolidate redundant migrations',
        affectedFiles: this.redundancies.flatMap(r => r.files),
        action: 'Review and consolidate similar migrations'
      });
    }

    // Recommend resolving conflicts
    if (this.conflicts.length > 0) {
      recommendations.push({
        type: 'resolve_conflicts',
        priority: 'critical',
        description: 'Resolve migration conflicts',
        affectedFiles: this.conflicts.flatMap(c => c.files || c.migrations || []),
        action: 'Merge conflicting migrations into single coherent migration'
      });
    }

    // Recommend consolidation by phase
    const phases = this.identifyMigrationPhases();
    if (phases.length > 3) {
      recommendations.push({
        type: 'consolidate_phases',
        priority: 'medium',
        description: 'Consolidate migration phases',
        phases,
        action: 'Group related migrations into logical phases'
      });
    }

    return recommendations;
  }

  // Identify migration phases
  identifyMigrationPhases() {
    const phases = [];
    let currentPhase = { start: 0, end: 0, theme: 'initial' };

    this.migrations.forEach((migration, index) => {
      const filename = migration.filename;
      
      // Detect phase changes based on filename patterns
      if (filename.includes('clerk') || filename.includes('auth')) {
        if (currentPhase.theme !== 'authentication') {
          phases.push(currentPhase);
          currentPhase = { start: index, end: index, theme: 'authentication' };
        }
      } else if (filename.includes('appointment') || filename.includes('schedule')) {
        if (currentPhase.theme !== 'appointments') {
          phases.push(currentPhase);
          currentPhase = { start: index, end: index, theme: 'appointments' };
        }
      } else if (filename.includes('payment') || filename.includes('subscription')) {
        if (currentPhase.theme !== 'payments') {
          phases.push(currentPhase);
          currentPhase = { start: index, end: index, theme: 'payments' };
        }
      } else if (filename.includes('admin')) {
        if (currentPhase.theme !== 'admin') {
          phases.push(currentPhase);
          currentPhase = { start: index, end: index, theme: 'admin' };
        }
      }
      
      currentPhase.end = index;
    });

    phases.push(currentPhase);
    return phases;
  }

  // Check current database state
  async checkDatabaseState() {
    try {
      logInfo('Checking current database state...');
      
      // Check if schema_migrations table exists
      const migrationTableExists = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'schema_migrations'
        );
      `);

      if (migrationTableExists.rows[0].exists) {
        // Get applied migrations
        const appliedMigrations = await query(`
          SELECT version, description, applied_at 
          FROM schema_migrations 
          ORDER BY applied_at;
        `);

        // Check table existence
        const tables = await query(`
          SELECT table_name, table_type 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name;
        `);

        // Check foreign key constraints
        const foreignKeys = await query(`
          SELECT 
            tc.table_name, 
            tc.constraint_name, 
            tc.constraint_type,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
          ORDER BY tc.table_name, tc.constraint_name;
        `);

        // Check indexes
        const indexes = await query(`
          SELECT 
            schemaname, 
            tablename, 
            indexname, 
            indexdef
          FROM pg_indexes
          WHERE schemaname = 'public'
          ORDER BY tablename, indexname;
        `);

        return {
          migrationTableExists: true,
          appliedMigrations: appliedMigrations.rows,
          tables: tables.rows,
          foreignKeys: foreignKeys.rows,
          indexes: indexes.rows
        };
      } else {
        return {
          migrationTableExists: false,
          message: 'Schema migrations table not found'
        };
      }
    } catch (error) {
      logError(error, { event: 'database_state_check_failed' });
      return {
        error: error.message,
        migrationTableExists: false
      };
    }
  }

  // Save analysis report
  async saveReport(report) {
    const reportPath = path.join(__dirname, 'migration-analysis-report.json');
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      logInfo('Migration analysis report saved', { path: reportPath });
      return reportPath;
    } catch (error) {
      logError(error, { event: 'save_report_failed' });
      throw error;
    }
  }
}

// Main execution function
async function runMigrationAnalysis() {
  try {
    const analyzer = new MigrationAnalyzer();
    
    // Run analysis
    const report = await analyzer.analyzeMigrations();
    
    // Check database state
    const dbState = await analyzer.checkDatabaseState();
    report.databaseState = dbState;
    
    // Save report
    const reportPath = await analyzer.saveReport(report);
    
    // Log summary
    logInfo('Migration analysis completed successfully', {
      totalMigrations: report.summary.totalMigrations,
      conflicts: report.summary.totalConflicts,
      redundancies: report.summary.totalRedundancies,
      recommendations: report.recommendations.length,
      reportPath
    });

    return report;
  } catch (error) {
    logError(error, { event: 'migration_analysis_failed' });
    throw error;
  }
}

// Export for use in other modules
export { MigrationAnalyzer, runMigrationAnalysis };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrationAnalysis()
    .then(report => {
      console.log('Migration Analysis Report:');
      console.log('=========================');
      console.log(`Total Migrations: ${report.summary.totalMigrations}`);
      console.log(`Conflicts: ${report.summary.totalConflicts}`);
      console.log(`Redundancies: ${report.summary.totalRedundancies}`);
      console.log(`Recommendations: ${report.recommendations.length}`);
      console.log('\nDetailed report saved to migration-analysis-report.json');
    })
    .catch(error => {
      console.error('Migration analysis failed:', error);
      process.exit(1);
    });
}