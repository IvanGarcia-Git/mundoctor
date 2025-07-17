const EventEmitter = require('events');
const cacheService = require('./cacheService');

/**
 * Servicio de monitoreo y métricas para la aplicación
 */
class MonitoringService extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.alerts = new Map();
    this.thresholds = {
      responseTime: 5000,        // 5 segundos
      errorRate: 5,              // 5% de errores
      memoryUsage: 85,           // 85% de memoria
      activeConnections: 1000,   // 1000 conexiones activas
      cacheHitRate: 70          // 70% de aciertos en caché
    };
    this.intervalId = null;
    this.startTime = Date.now();
    this.initializeMetrics();
  }

  /**
   * Inicializa las métricas básicas
   */
  initializeMetrics() {
    const baseMetrics = {
      // Métricas de requests
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      
      // Métricas de errores
      errorsByType: {},
      errorsByEndpoint: {},
      
      // Métricas de cache
      cacheHits: 0,
      cacheMisses: 0,
      
      // Métricas de base de datos
      dbQueries: 0,
      dbQueryTime: 0,
      dbErrors: 0,
      
      // Métricas de sistema
      memoryUsage: 0,
      cpuUsage: 0,
      activeConnections: 0,
      
      // Métricas de negocio
      userRegistrations: 0,
      appointmentBookings: 0,
      professionalSignups: 0,
      
      // Timestamps
      lastUpdated: Date.now()
    };

    for (const [key, value] of Object.entries(baseMetrics)) {
      this.metrics.set(key, value);
    }
  }

  /**
   * Inicia el monitoreo automático
   */
  start(intervalMs = 60000) { // 1 minuto por defecto
    if (this.intervalId) {
      this.stop();
    }

    this.intervalId = setInterval(() => {
      this.collectSystemMetrics();
      this.checkAlerts();
      this.persistMetrics();
    }, intervalMs);

    console.log(`Monitoring service started with ${intervalMs}ms interval`);
  }

  /**
   * Detiene el monitoreo automático
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Monitoring service stopped');
    }
  }

  /**
   * Registra una métrica de request HTTP
   */
  recordRequest(req, res, responseTime) {
    this.incrementMetric('totalRequests');
    
    if (res.statusCode >= 200 && res.statusCode < 400) {
      this.incrementMetric('successfulRequests');
    } else {
      this.incrementMetric('failedRequests');
      this.recordError('http_error', {
        statusCode: res.statusCode,
        endpoint: req.path,
        method: req.method
      });
    }

    // Actualizar tiempo de respuesta promedio
    this.updateAverageResponseTime(responseTime);

    // Registrar por endpoint si es necesario
    const endpoint = this.normalizeEndpoint(req.path);
    this.recordEndpointMetric(endpoint, responseTime, res.statusCode);

    // Emitir evento para procesamiento adicional
    this.emit('request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      timestamp: Date.now()
    });
  }

  /**
   * Registra un error en el sistema
   */
  recordError(type, details = {}) {
    this.incrementMetric('failedRequests');
    
    // Incrementar por tipo de error
    const errorsByType = this.metrics.get('errorsByType') || {};
    errorsByType[type] = (errorsByType[type] || 0) + 1;
    this.metrics.set('errorsByType', errorsByType);

    // Incrementar por endpoint si está disponible
    if (details.endpoint) {
      const errorsByEndpoint = this.metrics.get('errorsByEndpoint') || {};
      errorsByEndpoint[details.endpoint] = (errorsByEndpoint[details.endpoint] || 0) + 1;
      this.metrics.set('errorsByEndpoint', errorsByEndpoint);
    }

    // Emitir evento de error
    this.emit('error', {
      type,
      details,
      timestamp: Date.now()
    });

    // Log del error
    console.error(`[MONITORING] Error recorded: ${type}`, details);
  }

  /**
   * Registra métricas de caché
   */
  recordCacheOperation(operation, hit = false) {
    if (operation === 'get') {
      if (hit) {
        this.incrementMetric('cacheHits');
      } else {
        this.incrementMetric('cacheMisses');
      }
    }

    this.emit('cache', {
      operation,
      hit,
      timestamp: Date.now()
    });
  }

  /**
   * Registra métricas de base de datos
   */
  recordDatabaseOperation(queryTime, success = true) {
    this.incrementMetric('dbQueries');
    
    if (success) {
      const currentTotal = this.metrics.get('dbQueryTime') || 0;
      this.metrics.set('dbQueryTime', currentTotal + queryTime);
    } else {
      this.incrementMetric('dbErrors');
    }

    this.emit('database', {
      queryTime,
      success,
      timestamp: Date.now()
    });
  }

  /**
   * Registra métricas de negocio
   */
  recordBusinessEvent(event, data = {}) {
    const businessEvents = {
      'user_registration': 'userRegistrations',
      'appointment_booking': 'appointmentBookings',
      'professional_signup': 'professionalSignups'
    };

    if (businessEvents[event]) {
      this.incrementMetric(businessEvents[event]);
    }

    this.emit('business', {
      event,
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Incrementa una métrica
   */
  incrementMetric(name, value = 1) {
    const current = this.metrics.get(name) || 0;
    this.metrics.set(name, current + value);
    this.metrics.set('lastUpdated', Date.now());
  }

  /**
   * Establece el valor de una métrica
   */
  setMetric(name, value) {
    this.metrics.set(name, value);
    this.metrics.set('lastUpdated', Date.now());
  }

  /**
   * Obtiene el valor de una métrica
   */
  getMetric(name) {
    return this.metrics.get(name);
  }

  /**
   * Obtiene todas las métricas
   */
  getAllMetrics() {
    const metrics = {};
    for (const [key, value] of this.metrics) {
      metrics[key] = value;
    }
    
    // Calcular métricas derivadas
    metrics.errorRate = this.calculateErrorRate();
    metrics.cacheHitRate = this.calculateCacheHitRate();
    metrics.averageDbQueryTime = this.calculateAverageDbQueryTime();
    metrics.uptime = Date.now() - this.startTime;
    
    return metrics;
  }

  /**
   * Actualiza el tiempo de respuesta promedio
   */
  updateAverageResponseTime(newTime) {
    const current = this.metrics.get('averageResponseTime') || 0;
    const total = this.metrics.get('totalRequests') || 1;
    
    // Calcular promedio móvil simple
    const newAverage = ((current * (total - 1)) + newTime) / total;
    this.metrics.set('averageResponseTime', Math.round(newAverage));
  }

  /**
   * Normaliza endpoints para métricas (remueve IDs, etc.)
   */
  normalizeEndpoint(path) {
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-f0-9]{24}/g, '/:objectid');
  }

  /**
   * Registra métricas específicas por endpoint
   */
  recordEndpointMetric(endpoint, responseTime, statusCode) {
    const endpointKey = `endpoint:${endpoint}`;
    const existing = this.metrics.get(endpointKey) || {
      count: 0,
      totalTime: 0,
      errors: 0
    };

    existing.count++;
    existing.totalTime += responseTime;
    
    if (statusCode >= 400) {
      existing.errors++;
    }

    this.metrics.set(endpointKey, existing);
  }

  /**
   * Recopila métricas del sistema
   */
  collectSystemMetrics() {
    try {
      // Métricas de memoria
      const memUsage = process.memoryUsage();
      const totalMem = require('os').totalmem();
      const freeMem = require('os').freemem();
      const memoryUsagePercent = ((totalMem - freeMem) / totalMem) * 100;
      
      this.setMetric('memoryUsage', Math.round(memoryUsagePercent));

      // Métricas de CPU (aproximación)
      const cpuUsage = process.cpuUsage();
      this.setMetric('cpuUsage', cpuUsage);

      // Métricas de uptime
      this.setMetric('processUptime', Math.floor(process.uptime()));

    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  /**
   * Calcula la tasa de errores
   */
  calculateErrorRate() {
    const total = this.metrics.get('totalRequests') || 0;
    const failed = this.metrics.get('failedRequests') || 0;
    
    if (total === 0) return 0;
    return Math.round((failed / total) * 100 * 100) / 100; // 2 decimales
  }

  /**
   * Calcula la tasa de aciertos en caché
   */
  calculateCacheHitRate() {
    const hits = this.metrics.get('cacheHits') || 0;
    const misses = this.metrics.get('cacheMisses') || 0;
    const total = hits + misses;
    
    if (total === 0) return 0;
    return Math.round((hits / total) * 100 * 100) / 100; // 2 decimales
  }

  /**
   * Calcula el tiempo promedio de queries de DB
   */
  calculateAverageDbQueryTime() {
    const totalTime = this.metrics.get('dbQueryTime') || 0;
    const totalQueries = this.metrics.get('dbQueries') || 0;
    
    if (totalQueries === 0) return 0;
    return Math.round(totalTime / totalQueries * 100) / 100; // 2 decimales
  }

  /**
   * Verifica alertas basadas en umbrales
   */
  checkAlerts() {
    const metrics = this.getAllMetrics();
    
    // Verificar tiempo de respuesta
    if (metrics.averageResponseTime > this.thresholds.responseTime) {
      this.triggerAlert('high_response_time', {
        current: metrics.averageResponseTime,
        threshold: this.thresholds.responseTime
      });
    }

    // Verificar tasa de errores
    if (metrics.errorRate > this.thresholds.errorRate) {
      this.triggerAlert('high_error_rate', {
        current: metrics.errorRate,
        threshold: this.thresholds.errorRate
      });
    }

    // Verificar uso de memoria
    if (metrics.memoryUsage > this.thresholds.memoryUsage) {
      this.triggerAlert('high_memory_usage', {
        current: metrics.memoryUsage,
        threshold: this.thresholds.memoryUsage
      });
    }

    // Verificar tasa de aciertos en caché
    if (metrics.cacheHitRate < this.thresholds.cacheHitRate && metrics.cacheHits + metrics.cacheMisses > 100) {
      this.triggerAlert('low_cache_hit_rate', {
        current: metrics.cacheHitRate,
        threshold: this.thresholds.cacheHitRate
      });
    }
  }

  /**
   * Dispara una alerta
   */
  triggerAlert(type, data) {
    const alertKey = `alert:${type}`;
    const lastAlert = this.alerts.get(alertKey) || 0;
    const now = Date.now();
    
    // Evitar spam de alertas (mínimo 5 minutos entre alertas del mismo tipo)
    if (now - lastAlert < 5 * 60 * 1000) {
      return;
    }

    this.alerts.set(alertKey, now);

    const alert = {
      type,
      severity: this.getAlertSeverity(type),
      data,
      timestamp: now
    };

    this.emit('alert', alert);
    console.warn(`[MONITORING ALERT] ${type}:`, data);
  }

  /**
   * Determina la severidad de una alerta
   */
  getAlertSeverity(type) {
    const severityMap = {
      'high_response_time': 'warning',
      'high_error_rate': 'critical',
      'high_memory_usage': 'warning',
      'low_cache_hit_rate': 'info',
      'database_error': 'critical'
    };

    return severityMap[type] || 'info';
  }

  /**
   * Persiste métricas en caché para análisis histórico
   */
  async persistMetrics() {
    try {
      const metrics = this.getAllMetrics();
      const timestamp = new Date().toISOString();
      
      // Guardar snapshot actual
      await cacheService.set(
        cacheService.keys.stats('current', 'snapshot'),
        metrics,
        cacheService.ttl.HOUR
      );

      // Guardar en historial por horas
      const hourKey = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
      await cacheService.set(
        cacheService.keys.stats('hourly', hourKey),
        metrics,
        cacheService.ttl.DAY
      );

    } catch (error) {
      console.error('Error persisting metrics:', error);
    }
  }

  /**
   * Obtiene métricas históricas
   */
  async getHistoricalMetrics(period = 'hourly', limit = 24) {
    try {
      const pattern = `stats:${period}:*`;
      // Nota: Esta funcionalidad requiere implementar getKeys en cacheService
      // Por ahora retornamos las métricas actuales
      return {
        current: this.getAllMetrics(),
        historical: []
      };
    } catch (error) {
      console.error('Error getting historical metrics:', error);
      return { current: this.getAllMetrics(), historical: [] };
    }
  }

  /**
   * Resetea todas las métricas
   */
  resetMetrics() {
    this.metrics.clear();
    this.alerts.clear();
    this.initializeMetrics();
    console.log('Metrics reset completed');
  }

  /**
   * Configura umbrales de alertas
   */
  setThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * Obtiene configuración de umbrales
   */
  getThresholds() {
    return { ...this.thresholds };
  }
}

// Instancia singleton
const monitoringService = new MonitoringService();

module.exports = monitoringService;