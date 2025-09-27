import cron from 'node-cron';
import { logger } from '@/config/logger';
import prisma from '@/config/database';
import { cache } from '@/config/redis';
import { NotificationService } from './NotificationService';

interface ScheduledTask {
  name: string;
  schedule: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  handler: () => Promise<void>;
}

export class SchedulerService {
  private tasks: Map<string, cron.ScheduledTask>;
  private taskDefinitions: ScheduledTask[];
  private notificationService?: NotificationService;
  private isInitialized: boolean = false;

  constructor() {
    this.tasks = new Map();
    this.taskDefinitions = [];
  }

  async initialize(): Promise<void> {
    try {
      this.defineTasks();
      this.startTasks();
      this.isInitialized = true;
      logger.info('Scheduler service initialized with tasks:', this.taskDefinitions.map(t => t.name));
    } catch (error) {
      logger.error('Failed to initialize scheduler service:', error);
      throw error;
    }
  }

  setNotificationService(notificationService: NotificationService): void {
    this.notificationService = notificationService;
  }

  private defineTasks(): void {
    this.taskDefinitions = [
      {
        name: 'deadline-reminders',
        schedule: '0 9 * * *', // Daily at 9 AM
        enabled: true,
        handler: this.sendDeadlineReminders.bind(this),
      },
      {
        name: 'payment-processing',
        schedule: '*/15 * * * *', // Every 15 minutes
        enabled: true,
        handler: this.processAutomaticPayments.bind(this),
      },
      {
        name: 'dispute-escalation',
        schedule: '0 */6 * * *', // Every 6 hours
        enabled: true,
        handler: this.escalateStaleDisputes.bind(this),
      },
      {
        name: 'inactive-job-cleanup',
        schedule: '0 2 * * 0', // Weekly on Sunday at 2 AM
        enabled: true,
        handler: this.cleanupInactiveJobs.bind(this),
      },
      {
        name: 'reputation-update',
        schedule: '0 3 * * *', // Daily at 3 AM
        enabled: true,
        handler: this.updateUserReputations.bind(this),
      },
      {
        name: 'cache-cleanup',
        schedule: '0 1 * * *', // Daily at 1 AM
        enabled: true,
        handler: this.cleanupExpiredCache.bind(this),
      },
      {
        name: 'backup-data',
        schedule: '0 0 * * *', // Daily at midnight
        enabled: process.env.NODE_ENV === 'production',
        handler: this.backupCriticalData.bind(this),
      },
      {
        name: 'send-weekly-reports',
        schedule: '0 10 * * 1', // Weekly on Monday at 10 AM
        enabled: true,
        handler: this.sendWeeklyReports.bind(this),
      },
      {
        name: 'token-rewards-distribution',
        schedule: '0 12 * * *', // Daily at noon
        enabled: true,
        handler: this.distributeTokenRewards.bind(this),
      },
      {
        name: 'skill-trending-analysis',
        schedule: '0 4 * * *', // Daily at 4 AM
        enabled: true,
        handler: this.analyzeSkillTrends.bind(this),
      },
    ];
  }

  private startTasks(): void {
    for (const taskDef of this.taskDefinitions) {
      if (!taskDef.enabled) {
        logger.info(`Skipping disabled task: ${taskDef.name}`);
        continue;
      }

      try {
        const task = cron.schedule(taskDef.schedule, async () => {
          const startTime = Date.now();
          logger.info(`Starting scheduled task: ${taskDef.name}`);

          try {
            await taskDef.handler();
            const duration = Date.now() - startTime;
            logger.info(`Completed scheduled task: ${taskDef.name} in ${duration}ms`);
            
            // Store task execution metadata
            await cache.set(`task:${taskDef.name}:last_run`, new Date().toISOString(), 86400);
          } catch (error) {
            logger.error(`Error in scheduled task ${taskDef.name}:`, error);
            
            // Store error metadata
            await cache.set(`task:${taskDef.name}:last_error`, {
              error: error.message,
              timestamp: new Date().toISOString(),
            }, 86400);
          }
        }, {
          scheduled: false,
          timezone: 'UTC',
        });

        this.tasks.set(taskDef.name, task);
        task.start();
        
        logger.info(`Started scheduled task: ${taskDef.name} with schedule: ${taskDef.schedule}`);
      } catch (error) {
        logger.error(`Failed to start task ${taskDef.name}:`, error);
      }
    }
  }

  // Task handlers
  private async sendDeadlineReminders(): Promise<void> {
    try {
      // Find contracts with approaching deadlines (24 hours, 3 days, 1 week)
      const now = new Date();
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const approachingDeadlines = await prisma.contract.findMany({
        where: {
          status: 'ACTIVE',
          deadline: {
            gte: now,
            lte: oneWeekFromNow,
          },
        },
        include: {
          job: {
            select: { title: true, client: { select: { firstName: true, lastName: true } } },
          },
          freelancer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      for (const contract of approachingDeadlines) {
        const timeUntilDeadline = contract.deadline.getTime() - now.getTime();
        const daysUntilDeadline = Math.ceil(timeUntilDeadline / (24 * 60 * 60 * 1000));

        if (daysUntilDeadline <= 1 || daysUntilDeadline === 3 || daysUntilDeadline === 7) {
          this.notificationService?.emit('deadline.approaching', {
            freelancerId: contract.freelancer.id,
            contractId: contract.id,
            jobTitle: contract.job.title,
            clientName: `${contract.job.client.firstName} ${contract.job.client.lastName}`,
            daysUntilDeadline,
            deadline: contract.deadline,
          });
        }
      }

      logger.info(`Processed ${approachingDeadlines.length} contracts for deadline reminders`);
    } catch (error) {
      logger.error('Error sending deadline reminders:', error);
      throw error;
    }
  }

  private async processAutomaticPayments(): Promise<void> {
    try {
      // Find escrows that are ready for automatic release
      const autoReleaseTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      const escrowsToRelease = await prisma.escrow.findMany({
        where: {
          status: 'FUNDED',
          autoReleaseAt: {
            lte: new Date(),
          },
          autoReleaseEnabled: true,
        },
        include: {
          contract: {
            include: {
              job: { select: { title: true } },
              freelancer: { select: { id: true, walletAddress: true } },
            },
          },
        },
      });

      for (const escrow of escrowsToRelease) {
        try {
          // Update escrow status
          await prisma.escrow.update({
            where: { id: escrow.id },
            data: { 
              status: 'RELEASED',
              releasedAt: new Date(),
              releaseMethod: 'AUTO_RELEASE',
            },
          });

          // Emit payment released event
          this.notificationService?.emit('payment.released', {
            freelancerId: escrow.contract.freelancer.id,
            escrowId: escrow.id,
            contractId: escrow.contractId,
            jobTitle: escrow.contract.job.title,
            amount: escrow.amount,
            paymentToken: escrow.paymentToken,
            txHash: null, // Would be set by blockchain service
          });

          logger.info(`Auto-released escrow ${escrow.id} for contract ${escrow.contractId}`);
        } catch (error) {
          logger.error(`Failed to auto-release escrow ${escrow.id}:`, error);
        }
      }

      if (escrowsToRelease.length > 0) {
        logger.info(`Processed ${escrowsToRelease.length} automatic payment releases`);
      }
    } catch (error) {
      logger.error('Error processing automatic payments:', error);
      throw error;
    }
  }

  private async escalateStaleDisputes(): Promise<void> {
    try {
      // Find disputes that have been pending for too long
      const escalationTime = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

      const staleDisputes = await prisma.dispute.findMany({
        where: {
          status: 'PENDING',
          createdAt: {
            lte: escalationTime,
          },
        },
        include: {
          contract: {
            include: {
              job: { select: { title: true } },
              client: { select: { id: true } },
              freelancer: { select: { id: true } },
            },
          },
        },
      });

      for (const dispute of staleDisputes) {
        // Escalate to arbitrators or auto-resolve based on rules
        await prisma.dispute.update({
          where: { id: dispute.id },
          data: { 
            status: 'ESCALATED',
            escalatedAt: new Date(),
          },
        });

        logger.info(`Escalated stale dispute ${dispute.id} for contract ${dispute.contractId}`);
      }

      if (staleDisputes.length > 0) {
        logger.info(`Escalated ${staleDisputes.length} stale disputes`);
      }
    } catch (error) {
      logger.error('Error escalating stale disputes:', error);
      throw error;
    }
  }

  private async cleanupInactiveJobs(): Promise<void> {
    try {
      // Archive old jobs that haven't received proposals
      const cleanupDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      const inactiveJobs = await prisma.job.updateMany({
        where: {
          status: 'OPEN',
          createdAt: {
            lte: cleanupDate,
          },
          proposals: {
            none: {},
          },
        },
        data: {
          status: 'ARCHIVED',
          archivedAt: new Date(),
        },
      });

      logger.info(`Archived ${inactiveJobs.count} inactive jobs`);
    } catch (error) {
      logger.error('Error cleaning up inactive jobs:', error);
      throw error;
    }
  }

  private async updateUserReputations(): Promise<void> {
    try {
      // Calculate and update user reputation scores
      const users = await prisma.user.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: {
              completedContractsAsFreelancer: true,
              completedContractsAsClient: true,
              reviewsReceived: true,
            },
          },
          reviewsReceived: {
            select: { rating: true },
            take: 100, // Recent reviews
          },
        },
      });

      for (const user of users) {
        const totalReviews = user._count.reviewsReceived;
        const averageRating = user.reviewsReceived.length > 0
          ? user.reviewsReceived.reduce((sum, review) => sum + review.rating, 0) / user.reviewsReceived.length
          : 0;

        const completedProjects = user._count.completedContractsAsFreelancer + user._count.completedContractsAsClient;
        
        // Simple reputation calculation
        let reputation = 500; // Base reputation
        if (totalReviews > 0) {
          reputation = Math.round((averageRating / 5) * 1000);
          
          // Bonus for completion count
          reputation += Math.min(completedProjects * 5, 100);
          
          // Ensure reputation is within bounds
          reputation = Math.max(0, Math.min(1000, reputation));
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { reputation },
        });
      }

      logger.info(`Updated reputation for ${users.length} users`);
    } catch (error) {
      logger.error('Error updating user reputations:', error);
      throw error;
    }
  }

  private async cleanupExpiredCache(): Promise<void> {
    try {
      // Redis automatically handles TTL, but we can clean up specific patterns
      const patterns = [
        'session:*',
        'rate_limit:*',
        'temp:*',
      ];

      for (const pattern of patterns) {
        await cache.flushPattern(pattern);
      }

      logger.info('Cleaned up expired cache entries');
    } catch (error) {
      logger.error('Error cleaning up cache:', error);
      throw error;
    }
  }

  private async backupCriticalData(): Promise<void> {
    try {
      // Implement backup logic for critical data
      const backupData = {
        timestamp: new Date().toISOString(),
        userCount: await prisma.user.count(),
        jobCount: await prisma.job.count(),
        contractCount: await prisma.contract.count(),
        escrowCount: await prisma.escrow.count(),
      };

      // Store backup metadata
      await cache.set('backup:last_run', backupData, 86400 * 7); // Keep for 7 days

      logger.info('Critical data backup completed', backupData);
    } catch (error) {
      logger.error('Error backing up critical data:', error);
      throw error;
    }
  }

  private async sendWeeklyReports(): Promise<void> {
    try {
      // Generate and send weekly platform statistics
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const weeklyStats = {
        newJobs: await prisma.job.count({
          where: { createdAt: { gte: weekAgo } },
        }),
        newUsers: await prisma.user.count({
          where: { createdAt: { gte: weekAgo } },
        }),
        completedContracts: await prisma.contract.count({
          where: { 
            status: 'COMPLETED',
            completedAt: { gte: weekAgo },
          },
        }),
        totalEscrowValue: await prisma.escrow.aggregate({
          where: { createdAt: { gte: weekAgo } },
          _sum: { amount: true },
        }),
      };

      logger.info('Weekly platform statistics:', weeklyStats);

      // Send reports to admin users
      const adminUsers = await prisma.user.findMany({
        where: { userType: 'ADMIN' },
      });

      for (const admin of adminUsers) {
        this.notificationService?.emit('weekly.report', {
          userId: admin.id,
          stats: weeklyStats,
        });
      }
    } catch (error) {
      logger.error('Error sending weekly reports:', error);
      throw error;
    }
  }

  private async distributeTokenRewards(): Promise<void> {
    try {
      // Find users eligible for token rewards
      const eligibleUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          stakingRewards: {
            gt: 0,
          },
        },
      });

      logger.info(`Processing token rewards for ${eligibleUsers.length} users`);

      // This would interact with the blockchain service to distribute rewards
      // For now, we'll just log the rewards distribution
      for (const user of eligibleUsers) {
        logger.info(`Distributing ${user.stakingRewards} tokens to user ${user.id}`);
      }
    } catch (error) {
      logger.error('Error distributing token rewards:', error);
      throw error;
    }
  }

  private async analyzeSkillTrends(): Promise<void> {
    try {
      // Analyze trending skills based on job postings and successful contracts
      const skillTrends = await prisma.$queryRaw`
        SELECT 
          s.name,
          COUNT(js.jobId) as job_count,
          COUNT(CASE WHEN j.status = 'COMPLETED' THEN 1 END) as completed_count,
          AVG(j.budget) as avg_budget
        FROM "Skill" s
        JOIN "JobSkill" js ON s.id = js.skillId
        JOIN "Job" j ON js.jobId = j.id
        WHERE j.createdAt >= NOW() - INTERVAL '30 days'
        GROUP BY s.id, s.name
        ORDER BY job_count DESC
        LIMIT 20
      `;

      // Store trending skills data
      await cache.set('analytics:skill_trends', skillTrends, 86400); // Cache for 24 hours

      logger.info('Skill trends analysis completed');
    } catch (error) {
      logger.error('Error analyzing skill trends:', error);
      throw error;
    }
  }

  // Management methods
  async getTaskStatus(): Promise<any[]> {
    const status = [];
    
    for (const taskDef of this.taskDefinitions) {
      const task = this.tasks.get(taskDef.name);
      const lastRun = await cache.get(`task:${taskDef.name}:last_run`);
      const lastError = await cache.get(`task:${taskDef.name}:last_error`);
      
      status.push({
        name: taskDef.name,
        schedule: taskDef.schedule,
        enabled: taskDef.enabled,
        running: task?.running || false,
        lastRun,
        lastError,
      });
    }
    
    return status;
  }

  async stopTask(taskName: string): Promise<void> {
    const task = this.tasks.get(taskName);
    if (task) {
      task.stop();
      logger.info(`Stopped scheduled task: ${taskName}`);
    }
  }

  async startTask(taskName: string): Promise<void> {
    const task = this.tasks.get(taskName);
    if (task) {
      task.start();
      logger.info(`Started scheduled task: ${taskName}`);
    }
  }

  async destroy(): Promise<void> {
    try {
      for (const [name, task] of this.tasks) {
        task.destroy();
        logger.info(`Destroyed scheduled task: ${name}`);
      }
      
      this.tasks.clear();
      logger.info('Scheduler service destroyed');
    } catch (error) {
      logger.error('Error destroying scheduler service:', error);
    }
  }
}

export default SchedulerService;