/**
 * Simple in-memory cache for API responses
 * Helps reduce redundant API calls and improve performance
 */

class ApiCache {
  constructor(defaultTTL = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generate cache key from endpoint and params
   */
  generateKey(endpoint, params = {}) {
    const paramString = Object.keys(params).length > 0 
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return `${endpoint}${paramString}`;
  }

  /**
   * Set cache entry with TTL
   */
  set(key, data, ttl = this.defaultTTL) {
    const entry = {
      data,
      timestamp: Date.now(),
      ttl
    };
    this.cache.set(key, entry);
  }

  /**
   * Get cache entry if not expired
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Check if cache has valid entry
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Clear specific cache entry
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Create global cache instance
const apiCache = new ApiCache();

// Cleanup expired entries every 10 minutes
setInterval(() => {
  apiCache.cleanup();
}, 10 * 60 * 1000);

/**
 * Cache decorator for API functions
 */
export const withCache = (ttl) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      // Generate cache key based on method name and arguments
      const cacheKey = `${propertyKey}_${JSON.stringify(args)}`;
      
      // Try to get from cache first
      const cachedResult = apiCache.get(cacheKey);
      if (cachedResult) {
        console.log(`Cache hit for ${propertyKey}`);
        return cachedResult;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      // Cache the result
      apiCache.set(cacheKey, result, ttl);
      console.log(`Cached result for ${propertyKey}`);
      
      return result;
    };

    return descriptor;
  };
};

/**
 * Hook for caching API responses
 */
export const useCachedApi = (apiFunction, dependencies = [], ttl = 5 * 60 * 1000) => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        // Generate cache key
        const cacheKey = `${apiFunction.name}_${JSON.stringify(dependencies)}`;
        
        // Check cache first
        const cachedData = apiCache.get(cacheKey);
        if (cachedData && mounted) {
          setData(cachedData);
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);

        // Fetch fresh data
        const result = await apiFunction();
        
        if (mounted) {
          setData(result);
          setLoading(false);
          
          // Cache the result
          apiCache.set(cacheKey, result, ttl);
        }
      } catch (err) {
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, dependencies);

  const refresh = React.useCallback(async () => {
    const cacheKey = `${apiFunction.name}_${JSON.stringify(dependencies)}`;
    apiCache.delete(cacheKey);
    
    try {
      setLoading(true);
      setError(null);
      const result = await apiFunction();
      setData(result);
      apiCache.set(cacheKey, result, ttl);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [apiFunction, dependencies, ttl]);

  return { data, loading, error, refresh };
};

/**
 * Cache strategies
 */
export const CACHE_STRATEGIES = {
  DASHBOARD_STATS: 2 * 60 * 1000, // 2 minutes
  USER_PROFILE: 10 * 60 * 1000,   // 10 minutes
  APPOINTMENTS: 1 * 60 * 1000,    // 1 minute
  REVIEWS: 5 * 60 * 1000,         // 5 minutes
  STATIC_DATA: 30 * 60 * 1000,    // 30 minutes
};

/**
 * Clear cache by pattern
 */
export const clearCacheByPattern = (pattern) => {
  const regex = new RegExp(pattern);
  const stats = apiCache.getStats();
  
  stats.entries.forEach(key => {
    if (regex.test(key)) {
      apiCache.delete(key);
    }
  });
};

/**
 * Invalidate user-specific cache on logout
 */
export const clearUserCache = () => {
  clearCacheByPattern('^(dashboard|profile|appointments|reviews)_');
};

export default apiCache;