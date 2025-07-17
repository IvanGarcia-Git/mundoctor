const monitoringService = require('../services/monitoringService');

/**
 * Utilidades para métricas y monitoreo
 */

/**
 * Middleware para capturar métricas de requests HTTP
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
function metricsMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Interceptar el final de la respuesta
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - startTime;
    
    // Registrar la métrica
    monitoringService.recordRequest(req, res, responseTime);
    
    // Llamar al método original
    originalEnd.call(this, chunk, encoding);
  };

  next();
}

/**
 * Wrapper para operaciones de base de datos con métricas
 * @param {Function} dbOperation - Función que ejecuta la operación de DB
 * @param {string} operationType - Tipo de operación (select, insert, update, delete)
 * @returns {Promise} - Resultado de la operación
 */
async function withDatabaseMetrics(dbOperation, operationType = 'query') {
  const startTime = Date.now();
  
  try {
    const result = await dbOperation();
    const queryTime = Date.now() - startTime;
    
    monitoringService.recordDatabaseOperation(queryTime, true);
    
    return result;
  } catch (error) {
    const queryTime = Date.now() - startTime;
    
    monitoringService.recordDatabaseOperation(queryTime, false);
    monitoringService.recordError('database_error', {
      operationType,
      error: error.message
    });
    
    throw error;
  }
}

/**
 * Wrapper para operaciones de caché con métricas
 * @param {Function} cacheOperation - Función que ejecuta la operación de caché
 * @param {string} operation - Tipo de operación (get, set, del)
 * @returns {Promise} - Resultado de la operación
 */
async function withCacheMetrics(cacheOperation, operation = 'get') {
  try {
    const result = await cacheOperation();
    
    // Para operaciones GET, registrar hit/miss
    if (operation === 'get') {
      const hit = result !== null && result !== undefined;
      monitoringService.recordCacheOperation(operation, hit);
    } else {
      monitoringService.recordCacheOperation(operation);
    }
    
    return result;
  } catch (error) {
    monitoringService.recordError('cache_error', {
      operation,
      error: error.message
    });
    
    throw error;
  }
}

/**
 * Decorator para funciones async que registra métricas automáticamente
 * @param {string} metricName - Nombre de la métrica
 * @param {Function} fn - Función a decorar
 * @returns {Function} - Función decorada
 */
function withMetrics(metricName, fn) {
  return async function(...args) {
    const startTime = Date.now();
    
    try {
      const result = await fn.apply(this, args);
      const duration = Date.now() - startTime;
      
      monitoringService.recordBusinessEvent(metricName, {
        duration,
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      monitoringService.recordBusinessEvent(metricName, {
        duration,
        success: false,
        error: error.message
      });
      
      monitoringService.recordError(`${metricName}_error`, {
        error: error.message
      });
      
      throw error;
    }
  };
}

/**
 * Clase para medir performance de funciones
 */
class PerformanceTracker {
  constructor(name) {
    this.name = name;
    this.startTime = null;
    this.endTime = null;
    this.measurements = [];
  }

  start() {
    this.startTime = Date.now();
    return this;
  }

  end() {
    if (!this.startTime) {
      throw new Error('Performance tracker not started');
    }
    
    this.endTime = Date.now();
    const duration = this.endTime - this.startTime;
    
    this.measurements.push({
      duration,
      timestamp: this.endTime
    });

    // Registrar en el servicio de monitoreo
    monitoringService.recordBusinessEvent('performance_measurement', {
      name: this.name,
      duration
    });

    return duration;
  }

  getAverage() {
    if (this.measurements.length === 0) return 0;
    
    const total = this.measurements.reduce((sum, m) => sum + m.duration, 0);
    return total / this.measurements.length;
  }

  getStats() {
    if (this.measurements.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0 };
    }

    const durations = this.measurements.map(m => m.duration);
    
    return {
      count: this.measurements.length,
      average: this.getAverage(),
      min: Math.min(...durations),
      max: Math.max(...durations),
      last: durations[durations.length - 1]
    };
  }

  reset() {
    this.measurements = [];
    this.startTime = null;
    this.endTime = null;
  }
}

/**
 * Factory para crear trackers de performance
 * @param {string} name - Nombre del tracker
 * @returns {PerformanceTracker} - Nueva instancia del tracker
 */
function createPerformanceTracker(name) {
  return new PerformanceTracker(name);
}

/**
 * Middleware para tracking de errores específicos
 * @param {Error} error - Error a trackear
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
function errorTrackingMiddleware(error, req, res, next) {
  // Determinar tipo de error
  let errorType = 'unknown_error';
  
  if (error.name === 'ValidationError') {
    errorType = 'validation_error';
  } else if (error.name === 'CastError') {
    errorType = 'cast_error';
  } else if (error.code === 'ECONNREFUSED') {
    errorType = 'connection_error';
  } else if (error.status >= 400 && error.status < 500) {
    errorType = 'client_error';
  } else if (error.status >= 500) {
    errorType = 'server_error';
  }

  // Registrar error con contexto
  monitoringService.recordError(errorType, {
    message: error.message,
    stack: error.stack,
    endpoint: req.path,
    method: req.method,
    statusCode: error.status || 500,
    userId: req.user?.id,
    userAgent: req.get('User-Agent')
  });

  next(error);
}

/**
 * Función para trackear eventos de negocio específicos
 * @param {string} eventName - Nombre del evento
 * @param {Object} data - Datos adicionales del evento
 * @param {Object} user - Usuario asociado (opcional)
 */
function trackBusinessEvent(eventName, data = {}, user = null) {
  const eventData = {
    ...data,
    timestamp: Date.now()
  };

  if (user) {
    eventData.userId = user.id;
    eventData.userRole = user.role;
  }

  monitoringService.recordBusinessEvent(eventName, eventData);
}

/**
 * Middleware para tracking de eventos de autenticación
 * @param {string} action - Acción realizada (login, logout, register, etc.)
 * @returns {Function} - Middleware function
 */
function authTrackingMiddleware(action) {
  return (req, res, next) => {
    // Interceptar respuesta para verificar éxito
    const originalJson = res.json;
    
    res.json = function(data) {
      const success = res.statusCode >= 200 && res.statusCode < 400;
      
      trackBusinessEvent(`auth_${action}`, {
        success,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        email: req.body?.email // Si está disponible
      });

      originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Clase para agregar métricas personalizadas
 */
class CustomMetrics {
  constructor() {
    this.counters = new Map();
    this.gauges = new Map();
    this.timers = new Map();
  }

  /**
   * Incrementa un contador
   * @param {string} name - Nombre del contador
   * @param {number} value - Valor a incrementar (default: 1)
   * @param {Object} labels - Labels adicionales
   */
  incrementCounter(name, value = 1, labels = {}) {
    const key = this.getMetricKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);

    // Notificar al servicio de monitoreo
    monitoringService.emit('custom_metric', {
      type: 'counter',
      name,
      value: current + value,
      labels,
      timestamp: Date.now()
    });
  }

  /**
   * Establece un gauge (valor actual)
   * @param {string} name - Nombre del gauge
   * @param {number} value - Valor actual
   * @param {Object} labels - Labels adicionales
   */
  setGauge(name, value, labels = {}) {
    const key = this.getMetricKey(name, labels);
    this.gauges.set(key, value);

    monitoringService.emit('custom_metric', {
      type: 'gauge',
      name,
      value,
      labels,
      timestamp: Date.now()
    });
  }

  /**
   * Registra un tiempo
   * @param {string} name - Nombre del timer
   * @param {number} duration - Duración en ms
   * @param {Object} labels - Labels adicionales
   */
  recordTimer(name, duration, labels = {}) {
    const key = this.getMetricKey(name, labels);
    const existing = this.timers.get(key) || { count: 0, total: 0, avg: 0 };
    
    existing.count++;
    existing.total += duration;
    existing.avg = existing.total / existing.count;
    
    this.timers.set(key, existing);

    monitoringService.emit('custom_metric', {
      type: 'timer',
      name,
      value: duration,
      stats: existing,
      labels,
      timestamp: Date.now()
    });
  }

  /**
   * Genera clave única para métrica con labels
   */
  getMetricKey(name, labels) {
    if (Object.keys(labels).length === 0) {
      return name;
    }
    
    const labelString = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    
    return `${name}{${labelString}}`;
  }

  /**
   * Obtiene todas las métricas personalizadas
   */
  getAllMetrics() {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      timers: Object.fromEntries(this.timers)
    };
  }

  /**
   * Resetea todas las métricas personalizadas
   */
  reset() {
    this.counters.clear();
    this.gauges.clear();
    this.timers.clear();
  }
}

// Instancia global de métricas personalizadas
const customMetrics = new CustomMetrics();

module.exports = {
  metricsMiddleware,
  withDatabaseMetrics,
  withCacheMetrics,
  withMetrics,
  errorTrackingMiddleware,
  authTrackingMiddleware,
  trackBusinessEvent,
  createPerformanceTracker,
  PerformanceTracker,
  CustomMetrics,
  customMetrics
};