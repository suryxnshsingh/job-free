import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { cache } from '@/config/redis';
import { logger } from '@/config/logger';
import config from '@/config/app';

// Custom store using Redis
class RedisStore {
  constructor(private windowMs: number) {}

  async increment(key: string): Promise<{ totalHits: number; resetTime?: Date }> {
    try {
      const result = await cache.checkRateLimit(
        key,
        config.rateLimit.maxRequests,
        Math.floor(this.windowMs / 1000)
      );

      return {
        totalHits: config.rateLimit.maxRequests - result.remaining + 1,
        resetTime: new Date(result.resetTime),
      };
    } catch (error) {
      logger.error('Rate limit store error:', error);
      // Fallback to allow request if Redis is down
      return { totalHits: 1 };
    }
  }

  async decrement(key: string): Promise<void> {
    // Not implemented as we don't need to decrement
  }

  async resetKey(key: string): Promise<void> {
    try {
      await cache.del(`rate_limit:${key}`);
    } catch (error) {
      logger.error('Rate limit reset error:', error);
    }
  }
}

// Default rate limiter
export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore(config.rateLimit.windowMs),
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    const userId = (req as any).user?.id;
    return userId ? `user:${userId}` : `ip:${req.ip}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userId: (req as any).user?.id,
      userAgent: req.get('User-Agent'),
    });

    res.status(429).json({
      error: {
        message: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
        timestamp: new Date().toISOString(),
      },
    });
  },
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.url === '/health';
  },
});

// Strict rate limiter for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore(config.rateLimit.authWindowMs),
  keyGenerator: (req: Request) => `auth:${req.ip}`,
  handler: (req: Request, res: Response) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
    });

    res.status(429).json({
      error: {
        message: 'Too many authentication attempts, please try again later',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(config.rateLimit.authWindowMs / 1000),
        timestamp: new Date().toISOString(),
      },
    });
  },
});

// File upload rate limiter
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore(60 * 60 * 1000),
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    return userId ? `upload:user:${userId}` : `upload:ip:${req.ip}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Upload rate limit exceeded', {
      ip: req.ip,
      userId: (req as any).user?.id,
      userAgent: req.get('User-Agent'),
    });

    res.status(429).json({
      error: {
        message: 'Too many file uploads, please try again later',
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        retryAfter: 3600, // 1 hour
        timestamp: new Date().toISOString(),
      },
    });
  },
});

// API key rate limiter for external integrations
export const apiKeyRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute for API keys
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore(60 * 1000),
  keyGenerator: (req: Request) => {
    const apiKey = req.get('X-API-Key');
    return apiKey ? `api:${apiKey}` : `ip:${req.ip}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('API rate limit exceeded', {
      ip: req.ip,
      apiKey: req.get('X-API-Key'),
      userAgent: req.get('User-Agent'),
    });

    res.status(429).json({
      error: {
        message: 'API rate limit exceeded',
        code: 'API_RATE_LIMIT_EXCEEDED',
        retryAfter: 60,
        timestamp: new Date().toISOString(),
      },
    });
  },
});

// Custom rate limiter middleware factory
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  skipIf?: (req: Request) => boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore(options.windowMs),
    keyGenerator: (req: Request) => {
      const prefix = options.keyPrefix || 'custom';
      const userId = (req as any).user?.id;
      return userId ? `${prefix}:user:${userId}` : `${prefix}:ip:${req.ip}`;
    },
    skip: options.skipIf || (() => false),
    handler: (req: Request, res: Response) => {
      logger.warn('Custom rate limit exceeded', {
        prefix: options.keyPrefix,
        ip: req.ip,
        userId: (req as any).user?.id,
        url: req.url,
        method: req.method,
      });

      res.status(429).json({
        error: {
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(options.windowMs / 1000),
          timestamp: new Date().toISOString(),
        },
      });
    },
  });
};

export default rateLimiter;