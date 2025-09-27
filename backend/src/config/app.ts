import dotenv from 'dotenv';
import { logger } from './logger';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Application configuration
export const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '5000'),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },

  // Database configuration
  database: {
    url: process.env.DATABASE_URL!,
    directUrl: process.env.DIRECT_URL,
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    accessTokenExpiry: process.env.JWT_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // Blockchain configuration
  blockchain: {
    ethereumRpcUrl: process.env.ETHEREUM_RPC_URL!,
    polygonRpcUrl: process.env.POLYGON_RPC_URL!,
    sepoliaRpcUrl: process.env.SEPOLIA_RPC_URL,
    privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY,
    contracts: {
      governanceToken: process.env.GOVERNANCE_TOKEN_CONTRACT,
      userRegistry: process.env.USER_REGISTRY_CONTRACT,
      escrowManager: process.env.ESCROW_MANAGER_CONTRACT,
      disputeResolution: process.env.DISPUTE_RESOLUTION_CONTRACT,
      freelanceJob: process.env.FREELANCE_JOB_CONTRACT,
    },
  },

  // IPFS configuration
  ipfs: {
    url: process.env.IPFS_URL || 'https://ipfs.infura.io:5001/api/v0',
    projectId: process.env.IPFS_PROJECT_ID,
    projectSecret: process.env.IPFS_PROJECT_SECRET,
    gatewayUrl: process.env.IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs',
    pinataApiKey: process.env.PINATA_API_KEY,
    pinataSecretKey: process.env.PINATA_SECRET_API_KEY,
  },

  // Email configuration
  email: {
    from: process.env.FROM_EMAIL || 'noreply@freelancedao.com',
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
  },

  // File upload configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedMimeTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf,text/plain').split(','),
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '10'),
  },

  // Security configuration
  security: {
    sessionSecret: process.env.SESSION_SECRET || 'fallback-session-secret',
    sessionSecure: process.env.SESSION_SECURE === 'true',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '1800000'), // 30 minutes
  },

  // Analytics configuration
  analytics: {
    mixpanelToken: process.env.MIXPANEL_TOKEN,
    sentryDsn: process.env.SENTRY_DSN,
    enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
  },

  // Notification configuration
  notifications: {
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
    enableEmailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
    enablePushNotifications: process.env.ENABLE_PUSH_NOTIFICATIONS === 'true',
  },

  // Feature flags
  features: {
    enableAdvancedSearch: process.env.ENABLE_ADVANCED_SEARCH === 'true',
    enableDiscordIntegration: process.env.ENABLE_DISCORD_INTEGRATION === 'true',
    enableVoiceChat: process.env.ENABLE_VOICE_CHAT === 'true',
    enableTimeTracking: process.env.ENABLE_TIME_TRACKING === 'true',
    enableEscrowlessPayments: process.env.ENABLE_ESCROWLESS_PAYMENTS === 'true',
  },

  // Cache configuration
  cache: {
    defaultTtl: parseInt(process.env.CACHE_TTL || '3600'), // 1 hour
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
  },

  // Backup configuration
  backup: {
    frequency: process.env.BACKUP_FREQUENCY || 'daily',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
    storagePath: process.env.BACKUP_STORAGE_PATH || '/backups',
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableHttpLogging: process.env.ENABLE_HTTP_LOGGING !== 'false',
    enableDatabaseLogging: process.env.ENABLE_DATABASE_LOGGING === 'true',
  },
};

// Validate blockchain configuration in production
if (config.server.nodeEnv === 'production') {
  const requiredBlockchainVars = [
    'ETHEREUM_RPC_URL',
    'GOVERNANCE_TOKEN_CONTRACT',
    'USER_REGISTRY_CONTRACT',
    'ESCROW_MANAGER_CONTRACT',
    'DISPUTE_RESOLUTION_CONTRACT',
    'FREELANCE_JOB_CONTRACT',
  ];

  const missingBlockchainVars = requiredBlockchainVars.filter(
    envVar => !process.env[envVar]
  );

  if (missingBlockchainVars.length > 0) {
    logger.warn(`Missing blockchain configuration: ${missingBlockchainVars.join(', ')}`);
  }
}

// Log configuration summary
logger.info('Application configuration loaded', {
  nodeEnv: config.server.nodeEnv,
  port: config.server.port,
  features: config.features,
});

export default config;