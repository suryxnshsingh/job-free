import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Global singleton pattern for Prisma client
declare global {
  var __prisma: PrismaClient | undefined;
}

// Prisma client configuration
const prismaConfig = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: [
    {
      emit: 'event' as const,
      level: 'query' as const,
    },
    {
      emit: 'event' as const,
      level: 'error' as const,
    },
    {
      emit: 'event' as const,
      level: 'warn' as const,
    },
  ],
};

// Create or reuse Prisma client
const prisma = globalThis.__prisma || new PrismaClient(prismaConfig);

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

// Event listeners for logging
prisma.$on('query', (e) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Query: ' + e.query);
    logger.debug('Params: ' + e.params);
    logger.debug('Duration: ' + e.duration + 'ms');
  }
});

prisma.$on('error', (e) => {
  logger.error('Database error:', e);
});

prisma.$on('warn', (e) => {
  logger.warn('Database warning:', e);
});

// Connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection established successfully');
    return true;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    return false;
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
}

// Database health metrics
export async function getDatabaseMetrics() {
  try {
    const [
      userCount,
      jobCount,
      proposalCount,
      contractCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.job.count(),
      prisma.proposal.count(),
      prisma.contract.count(),
    ]);

    return {
      users: userCount,
      jobs: jobCount,
      proposals: proposalCount,
      contracts: contractCount,
      timestamp: new Date(),
    };
  } catch (error) {
    logger.error('Error fetching database metrics:', error);
    return null;
  }
}

// Transaction helper
export async function withTransaction<T>(
  fn: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(fn);
}

export default prisma;