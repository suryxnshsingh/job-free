import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Config imports
import config from '@/config/app';
import { logger, loggerStream } from '@/config/logger';
import { checkDatabaseConnection, disconnectDatabase } from '@/config/database';
import { checkRedisConnection, disconnectRedis } from '@/config/redis';

// Middleware imports
import { errorHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/requestLogger';
import { rateLimiter } from '@/middleware/rateLimiter';
import { authMiddleware } from '@/middleware/auth';

// Route imports
import { apiRoutes } from '@/routes';

// WebSocket imports
import { initializeWebSocket } from '@/websocket';

// Service imports
import { BlockchainService } from '@/services/BlockchainService';
import { NotificationService } from '@/services/NotificationService';
import { SchedulerService } from '@/services/SchedulerService';

class Application {
  public app: express.Application;
  public server: any;
  public io: SocketIOServer;
  private blockchainService: BlockchainService;
  private notificationService: NotificationService;
  private schedulerService: SchedulerService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.server.corsOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.blockchainService = new BlockchainService();
    this.notificationService = new NotificationService();
    this.schedulerService = new SchedulerService();
  }

  private async initializeDatabase(): Promise<void> {
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }
  }

  private async initializeRedis(): Promise<void> {
    const isConnected = await checkRedisConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to Redis');
    }
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // CORS middleware
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        if (config.server.corsOrigins.includes(origin) || 
            config.server.nodeEnv === 'development') {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-CSRF-Token',
      ],
      exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    if (config.logging.enableHttpLogging) {
      this.app.use(requestLogger);
    }

    // Rate limiting middleware
    this.app.use(rateLimiter);

    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.server.nodeEnv,
        version: process.env.npm_package_version || '1.0.0',
      });
    });

    // API routes
    this.app.use('/api/v1', apiRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString(),
      });
    });

    // Global error handler
    this.app.use(errorHandler);
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize blockchain service
      await this.blockchainService.initialize();
      logger.info('Blockchain service initialized');

      // Initialize notification service
      await this.notificationService.initialize();
      logger.info('Notification service initialized');

      // Initialize scheduler service
      await this.schedulerService.initialize();
      logger.info('Scheduler service initialized');

      // Initialize WebSocket
      initializeWebSocket(this.io);
      logger.info('WebSocket service initialized');

    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      // Stop accepting new connections
      this.server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Close WebSocket connections
          this.io.close();
          logger.info('WebSocket server closed');

          // Stop services
          await this.blockchainService.destroy();
          await this.notificationService.destroy();
          await this.schedulerService.destroy();
          logger.info('Services stopped');

          // Close database connections
          await disconnectDatabase();
          await disconnectRedis();
          logger.info('Database connections closed');

          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forceful shutdown - timeout exceeded');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions and rejections
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });
  }

  public async start(): Promise<void> {
    try {
      logger.info('Starting FreelanceDAO Backend Server...');

      // Initialize database
      await this.initializeDatabase();
      logger.info('Database initialized');

      // Initialize Redis
      await this.initializeRedis();
      logger.info('Redis initialized');

      // Setup middleware
      this.setupMiddleware();
      logger.info('Middleware configured');

      // Setup routes
      this.setupRoutes();
      logger.info('Routes configured');

      // Initialize services
      await this.initializeServices();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      // Start server
      this.server.listen(config.server.port, config.server.host, () => {
        logger.info(`🚀 Server running on ${config.server.host}:${config.server.port}`);
        logger.info(`📊 Environment: ${config.server.nodeEnv}`);
        logger.info(`🔗 CORS Origins: ${config.server.corsOrigins.join(', ')}`);
        
        if (config.server.nodeEnv === 'development') {
          logger.info(`📚 API Documentation: http://${config.server.host}:${config.server.port}/api/v1/docs`);
          logger.info(`🏥 Health Check: http://${config.server.host}:${config.server.port}/health`);
        }
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start the application
const app = new Application();
app.start().catch((error) => {
  logger.error('Application startup failed:', error);
  process.exit(1);
});

export default app;