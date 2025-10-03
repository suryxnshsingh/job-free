import morgan from 'morgan';
import { Request, Response } from 'express';
import { logger, loggerStream } from '@/config/logger';

// Custom token for response time
morgan.token('response-time-ms', (req: Request, res: Response) => {
  const responseTime = res.getHeader('X-Response-Time');
  return responseTime ? `${responseTime}ms` : '-';
});

// Custom token for request ID
morgan.token('request-id', (req: Request) => {
  return (req as any).id || '-';
});

// Custom token for user ID
morgan.token('user-id', (req: Request) => {
  return (req as any).user?.id || 'anonymous';
});

// Custom token for real IP
morgan.token('real-ip', (req: Request) => {
  return req.ip || req.connection.remoteAddress || '-';
});

// Custom format for development
const developmentFormat = ':method :url :status :res[content-length] - :response-time ms - :real-ip - :user-id';

// Custom format for production (more detailed)
const productionFormat = JSON.stringify({
  method: ':method',
  url: ':url',
  status: ':status',
  contentLength: ':res[content-length]',
  responseTime: ':response-time',
  ip: ':real-ip',
  userAgent: ':user-agent',
  userId: ':user-id',
  requestId: ':request-id',
  timestamp: ':date[iso]',
});

// Skip certain routes in production for performance
const skip = (req: Request, res: Response) => {
  // Skip health checks and static assets in production
  if (process.env.NODE_ENV === 'production') {
    const skipPaths = ['/health', '/favicon.ico', '/robots.txt'];
    return skipPaths.some(path => req.url.startsWith(path));
  }
  return false;
};

// Create request logger middleware
export const requestLogger = morgan(
  process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  {
    stream: loggerStream,
    skip,
  }
);

// Enhanced request logger with additional context
export const enhancedRequestLogger = (req: Request, res: Response, next: any) => {
  const startTime = Date.now();
  
  // Generate request ID
  (req as any).id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Log request start
  logger.http('Request started', {
    requestId: (req as any).id,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString(),
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk: any, encoding?: any) {
    const responseTime = Date.now() - startTime;
    res.setHeader('X-Response-Time', responseTime);
    
    // Log response
    logger.http('Request completed', {
      requestId: (req as any).id,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('Content-Length'),
      userId: (req as any).user?.id,
      timestamp: new Date().toISOString(),
    });

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

export default requestLogger;