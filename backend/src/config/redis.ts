import Redis from 'ioredis';
import { logger } from './logger';

// Redis client configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  connectionName: 'freelance-platform',
};

// Create Redis client
export const redis = new Redis(redisConfig);

// Event listeners
redis.on('connect', () => {
  logger.info('Redis client connected');
});

redis.on('ready', () => {
  logger.info('Redis client ready');
});

redis.on('error', (error) => {
  logger.error('Redis client error:', error);
});

redis.on('close', () => {
  logger.info('Redis client connection closed');
});

redis.on('reconnecting', () => {
  logger.info('Redis client reconnecting');
});

// Connection health check
export async function checkRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    logger.info('Redis connection established successfully');
    return true;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    return false;
  }
}

// Graceful shutdown
export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
}

// Cache helper functions
export class CacheService {
  private static instance: CacheService;
  private defaultTTL = 3600; // 1 hour in seconds

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      await redis.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async increment(key: string, value: number = 1): Promise<number> {
    try {
      return await redis.incrby(key, value);
    } catch (error) {
      logger.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      await redis.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  async flushPattern(pattern: string): Promise<boolean> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error(`Cache flush pattern error for pattern ${pattern}:`, error);
      return false;
    }
  }

  // User-specific cache operations
  async getUserCache(userId: string, key: string): Promise<any> {
    return this.get(`user:${userId}:${key}`);
  }

  async setUserCache(userId: string, key: string, value: any, ttl?: number): Promise<boolean> {
    return this.set(`user:${userId}:${key}`, value, ttl);
  }

  async deleteUserCache(userId: string, key?: string): Promise<boolean> {
    if (key) {
      return this.del(`user:${userId}:${key}`);
    } else {
      return this.flushPattern(`user:${userId}:*`);
    }
  }

  // Job-specific cache operations
  async getJobCache(jobId: string, key: string): Promise<any> {
    return this.get(`job:${jobId}:${key}`);
  }

  async setJobCache(jobId: string, key: string, value: any, ttl?: number): Promise<boolean> {
    return this.set(`job:${jobId}:${key}`, value, ttl);
  }

  async deleteJobCache(jobId: string, key?: string): Promise<boolean> {
    if (key) {
      return this.del(`job:${jobId}:${key}`);
    } else {
      return this.flushPattern(`job:${jobId}:*`);
    }
  }

  // Rate limiting operations
  async checkRateLimit(identifier: string, limit: number, window: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    try {
      const key = `rate_limit:${identifier}`;
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, window);
      }

      const ttl = await redis.ttl(key);
      const resetTime = Date.now() + (ttl * 1000);

      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetTime,
      };
    } catch (error) {
      logger.error(`Rate limit check error for ${identifier}:`, error);
      return {
        allowed: true,
        remaining: limit,
        resetTime: Date.now() + (window * 1000),
      };
    }
  }

  // Session management
  async setSession(sessionId: string, data: any, ttl: number = 86400): Promise<boolean> {
    return this.set(`session:${sessionId}`, data, ttl);
  }

  async getSession(sessionId: string): Promise<any> {
    return this.get(`session:${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.del(`session:${sessionId}`);
  }
}

export const cache = CacheService.getInstance();

export default redis;