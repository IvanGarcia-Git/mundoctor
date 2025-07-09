const rateLimit = require('express-rate-limit');
const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const cacheService = require('../services/cacheService');
const redisConfig = require('../config/redis');

/**
 * Configuraciones de rate limiting para diferentes endpoints
 */
const rateLimitConfigs = {
  // Rate limiting general para APIs
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // 1000 requests por ventana
    message: {
      success: false,
      error: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
  },

  // Rate limiting para autenticación
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // 10 intentos de login por IP
    skipSuccessfulRequests: true,
    message: {
      success: false,
      error: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.',
      retryAfter: '15 minutes'
    }
  },

  // Rate limiting para búsquedas
  search: {
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 30, // 30 búsquedas por minuto
    message: {
      success: false,
      error: 'Demasiadas búsquedas. Intenta de nuevo en 1 minuto.',
      retryAfter: '1 minute'
    }
  },

  // Rate limiting para APIs de creación/modificación
  mutation: {
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 20, // 20 modificaciones por minuto
    message: {
      success: false,
      error: 'Demasiadas modificaciones. Intenta de nuevo en 1 minuto.',
      retryAfter: '1 minute'
    }
  },

  // Rate limiting estricto para endpoints sensibles
  strict: {
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 5, // 5 requests por minuto
    message: {
      success: false,
      error: 'Límite de solicitudes excedido para esta operación sensible.',
      retryAfter: '1 minute'
    }
  }
};

/**
 * Crear rate limiter usando Redis o memoria como fallback
 */
class AdaptiveRateLimiter {
  constructor() {
    this.redisLimiter = null;
    this.memoryLimiter = null;
    this.usingRedis = false;
    this.init();
  }

  async init() {
    try {
      if (redisConfig.isReady()) {
        this.redisLimiter = new RateLimiterRedis({
          storeClient: redisConfig.getClient(),
          keyPrefix: 'rate_limit',
          execEvenly: true // Distribuir requests uniformemente en la ventana
        });
        this.usingRedis = true;
        console.log('Rate limiter usando Redis');
      } else {
        throw new Error('Redis no disponible');
      }
    } catch (error) {
      console.warn('Fallback a rate limiter en memoria:', error.message);
      this.memoryLimiter = new RateLimiterMemory({
        keyPrefix: 'rate_limit',
        execEvenly: true
      });
      this.usingRedis = false;
    }
  }

  getLimiter() {
    return this.usingRedis ? this.redisLimiter : this.memoryLimiter;
  }

  isUsingRedis() {
    return this.usingRedis;
  }
}

const adaptiveLimiter = new AdaptiveRateLimiter();

/**
 * Middleware de rate limiting por usuario con Redis
 * @param {Object} options - Configuración del rate limiter
 * @returns {Function} - Middleware function
 */
function createUserRateLimit(options = {}) {
  const config = {
    points: options.max || 100, // Número de requests
    duration: Math.floor((options.windowMs || 60000) / 1000), // Ventana en segundos
    blockDuration: Math.floor((options.windowMs || 60000) / 1000), // Tiempo de bloqueo
    ...options
  };

  return async (req, res, next) => {
    try {
      // Determinar la clave del usuario (usuario autenticado o IP)
      const userId = req.user?.id || req.user?.clerk_id;
      const userKey = userId ? `user:${userId}` : `ip:${req.ip}`;
      
      const limiter = adaptiveLimiter.getLimiter();
      
      if (!limiter) {
        // Si no hay limiter disponible, permitir la request
        return next();
      }

      // Configurar el limiter con las opciones
      limiter.points = config.points;
      limiter.duration = config.duration;
      limiter.blockDuration = config.blockDuration;

      // Intentar consumir un punto
      const result = await limiter.consume(userKey);

      // Añadir headers informativos
      res.set({
        'X-RateLimit-Limit': config.points,
        'X-RateLimit-Remaining': result.remainingPoints,
        'X-RateLimit-Reset': new Date(Date.now() + result.msBeforeNext),
        'X-RateLimit-Used': config.points - result.remainingPoints
      });

      next();
    } catch (rejRes) {
      // Rate limit excedido
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      
      res.set({
        'X-RateLimit-Limit': config.points,
        'X-RateLimit-Remaining': 0,
        'X-RateLimit-Reset': new Date(Date.now() + rejRes.msBeforeNext),
        'Retry-After': secs
      });

      res.status(429).json({
        success: false,
        error: options.message?.error || 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
        retryAfter: `${secs} seconds`,
        limit: config.points,
        windowMs: config.duration * 1000
      });
    }
  };
}

/**
 * Rate limiters específicos para diferentes tipos de endpoints
 */
const rateLimiters = {
  // General para todas las APIs
  general: createUserRateLimit({
    max: 1000,
    windowMs: 15 * 60 * 1000, // 15 minutos
    message: rateLimitConfigs.general.message
  }),

  // Para endpoints de autenticación
  auth: createUserRateLimit({
    max: 10,
    windowMs: 15 * 60 * 1000, // 15 minutos
    message: rateLimitConfigs.auth.message
  }),

  // Para búsquedas
  search: createUserRateLimit({
    max: 60,
    windowMs: 1 * 60 * 1000, // 1 minuto
    message: rateLimitConfigs.search.message
  }),

  // Para operaciones de creación/modificación
  mutation: createUserRateLimit({
    max: 30,
    windowMs: 1 * 60 * 1000, // 1 minuto
    message: rateLimitConfigs.mutation.message
  }),

  // Para endpoints sensibles
  strict: createUserRateLimit({
    max: 5,
    windowMs: 1 * 60 * 1000, // 1 minuto
    message: rateLimitConfigs.strict.message
  }),

  // Para uploads de archivos
  upload: createUserRateLimit({
    max: 10,
    windowMs: 5 * 60 * 1000, // 5 minutos
    message: {
      success: false,
      error: 'Demasiados uploads. Intenta de nuevo en 5 minutos.',
      retryAfter: '5 minutes'
    }
  })
};

/**
 * Rate limiter por endpoint específico
 * @param {string} endpoint - Nombre del endpoint
 * @param {Object} options - Configuración específica
 * @returns {Function} - Middleware function
 */
function createEndpointRateLimit(endpoint, options = {}) {
  const config = {
    max: options.max || 50,
    windowMs: options.windowMs || 60000,
    ...options
  };

  return async (req, res, next) => {
    try {
      const userId = req.user?.id || req.user?.clerk_id;
      const userKey = userId ? `user:${userId}:${endpoint}` : `ip:${req.ip}:${endpoint}`;
      
      // Usar el servicio de caché para rate limiting simple
      const currentCount = await cacheService.incr(userKey, Math.floor(config.windowMs / 1000));
      
      if (currentCount > config.max) {
        return res.status(429).json({
          success: false,
          error: `Demasiadas solicitudes a ${endpoint}. Intenta de nuevo más tarde.`,
          limit: config.max,
          current: currentCount,
          windowMs: config.windowMs
        });
      }

      // Añadir headers informativos
      res.set({
        'X-RateLimit-Limit': config.max,
        'X-RateLimit-Remaining': Math.max(0, config.max - currentCount),
        'X-RateLimit-Endpoint': endpoint
      });

      next();
    } catch (error) {
      console.error('Error en rate limiting:', error);
      // En caso de error, permitir la request
      next();
    }
  };
}

/**
 * Middleware para rate limiting dinámico basado en el tipo de usuario
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
function dynamicRateLimit(req, res, next) {
  const user = req.user;
  
  if (!user) {
    // Usuario no autenticado - límites más estrictos
    return rateLimiters.strict(req, res, next);
  }

  // Ajustar límites según el rol del usuario
  switch (user.role) {
    case 'admin':
      // Administradores tienen límites más altos
      return createUserRateLimit({
        max: 5000,
        windowMs: 15 * 60 * 1000
      })(req, res, next);
      
    case 'professional':
      // Profesionales tienen límites moderados
      return createUserRateLimit({
        max: 2000,
        windowMs: 15 * 60 * 1000
      })(req, res, next);
      
    case 'patient':
    default:
      // Pacientes tienen límites estándar
      return rateLimiters.general(req, res, next);
  }
}

/**
 * Obtener estadísticas de rate limiting
 * @param {string} userId - ID del usuario (opcional)
 * @returns {Promise<Object>} - Estadísticas
 */
async function getRateLimitStats(userId = null) {
  try {
    if (userId) {
      // Estadísticas para un usuario específico
      const userKey = `user:${userId}`;
      const limiter = adaptiveLimiter.getLimiter();
      
      if (limiter && adaptiveLimiter.isUsingRedis()) {
        const result = await limiter.get(userKey);
        return {
          userId,
          remainingPoints: result?.remainingPoints || 0,
          msBeforeNext: result?.msBeforeNext || 0,
          totalHits: result?.totalHits || 0
        };
      }
    }

    // Estadísticas generales
    return {
      limiterType: adaptiveLimiter.isUsingRedis() ? 'redis' : 'memory',
      available: adaptiveLimiter.getLimiter() !== null
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas de rate limiting:', error);
    return { error: error.message };
  }
}

/**
 * Limpiar rate limits para un usuario (útil para testing o admin)
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>} - Éxito de la operación
 */
async function clearUserRateLimit(userId) {
  try {
    const pattern = `rate_limit:user:${userId}*`;
    const cleared = await cacheService.delPattern(pattern);
    return cleared > 0;
  } catch (error) {
    console.error('Error limpiando rate limits:', error);
    return false;
  }
}

module.exports = {
  rateLimiters,
  createUserRateLimit,
  createEndpointRateLimit,
  dynamicRateLimit,
  getRateLimitStats,
  clearUserRateLimit,
  AdaptiveRateLimiter
};