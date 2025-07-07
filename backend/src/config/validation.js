import { z } from 'zod';
import { logError, logWarning, logInfo } from '../utils/logger.js';

// Environment configuration schema
const envSchema = z.object({
  // App Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1000).max(65535).default(8000),
  
  // Database Configuration
  DATABASE_URL: z.string().url().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().min(1000).max(65535).default(5432),
  DB_NAME: z.string().default('mundoctor'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  
  // Database Pool Configuration
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(20),
  DB_POOL_MIN: z.coerce.number().int().min(0).max(50).default(0),
  DB_IDLE_TIMEOUT: z.coerce.number().int().min(1000).default(30000),
  DB_CONNECTION_TIMEOUT: z.coerce.number().int().min(1000).default(2000),
  DB_ACQUIRE_TIMEOUT: z.coerce.number().int().min(5000).default(60000),
  DB_CREATE_TIMEOUT: z.coerce.number().int().min(2000).default(8000),
  DB_DESTROY_TIMEOUT: z.coerce.number().int().min(1000).default(5000),
  DB_REAP_INTERVAL: z.coerce.number().int().min(500).default(1000),
  DB_CREATE_RETRY_INTERVAL: z.coerce.number().int().min(100).default(200),
  
  // Clerk Authentication
  CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  CLERK_SECRET_KEY: z.string().startsWith('sk_'),
  CLERK_WEBHOOK_SECRET: z.string().optional(),
  
  // Frontend URLs
  FRONTEND_URL: z.string().url().optional(),
  
  // Rate Limiting Configuration
  RATE_LIMIT_GENERAL: z.coerce.number().int().min(1).default(100),
  RATE_LIMIT_AUTH: z.coerce.number().int().min(1).default(5),
  RATE_LIMIT_UPLOAD: z.coerce.number().int().min(1).default(10),
  RATE_LIMIT_PASSWORD_RESET: z.coerce.number().int().min(1).default(3),
  RATE_LIMIT_EMAIL: z.coerce.number().int().min(1).default(5),
  RATE_LIMIT_SEARCH: z.coerce.number().int().min(1).default(20),
  RATE_LIMIT_CREATION: z.coerce.number().int().min(1).default(10),
  RATE_LIMIT_WEBHOOK: z.coerce.number().int().min(1).default(50),
  RATE_LIMIT_ADMIN: z.coerce.number().int().min(1).default(30),
  
  // Logging Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  LOG_DB_SUCCESS: z.coerce.boolean().default(true),
  LOG_DB_ERRORS: z.coerce.boolean().default(true),
  
  // File Upload Configuration
  MAX_FILE_SIZE: z.coerce.number().int().min(1024).default(10 * 1024 * 1024), // 10MB
  UPLOAD_DIR: z.string().default('./uploads'),
  
  // Security Configuration
  JWT_SECRET: z.string().min(32).optional(),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),
  
  // Email Configuration (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASSWORD: z.string().optional(),
  
  // External APIs (optional)
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
});

// Validate environment variables
export const validateEnvironment = () => {
  try {
    const env = envSchema.parse(process.env);
    
    logInfo('Environment configuration validated successfully', {
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
      dbHost: env.DB_HOST,
      dbName: env.DB_NAME,
      logLevel: env.LOG_LEVEL,
    });
    
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        received: err.received,
      }));
      
      logError(new Error('Environment validation failed'), { errors });
      
      console.error('\n❌ Environment Configuration Errors:');
      errors.forEach(err => {
        console.error(`  • ${err.field}: ${err.message} (received: ${err.received})`);
      });
      console.error('\nPlease check your .env file and environment variables.\n');
      
      process.exit(1);
    }
    
    logError(error, { event: 'env_validation_error' });
    process.exit(1);
  }
};

// Check required environment variables based on NODE_ENV
export const checkRequiredEnvironment = (env) => {
  const missing = [];
  const warnings = [];
  
  // Production-specific requirements
  if (env.NODE_ENV === 'production') {
    if (!env.DATABASE_URL && (!env.DB_HOST || !env.DB_PASSWORD)) {
      missing.push('DATABASE_URL or complete database configuration');
    }
    
    if (!env.FRONTEND_URL) {
      warnings.push('FRONTEND_URL should be set for production CORS configuration');
    }
    
    if (!env.JWT_SECRET) {
      warnings.push('JWT_SECRET should be set for production');
    }
  }
  
  // Development warnings
  if (env.NODE_ENV === 'development') {
    if (env.DB_PASSWORD === 'postgres') {
      warnings.push('Using default database password in development');
    }
  }
  
  // Log missing requirements
  if (missing.length > 0) {
    logError(new Error('Missing required environment variables'), { missing });
    console.error('\n❌ Missing Required Environment Variables:');
    missing.forEach(item => console.error(`  • ${item}`));
    console.error('');
    process.exit(1);
  }
  
  // Log warnings
  if (warnings.length > 0) {
    logWarning('Environment configuration warnings', { warnings });
    console.warn('\n⚠️  Environment Configuration Warnings:');
    warnings.forEach(warning => console.warn(`  • ${warning}`));
    console.warn('');
  }
};

// Get configuration summary for logging
export const getConfigSummary = (env) => {
  return {
    environment: env.NODE_ENV,
    port: env.PORT,
    database: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      name: env.DB_NAME,
      poolMax: env.DB_POOL_MAX,
      poolMin: env.DB_POOL_MIN,
    },
    rateLimits: {
      general: env.RATE_LIMIT_GENERAL,
      auth: env.RATE_LIMIT_AUTH,
      upload: env.RATE_LIMIT_UPLOAD,
    },
    logging: {
      level: env.LOG_LEVEL,
    },
    features: {
      clerkAuth: !!env.CLERK_SECRET_KEY,
      email: !!env.SMTP_HOST,
      sms: !!env.TWILIO_ACCOUNT_SID,
      maps: !!env.GOOGLE_MAPS_API_KEY,
    },
  };
};

// Load and validate configuration
export const loadConfiguration = () => {
  const env = validateEnvironment();
  checkRequiredEnvironment(env);
  
  const summary = getConfigSummary(env);
  logInfo('Application configuration loaded', summary);
  
  return env;
};

export default {
  validateEnvironment,
  checkRequiredEnvironment,
  getConfigSummary,
  loadConfiguration,
  envSchema,
};