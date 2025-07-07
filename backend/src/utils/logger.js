import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    return `${timestamp} [${level}]: ${message} ${
      Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : ''
    }`;
  })
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format,
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  }),
  // File transport for errors
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  levels,
  transports,
  // Don't exit on error
  exitOnError: false,
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
  ],
});

// Stream for Morgan HTTP logging
export const stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Helper functions
export const logError = (error, context = {}) => {
  logger.error(error.message || error, {
    stack: error.stack,
    ...context,
  });
};

export const logInfo = (message, context = {}) => {
  logger.info(message, context);
};

export const logWarning = (message, context = {}) => {
  logger.warn(message, context);
};

export const logDebug = (message, context = {}) => {
  logger.debug(message, context);
};

export const logHttp = (message, context = {}) => {
  logger.http(message, context);
};

export default logger;