import express from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { clerkMiddleware } from '@clerk/express';

// Import new infrastructure
import { loadConfiguration } from './config/validation.js';
import { testConnection, getPoolStatus } from './config/database.js';
import { helmetConfig, corsConfig, requestTiming, securityHeaders, ipTracking } from './config/security.js';
import { generalRateLimit, authRateLimit, uploadRateLimit, webhookRateLimit } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler, setupGlobalErrorHandlers } from './middleware/errorHandler.js';
import { sanitizeInput } from './middleware/validation.js';
import logger, { stream } from './utils/logger.js';
import { healthCheckResponse } from './utils/responses.js';

// Import routes
import authRoutes from './routes/auth.js';
import webhookRoutes from './routes/webhooks.js';
import userRoutes from './routes/users.js';
import userValidationRoutes from './routes/userValidation.js';
import uploadRoutes from './routes/uploads.js';

// Load and validate configuration
const config = loadConfiguration();

// Setup global error handlers
setupGlobalErrorHandlers();

const app = express();

// Trust proxy for accurate IP detection
app.set('trust proxy', 1);

// Request timing and IP tracking (should be first)
app.use(requestTiming);
app.use(ipTracking);

// Security middleware
app.use(helmetConfig);
app.use(securityHeaders);

// CORS configuration
app.use(cors(corsConfig));
app.options('*', cors(corsConfig));

// Body parsing with size limits
app.use(express.json({ limit: config.MAX_FILE_SIZE }));
app.use(express.urlencoded({ extended: true, limit: config.MAX_FILE_SIZE }));

// Input sanitization
app.use(sanitizeInput);

// Compression middleware
app.use(compression());

// Logging middleware with Winston stream
app.use(morgan('combined', { stream }));

// Rate limiting for API routes
app.use('/api', generalRateLimit);

// Serve static files from uploads directory (with security)
app.use('/uploads', express.static(config.UPLOAD_DIR, {
  setHeaders: (res, path) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
  }
}));

// Health check endpoint (before authentication)
app.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    const dbConnected = await testConnection();
    const poolStatus = getPoolStatus();
    
    // Check other services
    const checks = {
      database: {
        status: dbConnected ? 'healthy' : 'unhealthy',
        details: poolStatus,
      },
      memory: {
        status: 'healthy',
        details: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
      },
      disk: {
        status: 'healthy', // Could add actual disk space check
      },
    };

    return healthCheckResponse(res, checks);
  } catch (error) {
    logger.error('Health check failed', error);
    return healthCheckResponse(res, {
      database: { status: 'unhealthy', error: error.message },
    });
  }
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Mundoctor API Server',
      version: '1.0.0',
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
      endpoints: {
        auth: '/api/auth',
        webhooks: '/api/webhooks',
        users: '/api/users',
        uploads: '/api/uploads',
        health: '/health',
      },
      rateLimit: {
        general: config.RATE_LIMIT_GENERAL,
        auth: config.RATE_LIMIT_AUTH,
        upload: config.RATE_LIMIT_UPLOAD,
      },
    },
  });
});

// Setup Clerk middleware
const clerkAuth = clerkMiddleware({
  publishableKey: config.CLERK_PUBLISHABLE_KEY,
  secretKey: config.CLERK_SECRET_KEY,
});

// API Routes with appropriate rate limiting
app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/webhooks', webhookRateLimit, webhookRoutes);
app.use('/api/users', clerkAuth, userRoutes);
app.use('/api/users', clerkAuth, userValidationRoutes);
app.use('/api/uploads', uploadRateLimit, clerkAuth, uploadRoutes);

// Development and testing endpoints
if (config.NODE_ENV === 'development') {
  app.get('/test', (req, res) => {
    res.json({ 
      success: true, 
      message: 'Test endpoint working',
      timestamp: new Date().toISOString(),
      config: {
        nodeEnv: config.NODE_ENV,
        port: config.PORT,
        dbHost: config.DB_HOST,
      },
    });
  });

  app.get('/api/cors-test', (req, res) => {
    res.json({ 
      success: true,
      message: 'CORS is working correctly!',
      origin: req.headers.origin,
      timestamp: new Date().toISOString(),
      ip: req.ip,
    });
  });

  app.post('/api/cors-test', (req, res) => {
    res.json({ 
      success: true,
      message: 'CORS POST is working correctly!',
      body: req.body,
      timestamp: new Date().toISOString(),
    });
  });
}

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      logger.error('Failed to connect to database. Server not started.');
      process.exit(1);
    }

    // Start listening
    const server = app.listen(config.PORT, '0.0.0.0', () => {
      logger.info('🚀 Mundoctor API Server Started', {
        port: config.PORT,
        environment: config.NODE_ENV,
        pid: process.pid,
        version: '1.0.0',
        endpoints: {
          health: `http://localhost:${config.PORT}/health`,
          api: `http://localhost:${config.PORT}/api`,
        },
        database: {
          host: config.DB_HOST,
          name: config.DB_NAME,
          poolMax: config.DB_POOL_MAX,
        },
        security: {
          rateLimits: {
            general: config.RATE_LIMIT_GENERAL,
            auth: config.RATE_LIMIT_AUTH,
            upload: config.RATE_LIMIT_UPLOAD,
          },
        },
      });
    });

    // Graceful shutdown handlers
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Close database connections
          const { closePool } = await import('./config/database.js');
          await closePool();
          
          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown', error);
          process.exit(1);
        }
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

// Start the server
startServer();

export default app;