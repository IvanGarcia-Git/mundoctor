import winston from 'winston';
import path from 'path';

/**
 * Sistema de logging estructurado mejorado para la aplicación
 */

// Niveles de log con trace añadido
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  trace: 5
};

// Colores para cada nivel
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  trace: 'gray'
};

winston.addColors(colors);

// Formato estructurado para logs
const structuredFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, service, correlationId, userId, ...meta } = info;
    
    const logEntry = {
      timestamp,
      level,
      message,
      service: service || 'mundoctor-backend',
      environment: process.env.NODE_ENV || 'development'
    };

    // Añadir correlation ID si está disponible
    if (correlationId) {
      logEntry.correlationId = correlationId;
    }

    // Añadir user ID si está disponible
    if (userId) {
      logEntry.userId = userId;
    }

    // Añadir metadata adicional
    if (Object.keys(meta).length > 0) {
      logEntry.meta = meta;
    }

    return JSON.stringify(logEntry);
  })
);

// Formato para consola en desarrollo
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf((info) => {
    const { timestamp, level, message, correlationId, userId, ...meta } = info;
    
    let logMessage = `${timestamp} [${level}]: ${message}`;
    
    if (correlationId) {
      logMessage += ` [${correlationId}]`;
    }
    
    if (userId) {
      logMessage += ` [user:${userId}]`;
    }

    if (Object.keys(meta).length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }

    return logMessage;
  })
);

// Configuración de transports mejorada
const getTransports = () => {
  const transports = [];
  const environment = process.env.NODE_ENV || 'development';

  // Console transport
  transports.push(
    new winston.transports.Console({
      level: environment === 'production' ? 'info' : 'debug',
      format: environment === 'production' ? structuredFormat : consoleFormat,
      handleExceptions: true,
      handleRejections: true
    })
  );

  // File transports para producción
  if (environment === 'production' || environment === 'staging') {
    // Logs de aplicación
    transports.push(
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'app.log'),
        level: 'info',
        format: structuredFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
      })
    );

    // Logs de errores
    transports.push(
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'error.log'),
        level: 'error',
        format: structuredFormat,
        maxsize: 10 * 1024 * 1024,
        maxFiles: 5,
        tailable: true
      })
    );

    // Logs de HTTP
    transports.push(
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'http.log'),
        level: 'http',
        format: structuredFormat,
        maxsize: 50 * 1024 * 1024, // 50MB
        maxFiles: 3,
        tailable: true
      })
    );
  } else {
    // Archivos simplificados para desarrollo
    transports.push(
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'combined.log'),
        format: structuredFormat
      })
    );
  }

  return transports;
};

// Crear logger principal
const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: structuredFormat,
  transports: getTransports(),
  exitOnError: false,
  // Manejo de excepciones
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
      format: structuredFormat
    })
  ],
  // Manejo de rechazos de promesas
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log'),
      format: structuredFormat
    })
  ]
});

/**
 * Clase para logging estructurado avanzado
 */
class StructuredLogger {
  constructor(service = 'mundoctor-backend') {
    this.service = service;
    this.correlationId = null;
    this.userId = null;
    this.context = {};
  }

  setCorrelationId(correlationId) {
    this.correlationId = correlationId;
    return this;
  }

  setUserId(userId) {
    this.userId = userId;
    return this;
  }

  setContext(context) {
    this.context = { ...this.context, ...context };
    return this;
  }

  clearContext() {
    this.correlationId = null;
    this.userId = null;
    this.context = {};
    return this;
  }

  createLogEntry(level, message, meta = {}) {
    return logger.log(level, message, {
      service: this.service,
      correlationId: this.correlationId,
      userId: this.userId,
      ...this.context,
      ...meta
    });
  }

  error(message, error = null, meta = {}) {
    const logMeta = { ...meta };
    
    if (error) {
      logMeta.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        status: error.status
      };
    }

    return this.createLogEntry('error', message, logMeta);
  }

  warn(message, meta = {}) {
    return this.createLogEntry('warn', message, meta);
  }

  info(message, meta = {}) {
    return this.createLogEntry('info', message, meta);
  }

  http(message, meta = {}) {
    return this.createLogEntry('http', message, meta);
  }

  debug(message, meta = {}) {
    return this.createLogEntry('debug', message, meta);
  }

  trace(message, meta = {}) {
    return this.createLogEntry('trace', message, meta);
  }

  // Métodos especializados
  logRequest(req, res, responseTime) {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      contentLength: res.get('Content-Length') || 0
    };

    if (req.user) {
      logData.userId = req.user.id;
      logData.userRole = req.user.role;
    }

    let level = 'http';
    if (res.statusCode >= 400) level = 'warn';
    if (res.statusCode >= 500) level = 'error';

    return this.createLogEntry(level, `${req.method} ${req.originalUrl}`, logData);
  }

  logDatabase(operation, table, duration, success = true, error = null) {
    const logData = {
      operation,
      table,
      duration: `${duration}ms`,
      success
    };

    if (error) {
      logData.error = {
        message: error.message,
        code: error.code
      };
    }

    const level = success ? 'debug' : 'error';
    return this.createLogEntry(level, `Database ${operation} on ${table}`, logData);
  }

  logAuth(action, success, userId = null, details = {}) {
    const logData = {
      action,
      success,
      userId,
      ...details
    };

    const level = success ? 'info' : 'warn';
    return this.createLogEntry(level, `Auth ${action} ${success ? 'successful' : 'failed'}`, logData);
  }

  logBusinessEvent(event, userId, data = {}) {
    return this.createLogEntry('info', `Business event: ${event}`, {
      event,
      userId,
      data
    });
  }

  logPerformance(operation, duration, threshold = 1000) {
    const logData = {
      operation,
      duration: `${duration}ms`,
      threshold: `${threshold}ms`,
      slow: duration > threshold
    };

    const level = duration > threshold ? 'warn' : 'debug';
    return this.createLogEntry(level, `Performance: ${operation}`, logData);
  }
}

// Middleware para logging de requests HTTP
export function httpLoggingMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Generar correlation ID
  const correlationId = req.headers['x-correlation-id'] || 
                       `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Crear logger con contexto
  const requestLogger = new StructuredLogger()
    .setCorrelationId(correlationId)
    .setContext({
      method: req.method,
      url: req.originalUrl,
      ip: req.ip
    });

  req.logger = requestLogger;

  // Interceptar respuesta
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - startTime;
    requestLogger.logRequest(req, res, responseTime);
    originalEnd.call(this, chunk, encoding);
  };

  next();
}

// Middleware para logging de errores
export function errorLoggingMiddleware(error, req, res, next) {
  const logger = req.logger || new StructuredLogger();
  
  logger.error('Unhandled error in request', error, {
    method: req.method,
    url: req.originalUrl,
    statusCode: error.status || 500,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  next(error);
}

// Stream para Morgan (compatibilidad)
export const stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Funciones helper existentes (mejoradas)
export const logError = (error, context = {}) => {
  const structuredLogger = new StructuredLogger();
  structuredLogger.error(error.message || error, error, context);
};

export const logInfo = (message, context = {}) => {
  const structuredLogger = new StructuredLogger();
  structuredLogger.info(message, context);
};

export const logWarning = (message, context = {}) => {
  const structuredLogger = new StructuredLogger();
  structuredLogger.warn(message, context);
};

export const logDebug = (message, context = {}) => {
  const structuredLogger = new StructuredLogger();
  structuredLogger.debug(message, context);
};

export const logHttp = (message, context = {}) => {
  const structuredLogger = new StructuredLogger();
  structuredLogger.http(message, context);
};

// Wrapper para operaciones con logging automático
export function withLogging(operation, operationName, logger = null) {
  return async (...args) => {
    const logInstance = logger || new StructuredLogger();
    const startTime = Date.now();
    
    try {
      logInstance.debug(`Starting operation: ${operationName}`);
      
      const result = await operation(...args);
      const duration = Date.now() - startTime;
      
      logInstance.logPerformance(operationName, duration);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logInstance.error(`Operation failed: ${operationName}`, error, {
        duration: `${duration}ms`,
        args: args.length
      });
      
      throw error;
    }
  };
}

// Crear loggers para módulos específicos
export function createModuleLogger(moduleName) {
  return new StructuredLogger(moduleName);
}

// Loggers predefinidos
export const loggers = {
  app: createModuleLogger('app'),
  auth: createModuleLogger('auth'),
  database: createModuleLogger('database'),
  cache: createModuleLogger('cache'),
  api: createModuleLogger('api'),
  business: createModuleLogger('business'),
  monitoring: createModuleLogger('monitoring')
};

// Exportar clase para uso avanzado
export { StructuredLogger };

export default logger;