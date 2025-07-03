import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { clerkMiddleware } from '@clerk/express';
import { testConnection } from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import webhookRoutes from './routes/webhooks.js';
import userRoutes from './routes/users.js';
import userValidationRoutes from './routes/userValidation.js';
// import professionalRoutes from './routes/professionals.js';
// import appointmentRoutes from './routes/appointments.js';
// import ratingRoutes from './routes/ratings.js';
// import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow embedding for development
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-clerk-auth-token'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint (before Clerk middleware to avoid auth requirements)
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  console.log('Test endpoint requested');
  res.json({ message: 'Test endpoint working' });
});

// Clerk middleware (after health check)
app.use(clerkMiddleware({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY
}));

// API routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Mundoctor API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      webhooks: '/api/webhooks',
      users: '/api/users',
      professionals: '/api/professionals',
      appointments: '/api/appointments',
      ratings: '/api/ratings',
      admin: '/api/admin'
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/users', userRoutes);
app.use('/api/users', userValidationRoutes);
// app.use('/api/professionals', professionalRoutes);
// app.use('/api/appointments', appointmentRoutes);
// app.use('/api/ratings', ratingRoutes);
// app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Clerk errors
  if (err.name === 'ClerkAPIError') {
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid or expired token'
    });
  }

  // Database errors
  if (err.code && err.code.startsWith('23')) {
    return res.status(400).json({
      error: 'Database constraint violation',
      message: 'The request violates database constraints'
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      message: err.message,
      details: err.details
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Server not started.');
      process.exit(1);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
🚀 Mundoctor API Server running on port ${PORT}
📊 Environment: ${process.env.NODE_ENV || 'development'}
🔗 Health check: http://localhost:${PORT}/health
📖 API docs: http://localhost:${PORT}/api
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

startServer();

export default app;