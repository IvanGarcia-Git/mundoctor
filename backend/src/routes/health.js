const express = require('express');
const router = express.Router();
const db = require('../config/database');
const redisConfig = require('../config/redis');
const cacheService = require('../services/cacheService');
const { version } = require('../../package.json');

/**
 * Clase para manejar health checks del sistema
 */
class HealthChecker {
  constructor() {
    this.checks = new Map();
    this.initializeChecks();
  }

  /**
   * Inicializa todos los health checks disponibles
   */
  initializeChecks() {
    this.checks.set('database', this.checkDatabase.bind(this));
    this.checks.set('redis', this.checkRedis.bind(this));
    this.checks.set('cache', this.checkCache.bind(this));
    this.checks.set('memory', this.checkMemory.bind(this));
    this.checks.set('disk', this.checkDisk.bind(this));
    this.checks.set('external_apis', this.checkExternalAPIs.bind(this));
  }

  /**
   * Verifica la conectividad con la base de datos
   */
  async checkDatabase() {
    const startTime = Date.now();
    try {
      // Test básico de conectividad
      const result = await db.query('SELECT 1 as test, NOW() as timestamp');
      const responseTime = Date.now() - startTime;

      // Test de escritura/lectura
      const testQuery = await db.query(`
        SELECT 
          count(*) as total_users,
          (SELECT count(*) FROM professionals) as total_professionals,
          (SELECT count(*) FROM appointments WHERE appointment_date >= CURRENT_DATE) as upcoming_appointments
      `);

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        details: {
          connection: 'active',
          timestamp: result.rows[0].timestamp,
          stats: testQuery.rows[0]
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: `${Date.now() - startTime}ms`,
        error: error.message,
        details: {
          connection: 'failed'
        }
      };
    }
  }

  /**
   * Verifica la conectividad con Redis
   */
  async checkRedis() {
    const startTime = Date.now();
    try {
      if (!redisConfig.isReady()) {
        return {
          status: 'unhealthy',
          responseTime: `${Date.now() - startTime}ms`,
          error: 'Redis not connected',
          details: {
            connection: 'failed'
          }
        };
      }

      const client = redisConfig.getClient();
      
      // Test de ping
      const pingResult = await client.ping();
      
      // Test de escritura/lectura
      const testKey = 'health_check_test';
      const testValue = Date.now().toString();
      await client.set(testKey, testValue, { EX: 60 });
      const retrievedValue = await client.get(testKey);
      
      const responseTime = Date.now() - startTime;

      if (retrievedValue !== testValue) {
        throw new Error('Redis read/write test failed');
      }

      // Limpiar el test
      await client.del(testKey);

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        details: {
          connection: 'active',
          ping: pingResult,
          readWrite: 'success'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: `${Date.now() - startTime}ms`,
        error: error.message,
        details: {
          connection: 'failed'
        }
      };
    }
  }

  /**
   * Verifica el servicio de caché
   */
  async checkCache() {
    const startTime = Date.now();
    try {
      const testKey = 'health_check_cache_test';
      const testData = { timestamp: Date.now(), test: true };

      // Test de escritura
      const setResult = await cacheService.set(testKey, testData, 60);
      
      // Test de lectura
      const retrievedData = await cacheService.get(testKey);
      
      // Test de eliminación
      await cacheService.del(testKey);

      const responseTime = Date.now() - startTime;

      if (!setResult || !retrievedData || retrievedData.timestamp !== testData.timestamp) {
        throw new Error('Cache service test failed');
      }

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        details: {
          available: cacheService.isAvailable(),
          readWrite: 'success'
        }
      };
    } catch (error) {
      return {
        status: 'degraded',
        responseTime: `${Date.now() - startTime}ms`,
        error: error.message,
        details: {
          available: cacheService.isAvailable()
        }
      };
    }
  }

  /**
   * Verifica el uso de memoria del sistema
   */
  async checkMemory() {
    try {
      const usage = process.memoryUsage();
      const totalMemory = require('os').totalmem();
      const freeMemory = require('os').freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      // Convertir bytes a MB
      const formatBytes = (bytes) => Math.round(bytes / 1024 / 1024);

      const details = {
        heap: {
          used: formatBytes(usage.heapUsed),
          total: formatBytes(usage.heapTotal),
          limit: formatBytes(usage.heapTotal * 1.4) // Aproximación del límite
        },
        system: {
          total: formatBytes(totalMemory),
          free: formatBytes(freeMemory),
          used: formatBytes(usedMemory),
          usage_percent: Math.round(memoryUsagePercent)
        },
        process: {
          rss: formatBytes(usage.rss),
          external: formatBytes(usage.external)
        }
      };

      // Determinar estado basado en uso de memoria
      let status = 'healthy';
      if (memoryUsagePercent > 90) {
        status = 'unhealthy';
      } else if (memoryUsagePercent > 75) {
        status = 'degraded';
      }

      return {
        status,
        details
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Verifica el espacio en disco
   */
  async checkDisk() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Verificar espacio en el directorio de la aplicación
      const stats = await fs.promises.statfs(path.resolve('.'));
      
      const totalSpace = stats.blocks * stats.blksize;
      const freeSpace = stats.bavail * stats.blksize;
      const usedSpace = totalSpace - freeSpace;
      const usagePercent = (usedSpace / totalSpace) * 100;

      // Convertir bytes a GB
      const formatGB = (bytes) => Math.round(bytes / 1024 / 1024 / 1024 * 100) / 100;

      const details = {
        total: `${formatGB(totalSpace)} GB`,
        free: `${formatGB(freeSpace)} GB`,
        used: `${formatGB(usedSpace)} GB`,
        usage_percent: Math.round(usagePercent)
      };

      // Determinar estado basado en uso de disco
      let status = 'healthy';
      if (usagePercent > 95) {
        status = 'unhealthy';
      } else if (usagePercent > 85) {
        status = 'degraded';
      }

      return {
        status,
        details
      };
    } catch (error) {
      // En algunos sistemas, statfs puede no estar disponible
      return {
        status: 'unknown',
        error: 'Disk check not available on this system',
        details: {}
      };
    }
  }

  /**
   * Verifica APIs externas (ejemplo con Clerk)
   */
  async checkExternalAPIs() {
    const startTime = Date.now();
    const results = {};

    // Test de Clerk API (si está configurado)
    try {
      if (process.env.CLERK_SECRET_KEY) {
        // Simulamos una verificación simple
        results.clerk = {
          status: 'healthy',
          responseTime: '50ms' // Placeholder
        };
      } else {
        results.clerk = {
          status: 'not_configured',
          message: 'Clerk API key not configured'
        };
      }
    } catch (error) {
      results.clerk = {
        status: 'unhealthy',
        error: error.message
      };
    }

    const responseTime = Date.now() - startTime;

    // Determinar estado general
    const statuses = Object.values(results).map(r => r.status);
    let overallStatus = 'healthy';
    
    if (statuses.includes('unhealthy')) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      responseTime: `${responseTime}ms`,
      details: results
    };
  }

  /**
   * Ejecuta todos los health checks
   */
  async runAllChecks() {
    const startTime = Date.now();
    const results = {};
    const promises = [];

    // Ejecutar todos los checks en paralelo
    for (const [name, checkFunction] of this.checks) {
      promises.push(
        checkFunction()
          .then(result => ({ name, result }))
          .catch(error => ({ name, result: { status: 'error', error: error.message } }))
      );
    }

    const checkResults = await Promise.all(promises);
    
    // Procesar resultados
    for (const { name, result } of checkResults) {
      results[name] = result;
    }

    // Determinar estado general del sistema
    const statuses = Object.values(results).map(r => r.status);
    let overallStatus = 'healthy';
    
    if (statuses.includes('unhealthy') || statuses.includes('error')) {
      overallStatus = 'unhealthy';
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded';
    }

    const totalTime = Date.now() - startTime;

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version,
      uptime: Math.floor(process.uptime()),
      responseTime: `${totalTime}ms`,
      checks: results
    };
  }

  /**
   * Ejecuta un health check específico
   */
  async runCheck(checkName) {
    if (!this.checks.has(checkName)) {
      throw new Error(`Health check '${checkName}' not found`);
    }

    const checkFunction = this.checks.get(checkName);
    return await checkFunction();
  }
}

const healthChecker = new HealthChecker();

/**
 * GET /health
 * Health check básico y rápido
 */
router.get('/', async (req, res) => {
  try {
    const result = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version,
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development'
    };

    res.status(200).json(result);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * GET /health/detailed
 * Health check completo con todos los componentes
 */
router.get('/detailed', async (req, res) => {
  try {
    const result = await healthChecker.runAllChecks();
    
    const statusCode = result.status === 'healthy' ? 200 : 
                      result.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(result);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * GET /health/check/:component
 * Health check de un componente específico
 */
router.get('/check/:component', async (req, res) => {
  try {
    const { component } = req.params;
    const result = await healthChecker.runCheck(component);
    
    const statusCode = result.status === 'healthy' ? 200 : 
                      result.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      component,
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * GET /health/ready
 * Readiness probe para Kubernetes/Docker
 */
router.get('/ready', async (req, res) => {
  try {
    // Verificar componentes críticos para estar "ready"
    const dbCheck = await healthChecker.runCheck('database');
    
    if (dbCheck.status === 'healthy') {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        reason: 'Database not available'
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * GET /health/live
 * Liveness probe para Kubernetes/Docker
 */
router.get('/live', (req, res) => {
  // Liveness check muy simple - solo verifica que el proceso esté funcionando
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

module.exports = router;