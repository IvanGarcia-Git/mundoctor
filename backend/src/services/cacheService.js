const redisConfig = require('../config/redis');

class CacheService {
  constructor() {
    this.redis = null;
    this.defaultTTL = 300; // 5 minutos por defecto
    this.init();
  }

  async init() {
    try {
      this.redis = await redisConfig.connect();
    } catch (error) {
      console.warn('Cache service initialized without Redis:', error.message);
    }
  }

  /**
   * Obtiene un valor del caché
   * @param {string} key - Clave del caché
   * @returns {Promise<any|null>} - Valor parseado o null
   */
  async get(key) {
    if (!this.isAvailable()) return null;
    
    try {
      const value = await this.redis.get(key);
      if (value === null) return null;
      return JSON.parse(value);
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Establece un valor en el caché
   * @param {string} key - Clave del caché
   * @param {any} value - Valor a almacenar
   * @param {number} ttl - Tiempo de vida en segundos
   * @returns {Promise<boolean>} - Éxito de la operación
   */
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isAvailable()) return false;
    
    try {
      const serialized = JSON.stringify(value);
      await this.redis.setEx(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Elimina una clave del caché
   * @param {string} key - Clave a eliminar
   * @returns {Promise<boolean>} - Éxito de la operación
   */
  async del(key) {
    if (!this.isAvailable()) return false;
    
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Elimina múltiples claves que coincidan con un patrón
   * @param {string} pattern - Patrón de claves (ej: 'user:*')
   * @returns {Promise<number>} - Número de claves eliminadas
   */
  async delPattern(pattern) {
    if (!this.isAvailable()) return 0;
    
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;
      
      await this.redis.del(keys);
      return keys.length;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  /**
   * Incrementa un contador
   * @param {string} key - Clave del contador
   * @param {number} ttl - Tiempo de vida en segundos
   * @returns {Promise<number>} - Valor del contador después del incremento
   */
  async incr(key, ttl = this.defaultTTL) {
    if (!this.isAvailable()) return 1;
    
    try {
      const value = await this.redis.incr(key);
      if (value === 1) {
        // Si es la primera vez, establecer TTL
        await this.redis.expire(key, ttl);
      }
      return value;
    } catch (error) {
      console.error('Cache increment error:', error);
      return 1;
    }
  }

  /**
   * Verifica si una clave existe
   * @param {string} key - Clave a verificar
   * @returns {Promise<boolean>} - True si existe
   */
  async exists(key) {
    if (!this.isAvailable()) return false;
    
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Establece un TTL para una clave existente
   * @param {string} key - Clave
   * @param {number} ttl - Tiempo de vida en segundos
   * @returns {Promise<boolean>} - Éxito de la operación
   */
  async expire(key, ttl) {
    if (!this.isAvailable()) return false;
    
    try {
      await this.redis.expire(key, ttl);
      return true;
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }

  /**
   * Wrapper para operaciones con caché automático
   * @param {string} key - Clave del caché
   * @param {Function} fetchFunction - Función para obtener los datos si no están en caché
   * @param {number} ttl - Tiempo de vida en segundos
   * @returns {Promise<any>} - Datos del caché o de la función
   */
  async getOrSet(key, fetchFunction, ttl = this.defaultTTL) {
    // Intentar obtener del caché primero
    let data = await this.get(key);
    
    if (data !== null) {
      return data;
    }

    // Si no está en caché, ejecutar la función
    try {
      data = await fetchFunction();
      
      // Almacenar en caché solo si hay datos válidos
      if (data !== null && data !== undefined) {
        await this.set(key, data, ttl);
      }
      
      return data;
    } catch (error) {
      console.error('Cache getOrSet fetchFunction error:', error);
      throw error;
    }
  }

  /**
   * Genera claves de caché estandarizadas
   */
  generateKey(...parts) {
    return parts.filter(part => part !== null && part !== undefined).join(':');
  }

  /**
   * Claves de caché predefinidas para la aplicación
   */
  keys = {
    // Profesionales
    professional: (id) => this.generateKey('professional', id),
    professionalSearch: (params) => this.generateKey('search', 'professionals', this.hashParams(params)),
    professionalsBySpecialty: (specialtyId) => this.generateKey('professionals', 'specialty', specialtyId),
    
    // Especialidades
    specialties: () => this.generateKey('specialties'),
    specialty: (id) => this.generateKey('specialty', id),
    
    // Usuarios
    user: (id) => this.generateKey('user', id),
    userProfile: (id) => this.generateKey('user', id, 'profile'),
    
    // Citas
    appointments: (userId) => this.generateKey('appointments', 'user', userId),
    appointment: (id) => this.generateKey('appointment', id),
    
    // Rate limiting
    rateLimit: (userId, endpoint) => this.generateKey('rate_limit', userId, endpoint),
    
    // Estadísticas
    stats: (type, period) => this.generateKey('stats', type, period),
    dashboardStats: (userId) => this.generateKey('dashboard', 'stats', userId)
  };

  /**
   * TTLs predefinidos para diferentes tipos de datos
   */
  ttl = {
    SHORT: 60,        // 1 minuto
    MEDIUM: 300,      // 5 minutos
    LONG: 1800,       // 30 minutos
    HOUR: 3600,       // 1 hora
    DAY: 86400,       // 24 horas
    WEEK: 604800      // 7 días
  };

  /**
   * Verifica si Redis está disponible
   * @returns {boolean} - True si Redis está disponible
   */
  isAvailable() {
    return this.redis && redisConfig.isReady();
  }

  /**
   * Genera un hash simple para parámetros de búsqueda
   * @param {Object} params - Parámetros a hashear
   * @returns {string} - Hash de los parámetros
   */
  hashParams(params) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          result[key] = params[key];
        }
        return result;
      }, {});
    
    return Buffer.from(JSON.stringify(sortedParams)).toString('base64');
  }

  /**
   * Limpia todo el caché (usar con precaución)
   * @returns {Promise<boolean>} - Éxito de la operación
   */
  async flush() {
    if (!this.isAvailable()) return false;
    
    try {
      await this.redis.flushDb();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  /**
   * Obtiene información del caché
   * @returns {Promise<Object>} - Información del caché
   */
  async info() {
    if (!this.isAvailable()) {
      return { available: false, message: 'Redis not available' };
    }
    
    try {
      const info = await this.redis.info('memory');
      return {
        available: true,
        memory: info,
        connected: redisConfig.isReady()
      };
    } catch (error) {
      console.error('Cache info error:', error);
      return { available: false, error: error.message };
    }
  }
}

module.exports = new CacheService();