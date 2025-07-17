import { logError } from '../utils/logger.js';
import { 
  errorResponse, 
  internalServerErrorResponse, 
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  validationErrorResponse,
  tooManyRequestsResponse,
} from '../utils/responses.js';

// Custom error classes
export class AppError extends Error {
  constructor(message, statusCode = 500, code = null, metadata = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.metadata = metadata;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 422, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

// Database error handler
const handleDatabaseError = (error) => {
  // PostgreSQL specific error codes
  switch (error.code) {
    case '23505': // Unique violation
      return new ConflictError('Resource already exists');
    case '23503': // Foreign key violation
      return new BadRequestError('Invalid reference to related resource');
    case '23502': // Not null violation
      return new BadRequestError('Required field is missing');
    case '23514': // Check violation
      return new BadRequestError('Data violates business rules');
    case '42P01': // Undefined table
      return new AppError('Database configuration error', 500, 'DB_CONFIG_ERROR');
    case '42703': // Undefined column
      return new AppError('Database schema error', 500, 'DB_SCHEMA_ERROR');
    case '08006': // Connection failure
    case '08001': // Unable to connect
      return new AppError('Database connection error', 503, 'DB_CONNECTION_ERROR');
    case '53300': // Too many connections
      return new AppError('Database overloaded', 503, 'DB_OVERLOAD_ERROR');
    default:
      if (error.message?.includes('duplicate key')) {
        return new ConflictError('Resource already exists');
      }
      return new AppError('Database operation failed', 500, 'DB_ERROR', {
        originalCode: error.code,
        originalMessage: error.message,
      });
  }
};

// Clerk error handler
const handleClerkError = (error) => {
  if (error.name === 'ClerkAPIError') {
    switch (error.status) {
      case 401:
        return new AuthenticationError('Invalid or expired authentication token');
      case 403:
        return new AuthorizationError('Insufficient permissions');
      case 404:
        return new NotFoundError('User not found');
      case 429:
        return new RateLimitError('Authentication rate limit exceeded');
      default:
        return new AppError('Authentication service error', error.status || 500, 'CLERK_ERROR');
    }
  }
  return new AuthenticationError('Authentication failed');
};

// Express-validator error handler
const handleExpressValidatorError = (error) => {
  if (error.array && typeof error.array === 'function') {
    const errors = error.array().map(err => ({
      field: err.param || err.path,
      message: err.msg,
      value: err.value,
    }));
    return new ValidationError('Validation failed', errors);
  }
  return new ValidationError('Invalid input data');
};

// Main error handling middleware
export const errorHandler = (error, req, res, next) => {
  let err = { ...error };
  err.message = error.message;

  // Log the original error
  logError(error, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.auth?.userId,
  });

  // Handle different types of errors
  if (error.code && typeof error.code === 'string' && error.code.match(/^[0-9A-Z]{5}$/)) {
    // PostgreSQL error
    err = handleDatabaseError(error);
  } else if (error.name === 'ClerkAPIError' || error.message?.includes('clerk')) {
    // Clerk authentication error
    err = handleClerkError(error);
  } else if (error.array && typeof error.array === 'function') {
    // Express-validator error
    err = handleExpressValidatorError(error);
  } else if (error.name === 'CastError') {
    // Invalid ID format
    err = new BadRequestError('Invalid resource ID format');
  } else if (error.name === 'JsonWebTokenError') {
    // JWT error
    err = new AuthenticationError('Invalid authentication token');
  } else if (error.name === 'TokenExpiredError') {
    // JWT expired
    err = new AuthenticationError('Authentication token has expired');
  } else if (error.name === 'MulterError') {
    // File upload error
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        err = new BadRequestError('File size too large');
        break;
      case 'LIMIT_FILE_COUNT':
        err = new BadRequestError('Too many files uploaded');
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        err = new BadRequestError('Unexpected file field');
        break;
      default:
        err = new BadRequestError('File upload error');
    }
  }

  // Send appropriate response based on error type
  if (err instanceof ValidationError) {
    return validationErrorResponse(res, err.errors, err.message);
  } else if (err instanceof AuthenticationError) {
    return unauthorizedResponse(res, err.message, err);
  } else if (err instanceof AuthorizationError) {
    return forbiddenResponse(res, err.message, err);
  } else if (err instanceof NotFoundError) {
    return notFoundResponse(res, err.message, err);
  } else if (err instanceof ConflictError) {
    return conflictResponse(res, err.message, err);
  } else if (err instanceof RateLimitError) {
    return tooManyRequestsResponse(res, err.message, err.metadata);
  } else if (err instanceof AppError) {
    return errorResponse(res, err.message, err.statusCode, err, err.metadata);
  } else {
    // Handle unknown errors
    const message = process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : error.message || 'Internal server error';
    
    return internalServerErrorResponse(res, message, error);
  }
};

// 404 Not Found handler
export const notFoundHandler = (req, res) => {
  return notFoundResponse(res, `Route ${req.originalUrl} not found`);
};

// Async error wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global exception handlers
export const setupGlobalErrorHandlers = () => {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logError(error, { type: 'uncaughtException' });
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logError(new Error('Unhandled Rejection'), { 
      type: 'unhandledRejection', 
      reason: reason?.toString(), 
      promise 
    });
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  // Handle SIGTERM
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
  });

  // Handle SIGINT
  process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
  });
};

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  setupGlobalErrorHandlers,
};