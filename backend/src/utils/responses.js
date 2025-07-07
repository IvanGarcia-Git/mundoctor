import { logError, logInfo } from './logger.js';

// Standard response structure
export const createResponse = (success, data = null, message = null, metadata = null) => {
  const response = {
    success,
    timestamp: new Date().toISOString(),
  };

  if (data !== null) {
    response.data = data;
  }

  if (message !== null) {
    response.message = message;
  }

  if (metadata !== null) {
    response.metadata = metadata;
  }

  return response;
};

// Success responses
export const successResponse = (res, data = null, message = null, statusCode = 200, metadata = null) => {
  const response = createResponse(true, data, message, metadata);
  logInfo(`Success response: ${message || 'Operation completed successfully'}`, { 
    statusCode, 
    hasData: data !== null 
  });
  return res.status(statusCode).json(response);
};

export const createdResponse = (res, data, message = 'Resource created successfully', metadata = null) => {
  return successResponse(res, data, message, 201, metadata);
};

export const noContentResponse = (res, message = 'Operation completed successfully') => {
  logInfo(`No content response: ${message}`);
  return res.status(204).json(createResponse(true, null, message));
};

// Error responses
export const errorResponse = (res, message, statusCode = 500, error = null, metadata = null) => {
  const response = createResponse(false, null, message, metadata);
  
  if (error && process.env.NODE_ENV === 'development') {
    response.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  logError(error || new Error(message), { 
    statusCode, 
    message, 
    metadata 
  });

  return res.status(statusCode).json(response);
};

export const badRequestResponse = (res, message = 'Bad request', error = null, metadata = null) => {
  return errorResponse(res, message, 400, error, metadata);
};

export const unauthorizedResponse = (res, message = 'Unauthorized', error = null, metadata = null) => {
  return errorResponse(res, message, 401, error, metadata);
};

export const forbiddenResponse = (res, message = 'Forbidden', error = null, metadata = null) => {
  return errorResponse(res, message, 403, error, metadata);
};

export const notFoundResponse = (res, message = 'Resource not found', error = null, metadata = null) => {
  return errorResponse(res, message, 404, error, metadata);
};

export const conflictResponse = (res, message = 'Conflict', error = null, metadata = null) => {
  return errorResponse(res, message, 409, error, metadata);
};

export const validationErrorResponse = (res, errors, message = 'Validation failed') => {
  const response = createResponse(false, null, message, { validationErrors: errors });
  logError(new Error(message), { validationErrors: errors });
  return res.status(422).json(response);
};

export const tooManyRequestsResponse = (res, message = 'Too many requests', metadata = null) => {
  return errorResponse(res, message, 429, null, metadata);
};

export const internalServerErrorResponse = (res, message = 'Internal server error', error = null, metadata = null) => {
  return errorResponse(res, message, 500, error, metadata);
};

export const serviceUnavailableResponse = (res, message = 'Service unavailable', error = null, metadata = null) => {
  return errorResponse(res, message, 503, error, metadata);
};

// Pagination helpers
export const paginatedResponse = (res, data, pagination, message = 'Data retrieved successfully') => {
  const metadata = {
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrev: pagination.page > 1,
    },
  };

  return successResponse(res, data, message, 200, metadata);
};

// Health check response
export const healthCheckResponse = (res, checks = {}) => {
  const isHealthy = Object.values(checks).every(check => check.status === 'healthy');
  
  const response = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    checks,
  };

  const statusCode = isHealthy ? 200 : 503;
  logInfo(`Health check: ${response.status}`, { checks });
  
  return res.status(statusCode).json(response);
};

// Export all response functions as a single object for easier importing
export default {
  createResponse,
  successResponse,
  createdResponse,
  noContentResponse,
  errorResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  validationErrorResponse,
  tooManyRequestsResponse,
  internalServerErrorResponse,
  serviceUnavailableResponse,
  paginatedResponse,
  healthCheckResponse,
};