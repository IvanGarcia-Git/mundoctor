import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { RateLimitError } from '../middleware/errorHandler.js';
import { logWarning } from '../utils/logger.js';

// Rate limiting configurations
export const rateLimitConfigs = {
  // General API rate limit
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logWarning('Rate limit exceeded', {
        ip: req.ip,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
      });
      throw new RateLimitError('Too many requests, please try again later');
    },
  }),

  // Authentication rate limit (stricter)
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 authentication attempts per windowMs
    message: {
      success: false,
      message: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes',
    },
    skipSuccessfulRequests: true,
    handler: (req, res) => {
      logWarning('Authentication rate limit exceeded', {
        ip: req.ip,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
      });
      throw new RateLimitError('Too many authentication attempts');
    },
  }),

  // File upload rate limit
  upload: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 file uploads per hour
    message: {
      success: false,
      message: 'Too many file uploads, please try again later.',
      retryAfter: '1 hour',
    },
    handler: (req, res) => {
      logWarning('Upload rate limit exceeded', {
        ip: req.ip,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
      });
      throw new RateLimitError('Too many file uploads');
    },
  }),

  // Password reset rate limit
  passwordReset: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password reset attempts per hour
    message: {
      success: false,
      message: 'Too many password reset attempts, please try again later.',
      retryAfter: '1 hour',
    },
    handler: (req, res) => {
      logWarning('Password reset rate limit exceeded', {
        ip: req.ip,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
      });
      throw new RateLimitError('Too many password reset attempts');
    },
  }),
};

// Helmet security configuration
export const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  
  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false, // Allow embedding for development
  
  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: { policy: "same-origin" },
  
  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: "cross-origin" },
  
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  
  // Expect-CT
  expectCt: {
    enforce: true,
    maxAge: 86400, // 24 hours
  },
  
  // Frame Options
  frameguard: { action: 'deny' },
  
  // Hide Powered-By
  hidePoweredBy: true,
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  
  // IE No Open
  ieNoOpen: true,
  
  // No Sniff
  noSniff: true,
  
  // Origin Agent Cluster
  originAgentCluster: true,
  
  // Permission Policy
  permittedCrossDomainPolicies: false,
  
  // Referrer Policy
  referrerPolicy: { policy: "no-referrer" },
  
  // X-XSS-Protection
  xssFilter: true,
});

// CORS configuration
export const corsConfig = {
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
      logWarning('CORS: Origin not allowed', { origin, allowedOrigins });
      if (process.env.NODE_ENV === 'production') {
        callback(new Error('Not allowed by CORS'), false);
      } else {
        // Allow in development but log warning
        callback(null, true);
      }
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
  exposedHeaders: ['Content-Length', 'X-Total-Count'],
  preflightContinue: false,
  optionsSuccessStatus: 200,
};

// IP whitelist middleware
export const ipWhitelist = (whitelist = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (whitelist.length > 0 && !whitelist.includes(clientIP)) {
      logWarning('IP not in whitelist', { clientIP, whitelist });
      return res.status(403).json({
        success: false,
        message: 'Access denied from your IP address',
      });
    }
    
    next();
  };
};

// Request size limiter
export const requestSizeLimiter = {
  json: { limit: '10mb' },
  urlencoded: { extended: true, limit: '10mb' },
  raw: { limit: '10mb' },
  text: { limit: '10mb' },
};

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Additional security headers not covered by helmet
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-Response-Time', Date.now() - req.startTime);
  
  // Remove server fingerprinting
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

// Request timing middleware
export const requestTiming = (req, res, next) => {
  req.startTime = Date.now();
  next();
};

// IP tracking middleware
export const ipTracking = (req, res, next) => {
  // Get real IP address (considering proxies)
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0] : req.connection.remoteAddress;
  req.realIP = ip;
  
  // Log suspicious IPs
  const suspiciousPatterns = [
    /tor-exit/i,
    /proxy/i,
    /vpn/i,
  ];
  
  const userAgent = req.get('User-Agent') || '';
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(userAgent) || pattern.test(req.headers.host || '')
  );
  
  if (isSuspicious) {
    logWarning('Suspicious request detected', {
      ip: req.realIP,
      userAgent,
      url: req.originalUrl,
      headers: req.headers,
    });
  }
  
  next();
};

export default {
  rateLimitConfigs,
  helmetConfig,
  corsConfig,
  ipWhitelist,
  requestSizeLimiter,
  securityHeaders,
  requestTiming,
  ipTracking,
};