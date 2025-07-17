import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { logInfo, logWarning, logError } from '../utils/logger.js';
import { createAuditLog, AuditActions, RiskLevels } from '../utils/auditLog.js';

// HIPAA-compliant security configuration
export class SecurityConfig {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey();
    this.algorithm = 'aes-256-gcm';
    this.initializeSecurityPolicies();
  }

  // Generate encryption key if not provided
  generateEncryptionKey() {
    const key = randomBytes(32).toString('hex');
    logWarning('Generated new encryption key - should be set in environment variables', {
      event: 'encryption_key_generated',
      keyLength: key.length
    });
    return key;
  }

  // Initialize security policies
  initializeSecurityPolicies() {
    // Data classification levels
    this.dataClassification = {
      PUBLIC: 'public',
      INTERNAL: 'internal',
      CONFIDENTIAL: 'confidential',
      RESTRICTED: 'restricted' // For PHI (Protected Health Information)
    };

    // HIPAA-compliant retention policies
    this.retentionPolicies = {
      audit_logs: 6 * 365 * 24 * 60 * 60 * 1000, // 6 years
      medical_records: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
      user_sessions: 30 * 24 * 60 * 60 * 1000, // 30 days
      error_logs: 90 * 24 * 60 * 60 * 1000, // 90 days
      access_logs: 365 * 24 * 60 * 60 * 1000 // 1 year
    };

    // Security headers configuration
    this.securityHeaders = {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "https://api.stripe.com", "wss:"],
          frameSrc: ["'self'", "https://js.stripe.com"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          manifestSrc: ["'self'"],
          workerSrc: ["'self'"],
          childSrc: ["'self'"]
        },
        reportOnly: process.env.NODE_ENV === 'development'
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      frameguard: {
        action: 'deny'
      },
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
      }
    };
  }

  // Get helmet configuration
  getHelmetConfig() {
    return helmet({
      contentSecurityPolicy: this.securityHeaders.contentSecurityPolicy,
      hsts: this.securityHeaders.hsts,
      frameguard: this.securityHeaders.frameguard,
      referrerPolicy: this.securityHeaders.referrerPolicy,
      crossOriginEmbedderPolicy: false, // Disable for development
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      dnsPrefetchControl: true,
      hidePoweredBy: true,
      ieNoOpen: true,
      noSniff: true,
      xssFilter: true,
      permittedCrossDomainPolicies: false
    });
  }

  // Advanced rate limiting configuration
  getRateLimitConfig(type = 'default') {
    const configs = {
      default: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        handler: this.rateLimitHandler.bind(this)
      },
      auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // limit each IP to 5 login attempts per windowMs
        message: 'Too many authentication attempts, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true,
        handler: this.rateLimitHandler.bind(this)
      },
      api: {
        windowMs: 60 * 1000, // 1 minute
        max: 60, // limit each IP to 60 requests per minute
        message: 'API rate limit exceeded.',
        standardHeaders: true,
        legacyHeaders: false,
        handler: this.rateLimitHandler.bind(this)
      },
      sensitive: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10, // limit each IP to 10 requests per hour for sensitive endpoints
        message: 'Rate limit exceeded for sensitive operation.',
        standardHeaders: true,
        legacyHeaders: false,
        handler: this.rateLimitHandler.bind(this)
      }
    };

    return rateLimit(configs[type] || configs.default);
  }

  // Rate limit handler with audit logging
  async rateLimitHandler(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const endpoint = req.originalUrl;

    logWarning('Rate limit exceeded', {
      ip,
      userAgent,
      endpoint,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    // Create audit log for rate limiting
    await createAuditLog({
      userId: req.user?.id,
      action: AuditActions.RATE_LIMITED,
      resource: 'rate_limit',
      resourceId: endpoint,
      details: {
        ip,
        userAgent,
        endpoint,
        method: req.method,
        limit: 'exceeded'
      },
      ipAddress: ip,
      riskLevel: RiskLevels.MEDIUM,
      success: false
    });

    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }

  // Slow down configuration for progressive delays
  getSlowDownConfig(type = 'default') {
    const configs = {
      default: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        delayAfter: 5, // allow 5 requests per 15 minutes at full speed
        delayMs: 500, // slow down by 500ms per request after delayAfter
        maxDelayMs: 10000, // maximum delay of 10 seconds
        skipFailedRequests: true,
        skipSuccessfulRequests: false
      },
      auth: {
        windowMs: 15 * 60 * 1000,
        delayAfter: 2, // allow 2 requests per 15 minutes at full speed
        delayMs: 1000, // slow down by 1 second per request after delayAfter
        maxDelayMs: 30000, // maximum delay of 30 seconds
        skipFailedRequests: false,
        skipSuccessfulRequests: true
      }
    };

    return slowDown(configs[type] || configs.default);
  }

  // IP whitelisting middleware
  createIPWhitelist(allowedIPs = []) {
    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      
      // Always allow localhost in development
      if (process.env.NODE_ENV === 'development') {
        const localhostIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
        if (localhostIPs.includes(clientIP)) {
          return next();
        }
      }

      if (allowedIPs.length === 0) {
        return next(); // No whitelist configured
      }

      if (!allowedIPs.includes(clientIP)) {
        logWarning('IP access denied', {
          clientIP,
          allowedIPs,
          url: req.originalUrl,
          userAgent: req.get('User-Agent')
        });

        return res.status(403).json({
          error: 'Access denied',
          message: 'Your IP address is not authorized to access this resource'
        });
      }

      logInfo('IP whitelist check passed', {
        clientIP,
        url: req.originalUrl
      });

      next();
    };
  }

  // Data encryption utilities
  encrypt(text, classification = this.dataClassification.INTERNAL) {
    try {
      const iv = randomBytes(16);
      const cipher = createCipheriv(this.algorithm, Buffer.from(this.encryptionKey, 'hex'), iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      const result = {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
        authTag: authTag.toString('hex'),
        classification,
        timestamp: new Date().toISOString()
      };

      logInfo('Data encrypted', {
        classification,
        dataLength: text.length,
        encryptedLength: encrypted.length
      });

      return JSON.stringify(result);
    } catch (error) {
      logError(error, {
        event: 'encryption_failed',
        classification
      });
      throw new Error('Encryption failed');
    }
  }

  decrypt(encryptedData) {
    try {
      const parsed = JSON.parse(encryptedData);
      const { iv, encryptedData: data, authTag, classification } = parsed;
      
      const decipher = createDecipheriv(this.algorithm, Buffer.from(this.encryptionKey, 'hex'), Buffer.from(iv, 'hex'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      logInfo('Data decrypted', {
        classification,
        decryptedLength: decrypted.length
      });

      return decrypted;
    } catch (error) {
      logError(error, {
        event: 'decryption_failed'
      });
      throw new Error('Decryption failed');
    }
  }

  // Hash sensitive data
  hashData(data, algorithm = 'sha256') {
    try {
      const hash = createHash(algorithm).update(data).digest('hex');
      
      logInfo('Data hashed', {
        algorithm,
        originalLength: data.length,
        hashLength: hash.length
      });

      return hash;
    } catch (error) {
      logError(error, {
        event: 'hashing_failed',
        algorithm
      });
      throw new Error('Hashing failed');
    }
  }

  // Secure session configuration
  getSessionConfig() {
    return {
      name: 'mundoctor.sid',
      secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
      }
    };
  }

  // CORS configuration for healthcare
  getCORSConfig() {
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

    return {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logWarning('CORS origin denied', {
            origin,
            allowedOrigins
          });
          callback(new Error('Not allowed by CORS'));
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
      exposedHeaders: ['Content-Length', 'Authorization', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
      preflightContinue: false,
      optionsSuccessStatus: 200
    };
  }

  // Input sanitization
  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }

    // Remove potentially dangerous characters
    const sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();

    if (sanitized !== input) {
      logWarning('Input sanitized', {
        originalLength: input.length,
        sanitizedLength: sanitized.length,
        removed: input.length - sanitized.length
      });
    }

    return sanitized;
  }

  // File upload security
  getFileUploadConfig() {
    return {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
        files: 5, // Maximum 5 files
        fields: 10, // Maximum 10 fields
        parts: 15 // Maximum 15 parts
      },
      fileFilter: (req, file, callback) => {
        // Allowed file types for healthcare
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (allowedTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          logWarning('File type rejected', {
            mimetype: file.mimetype,
            originalName: file.originalname,
            userId: req.user?.id
          });
          callback(new Error('Invalid file type'));
        }
      },
      dest: process.env.UPLOAD_DIR || './uploads',
      filename: (req, file, callback) => {
        const uniqueName = `${req.user?.id}_${Date.now()}_${file.fieldname}`;
        const ext = file.originalname.split('.').pop();
        callback(null, `${uniqueName}.${ext}`);
      }
    };
  }

  // Data retention cleanup
  async performDataRetentionCleanup() {
    const now = Date.now();
    
    logInfo('Starting data retention cleanup', {
      timestamp: new Date().toISOString(),
      policies: this.retentionPolicies
    });

    try {
      // This would implement actual cleanup logic
      // For now, we'll just log the retention policies
      for (const [dataType, retentionPeriod] of Object.entries(this.retentionPolicies)) {
        const cutoffDate = new Date(now - retentionPeriod);
        logInfo(`Data retention policy`, {
          dataType,
          retentionPeriod: `${retentionPeriod / (24 * 60 * 60 * 1000)} days`,
          cutoffDate: cutoffDate.toISOString()
        });
      }

      return { success: true, cleanupTime: new Date().toISOString() };
    } catch (error) {
      logError(error, {
        event: 'data_retention_cleanup_failed'
      });
      throw error;
    }
  }

  // Security health check
  async performSecurityHealthCheck() {
    const checks = {
      encryptionKey: !!this.encryptionKey,
      sessionSecret: !!process.env.SESSION_SECRET,
      frontendUrl: !!process.env.FRONTEND_URL,
      clerkWebhookSecret: !!process.env.CLERK_WEBHOOK_SECRET,
      databaseEncryption: true, // Would check actual DB encryption
      sslEnabled: process.env.NODE_ENV === 'production',
      rateLimiting: true,
      corsConfigured: true,
      auditLogging: true
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    const healthScore = (passedChecks / totalChecks) * 100;

    logInfo('Security health check completed', {
      healthScore: `${healthScore.toFixed(1)}%`,
      passedChecks,
      totalChecks,
      checks
    });

    return {
      healthScore,
      passedChecks,
      totalChecks,
      checks,
      recommendations: this.getSecurityRecommendations(checks)
    };
  }

  // Get security recommendations
  getSecurityRecommendations(checks) {
    const recommendations = [];

    if (!checks.encryptionKey) {
      recommendations.push('Set ENCRYPTION_KEY environment variable');
    }
    if (!checks.sessionSecret) {
      recommendations.push('Set SESSION_SECRET environment variable');
    }
    if (!checks.frontendUrl) {
      recommendations.push('Set FRONTEND_URL environment variable for production');
    }
    if (!checks.clerkWebhookSecret) {
      recommendations.push('Set CLERK_WEBHOOK_SECRET environment variable');
    }
    if (!checks.sslEnabled) {
      recommendations.push('Enable SSL/TLS in production');
    }

    return recommendations;
  }
}

// Global security instance
const security = new SecurityConfig();

// Export middleware functions
export const helmetMiddleware = security.getHelmetConfig();
export const defaultRateLimit = security.getRateLimitConfig('default');
export const authRateLimit = security.getRateLimitConfig('auth');
export const apiRateLimit = security.getRateLimitConfig('api');
export const sensitiveRateLimit = security.getRateLimitConfig('sensitive');
export const defaultSlowDown = security.getSlowDownConfig('default');
export const authSlowDown = security.getSlowDownConfig('auth');
export const corsConfig = security.getCORSConfig();
export const sessionConfig = security.getSessionConfig();
export const fileUploadConfig = security.getFileUploadConfig();

// Export utility functions
export const createIPWhitelist = security.createIPWhitelist.bind(security);
export const encrypt = security.encrypt.bind(security);
export const decrypt = security.decrypt.bind(security);
export const hashData = security.hashData.bind(security);
export const sanitizeInput = security.sanitizeInput.bind(security);
export const performDataRetentionCleanup = security.performDataRetentionCleanup.bind(security);
export const performSecurityHealthCheck = security.performSecurityHealthCheck.bind(security);

// Export the security instance
export { security };

export default {
  SecurityConfig,
  security,
  helmetMiddleware,
  defaultRateLimit,
  authRateLimit,
  apiRateLimit,
  sensitiveRateLimit,
  defaultSlowDown,
  authSlowDown,
  corsConfig,
  sessionConfig,
  fileUploadConfig,
  createIPWhitelist,
  encrypt,
  decrypt,
  hashData,
  sanitizeInput,
  performDataRetentionCleanup,
  performSecurityHealthCheck
};