import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { clerkMiddleware } from '@clerk/express';
import { testConnection } from './config/database.js';

// Import WebSocket and notification services
import webSocketManager from './utils/websocket.js';
import reminderJobsService from './jobs/reminderJobs.js';

// Import routes
import authRoutes from './routes/auth.js';
import webhookRoutes from './routes/webhooks.js';
import userRoutes from './routes/users.js';
import userValidationRoutes from './routes/userValidation.js';
import uploadRoutes from './routes/uploads.js';
import appointmentRoutes from './routes/appointments.js';
import scheduleRoutes from './routes/schedules.js';
import serviceRoutes from './routes/services.js';
import validationRoutes from './routes/validation.js';
import patientRoutes from './routes/patients.js';
import reviewRoutes from './routes/reviews.js';
import adminRoutes from './routes/admin.js';
import ticketRoutes from './routes/tickets.js';
import notificationRoutes from './routes/notifications.js';
import paymentRoutes from './routes/payments.js';
import professionalRoutes from './routes/professionals.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Create HTTP server for WebSocket integration
const server = createServer(app);

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

// CORS configuration - Enhanced for Clerk authentication
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? (process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [])
      : [
          'http://localhost:5173', 
          'http://localhost:5174', 
          'http://localhost:3000', 
          'http://127.0.0.1:5173',
          'http://127.0.0.1:5174',
          'http://127.0.0.1:3000'
        ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS: Origin ${origin} not allowed`);
      callback(null, true); // Allow in development, change to false in production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name',
    'clerk-db-jwt',
    'clerk-publishable-key',
    'x-clerk-auth-token',
    'svix-id',
    'svix-timestamp', 
    'svix-signature'
  ],
  exposedHeaders: ['Content-Length', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly for all routes
app.options('*', cors(corsOptions));

// Additional CORS middleware for problematic requests
app.use((req, res, next) => {
  // Set CORS headers for all requests as fallback
  const origin = req.headers.origin;
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:3000'];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`OPTIONS request for ${req.path} from origin: ${origin}`);
    return res.status(200).end();
  }
  
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory (with security)
app.use('/uploads', express.static('uploads', {
  // Add security headers for file serving
  setHeaders: (res, path) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
  }
}));

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

// Test endpoint for role selection without auth
app.post('/api/test-select-role-noauth', (req, res) => {
  console.log('🔍 Test select role endpoint hit (no auth)');
  console.log('🔍 Request body:', req.body);
  res.json({ success: true, message: 'Test endpoint working without auth' });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  console.log('CORS test endpoint requested from origin:', req.headers.origin);
  res.json({ 
    message: 'CORS is working correctly!',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    headers: req.headers
  });
});

app.post('/api/cors-test', (req, res) => {
  console.log('CORS POST test endpoint requested');
  res.json({ 
    message: 'CORS POST is working correctly!',
    body: req.body,
    timestamp: new Date().toISOString()
  });
});

// Clerk middleware setup - will be applied selectively in routes that need it
const clerkAuth = clerkMiddleware({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY
});

// API routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Mundoctor API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      webhooks: '/api/webhooks',
      users: '/api/users',
      patients: '/api/patients',
      reviews: '/api/reviews',
      admin: '/api/admin',
      tickets: '/api/tickets',
      notifications: '/api/notifications',
      payments: '/api/payments',
      professionals: '/api/professionals',
      appointments: '/api/appointments'
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/users', clerkAuth, userRoutes);
app.use('/api/users', clerkAuth, userValidationRoutes);
app.use('/api/uploads', clerkAuth, uploadRoutes);
app.use('/api/appointments', clerkAuth, appointmentRoutes);
app.use('/api/schedules', clerkAuth, scheduleRoutes);
app.use('/api/services', clerkAuth, serviceRoutes);
app.use('/api/validation', clerkAuth, validationRoutes);
app.use('/api/patients', clerkAuth, patientRoutes);
app.use('/api/reviews', clerkAuth, reviewRoutes);
app.use('/api/admin', clerkAuth, adminRoutes);
app.use('/api/tickets', clerkAuth, ticketRoutes);
app.use('/api/notifications', clerkAuth, notificationRoutes);
app.use('/api/payments', paymentRoutes); // Webhooks need to be processed without auth
app.use('/api/professionals', professionalRoutes);

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

    // Initialize WebSocket server
    webSocketManager.initialize(server);

    // Start reminder jobs
    if (process.env.NODE_ENV !== 'test') {
      reminderJobsService.start();
    }

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`
🚀 Mundoctor API Server running on port ${PORT}
📊 Environment: ${process.env.NODE_ENV || 'development'}
🔗 Health check: http://localhost:${PORT}/health
📖 API docs: http://localhost:${PORT}/api
🔔 WebSocket server: Active
⏰ Reminder jobs: ${process.env.NODE_ENV !== 'test' ? 'Active' : 'Disabled (test mode)'}
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
  reminderJobsService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  reminderJobsService.stop();
  process.exit(0);
});

startServer();

export default app;