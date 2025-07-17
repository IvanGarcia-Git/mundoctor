const Redis = require('redis');

class RedisConfig {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
        lazyConnect: true,
        socket: {
          connectTimeout: 60000,
          lazyConnect: true,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis: Too many retry attempts, giving up');
              return new Error('Too many retry attempts');
            }
            return Math.min(retries * 50, 2000);
          }
        }
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis: Connected successfully');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        console.log('Redis: Reconnecting...');
        this.isConnected = false;
      });

      this.client.on('ready', () => {
        console.log('Redis: Ready to accept commands');
        this.isConnected = true;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('Redis connection failed:', error);
      this.isConnected = false;
      // No throw error para permitir que la app funcione sin Redis
      return null;
    }
  }

  getClient() {
    return this.client;
  }

  isReady() {
    return this.isConnected && this.client && this.client.isReady;
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

module.exports = new RedisConfig();