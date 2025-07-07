import rateLimit from 'express-rate-limit';
import { RateLimitError } from './errorHandler.js';
import { logWarning, logError } from '../utils/logger.js';

// Store for tracking rate limit violations
const violationStore = new Map();

// Clean up old violations every hour
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [ip, data] of violationStore) {
    if (data.firstViolation < oneHourAgo) {
      violationStore.delete(ip);
    }
  }
}, 60 * 60 * 1000);

// Custom rate limit handler
const createRateLimitHandler = (limitType) => {
  return (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const now = Date.now();
    
    // Track violations
    if (!violationStore.has(ip)) {
      violationStore.set(ip, {
        count: 1,
        firstViolation: now,
        lastViolation: now,
        limitType,
      });
    } else {
      const data = violationStore.get(ip);
      data.count++;
      data.lastViolation = now;
      data.limitType = limitType;
    }

    const violationData = violationStore.get(ip);

    // Log warning for repeated violations
    if (violationData.count > 5) {
      logError(new Error('Persistent rate limit violations'), {
        ip,
        userAgent,
        limitType,
        violationCount: violationData.count,
        timeSpan: now - violationData.firstViolation,
        url: req.originalUrl,
      });
    } else {
      logWarning('Rate limit exceeded', {
        ip,
        userAgent,
        limitType,
        violationCount: violationData.count,
        url: req.originalUrl,
      });
    }

    throw new RateLimitError(`Too many ${limitType} requests, please try again later`);
  };
};

// Get client IP considering proxies
const getClientIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.connection.remoteAddress || req.socket.remoteAddress;
};

// Custom key generator that considers user ID if authenticated
const createKeyGenerator = (useUserID = false) => {
  return (req) => {
    const ip = getClientIP(req);
    if (useUserID && req.auth?.userId) {
      return `${req.auth.userId}:${ip}`;
    }
    return ip;
  };
};

// Skip function for successful requests (only count failures)
const skipSuccessfulRequests = (req, res) => {
  return res.statusCode < 400;
};

// General API rate limiter
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_GENERAL) || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: createKeyGenerator(false),
  handler: createRateLimitHandler('general'),
});

// Strict rate limiter for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH) || 5,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes',
  },
  skipSuccessfulRequests: true, // Only count failed attempts
  keyGenerator: createKeyGenerator(false),
  handler: createRateLimitHandler('authentication'),
});

// File upload rate limiter
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.RATE_LIMIT_UPLOAD) || 10,
  message: {
    success: false,
    message: 'Too many file uploads, please try again later.',
    retryAfter: '1 hour',
  },
  keyGenerator: createKeyGenerator(true), // Use user ID for uploads
  handler: createRateLimitHandler('upload'),
});

// Password reset rate limiter
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.RATE_LIMIT_PASSWORD_RESET) || 3,
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later.',
    retryAfter: '1 hour',
  },
  keyGenerator: createKeyGenerator(false),
  handler: createRateLimitHandler('password_reset'),
});

// Email sending rate limiter
export const emailRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.RATE_LIMIT_EMAIL) || 5,
  message: {
    success: false,
    message: 'Too many emails sent, please try again later.',
    retryAfter: '1 hour',
  },
  keyGenerator: createKeyGenerator(true),
  handler: createRateLimitHandler('email'),
});

// Search rate limiter (for expensive search operations)
export const searchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_SEARCH) || 20,
  message: {
    success: false,
    message: 'Too many search requests, please slow down.',
    retryAfter: '1 minute',
  },
  keyGenerator: createKeyGenerator(true),
  handler: createRateLimitHandler('search'),
});

// API creation rate limiter (for POST/PUT/DELETE operations)
export const creationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_CREATION) || 10,
  message: {
    success: false,
    message: 'Too many creation requests, please slow down.',
    retryAfter: '1 minute',
  },
  keyGenerator: createKeyGenerator(true),
  handler: createRateLimitHandler('creation'),
});

// Webhook rate limiter (for external webhook endpoints)
export const webhookRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_WEBHOOK) || 50,
  message: {
    success: false,
    message: 'Webhook rate limit exceeded.',
    retryAfter: '1 minute',
  },
  keyGenerator: (req) => {
    // For webhooks, use a combination of IP and user agent
    const ip = getClientIP(req);
    const userAgent = req.get('User-Agent') || 'unknown';
    return `webhook:${ip}:${userAgent}`;
  },
  handler: createRateLimitHandler('webhook'),
});

// Admin operations rate limiter
export const adminRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_ADMIN) || 30,
  message: {
    success: false,
    message: 'Too many admin requests, please slow down.',
    retryAfter: '1 minute',
  },
  keyGenerator: createKeyGenerator(true),
  handler: createRateLimitHandler('admin'),
});

// Get violation statistics (for monitoring)
export const getViolationStats = () => {
  const stats = {
    totalViolations: violationStore.size,
    violationsByType: {},
    topViolators: [],
  };

  // Count violations by type
  for (const [ip, data] of violationStore) {
    if (!stats.violationsByType[data.limitType]) {
      stats.violationsByType[data.limitType] = 0;
    }
    stats.violationsByType[data.limitType]++;
  }

  // Get top violators
  stats.topViolators = Array.from(violationStore.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([ip, data]) => ({
      ip,
      count: data.count,
      limitType: data.limitType,
      firstViolation: new Date(data.firstViolation).toISOString(),
      lastViolation: new Date(data.lastViolation).toISOString(),
    }));

  return stats;
};

// Clear violations for an IP (admin function)
export const clearViolations = (ip) => {
  const deleted = violationStore.delete(ip);
  if (deleted) {
    logWarning('Rate limit violations cleared for IP', { ip });
  }
  return deleted;
};

export default {
  generalRateLimit,
  authRateLimit,
  uploadRateLimit,
  passwordResetRateLimit,
  emailRateLimit,
  searchRateLimit,
  creationRateLimit,
  webhookRateLimit,
  adminRateLimit,
  getViolationStats,
  clearViolations,
};