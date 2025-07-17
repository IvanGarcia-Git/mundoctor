const compression = require('compression');

/**
 * Configuración avanzada de compresión para el servidor
 */

/**
 * Middleware de compresión con configuración optimizada
 * @returns {Function} - Middleware de compresión
 */
function createCompressionMiddleware() {
  return compression({
    // Nivel de compresión (1-9, 6 es el balance óptimo)
    level: 6,
    
    // Umbral mínimo de tamaño para comprimir (en bytes)
    threshold: 1024, // 1KB
    
    // Filtro para determinar qué respuestas comprimir
    filter: (req, res) => {
      // No comprimir si el cliente no lo solicita
      if (req.headers['x-no-compression']) {
        return false;
      }

      // No comprimir respuestas ya comprimidas
      if (res.getHeader('Content-Encoding')) {
        return false;
      }

      // Usar el filtro por defecto de compression
      return compression.filter(req, res);
    },
    
    // Configuración de memoria
    chunkSize: 16 * 1024, // 16KB chunks
    windowBits: 15,
    memLevel: 8,
    
    // Headers personalizados
    vary: true // Añadir header Vary: Accept-Encoding
  });
}

/**
 * Middleware específico para APIs JSON con compresión optimizada
 * @returns {Function} - Middleware de compresión para APIs
 */
function createAPICompressionMiddleware() {
  return compression({
    level: 9, // Máxima compresión para APIs (CPU vs bandwidth trade-off)
    threshold: 512, // Umbral más bajo para respuestas JSON
    
    filter: (req, res) => {
      // Solo comprimir respuestas JSON y text
      const contentType = res.getHeader('Content-Type');
      
      if (!contentType) {
        return false;
      }

      // Tipos de contenido que se benefician de la compresión
      const compressibleTypes = [
        'application/json',
        'application/javascript',
        'text/plain',
        'text/html',
        'text/css',
        'text/xml',
        'application/xml'
      ];

      return compressibleTypes.some(type => 
        contentType.toLowerCase().includes(type)
      );
    }
  });
}

/**
 * Middleware que añade headers de compresión para debugging
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
function compressionHeaders(req, res, next) {
  // Interceptar el método end para añadir headers informativos
  const originalEnd = res.end;
  
  res.end = function(chunk, encoding) {
    // Añadir header con el tamaño original antes de la compresión
    if (chunk) {
      const originalSize = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
      res.setHeader('X-Original-Size', originalSize);
    }

    // Añadir header indicando si se aplicó compresión
    const isCompressed = res.getHeader('Content-Encoding');
    res.setHeader('X-Compressed', isCompressed ? 'true' : 'false');

    // Llamar al método original
    originalEnd.call(this, chunk, encoding);
  };

  next();
}

/**
 * Configuración de compresión para diferentes entornos
 */
const compressionConfigs = {
  // Configuración para desarrollo
  development: {
    level: 1, // Compresión mínima para desarrollo rápido
    threshold: 2048,
    filter: compression.filter
  },

  // Configuración para producción
  production: {
    level: 6, // Balance óptimo para producción
    threshold: 1024,
    filter: (req, res) => {
      // En producción, comprimir más agresivamente
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  },

  // Configuración para APIs de alto tráfico
  highTraffic: {
    level: 9, // Máxima compresión para ahorrar bandwidth
    threshold: 512,
    filter: (req, res) => {
      const contentType = res.getHeader('Content-Type') || '';
      return contentType.includes('application/json') || 
             contentType.includes('text/');
    }
  }
};

/**
 * Factory function para crear middleware de compresión basado en el entorno
 * @param {string} environment - Entorno (development, production, highTraffic)
 * @returns {Function} - Middleware de compresión configurado
 */
function createEnvironmentCompression(environment = 'production') {
  const config = compressionConfigs[environment] || compressionConfigs.production;
  return compression(config);
}

/**
 * Middleware para estadísticas de compresión
 */
class CompressionStats {
  constructor() {
    this.stats = {
      totalRequests: 0,
      compressedRequests: 0,
      originalBytes: 0,
      compressedBytes: 0,
      averageCompressionRatio: 0
    };
  }

  middleware() {
    return (req, res, next) => {
      const originalEnd = res.end;
      const startTime = Date.now();

      res.end = (chunk, encoding) => {
        this.stats.totalRequests++;

        if (chunk) {
          const originalSize = Buffer.isBuffer(chunk) 
            ? chunk.length 
            : Buffer.byteLength(chunk, encoding || 'utf8');
          
          this.stats.originalBytes += originalSize;

          const isCompressed = res.getHeader('Content-Encoding');
          if (isCompressed) {
            this.stats.compressedRequests++;
            
            // Estimar el tamaño comprimido (en un caso real se mediría exactamente)
            const compressionRatio = this.estimateCompressionRatio(res.getHeader('Content-Type'));
            const compressedSize = Math.floor(originalSize * compressionRatio);
            this.stats.compressedBytes += compressedSize;
          } else {
            this.stats.compressedBytes += originalSize;
          }

          // Calcular ratio promedio
          this.stats.averageCompressionRatio = this.stats.originalBytes > 0 
            ? this.stats.compressedBytes / this.stats.originalBytes 
            : 1;
        }

        // Añadir header con tiempo de procesamiento
        const processingTime = Date.now() - startTime;
        res.setHeader('X-Processing-Time', `${processingTime}ms`);

        originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }

  estimateCompressionRatio(contentType) {
    // Ratios estimados basados en tipo de contenido
    if (!contentType) return 1;
    
    const ratios = {
      'application/json': 0.3,    // JSON se comprime muy bien
      'text/html': 0.25,          // HTML también
      'text/plain': 0.4,          // Texto plano decente
      'text/css': 0.2,            // CSS excelente compresión
      'application/javascript': 0.3, // JavaScript buena compresión
      'application/xml': 0.3      // XML buena compresión
    };

    for (const [type, ratio] of Object.entries(ratios)) {
      if (contentType.includes(type)) {
        return ratio;
      }
    }

    return 0.8; // Ratio conservador para otros tipos
  }

  getStats() {
    return {
      ...this.stats,
      compressionPercentage: this.stats.totalRequests > 0 
        ? (this.stats.compressedRequests / this.stats.totalRequests * 100).toFixed(2) + '%'
        : '0%',
      bytesSaved: this.stats.originalBytes - this.stats.compressedBytes,
      averageCompressionPercentage: ((1 - this.stats.averageCompressionRatio) * 100).toFixed(2) + '%'
    };
  }

  reset() {
    this.stats = {
      totalRequests: 0,
      compressedRequests: 0,
      originalBytes: 0,
      compressedBytes: 0,
      averageCompressionRatio: 0
    };
  }
}

// Instancia global para estadísticas
const compressionStats = new CompressionStats();

module.exports = {
  createCompressionMiddleware,
  createAPICompressionMiddleware,
  createEnvironmentCompression,
  compressionHeaders,
  compressionStats,
  CompressionStats
};