import { EventEmitter } from 'events';
import { logger } from '@/config/logger';
import config from '@/config/app';
import prisma from '@/config/database';
import { cache } from '@/config/redis';

// Email service (would use SendGrid or similar)
interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface PushNotificationOptions {
  userId: string;
  title: string;
  message: string;
  data?: any;
  type: NotificationType;
}

interface SlackNotificationOptions {
  channel?: string;
  message: string;
  attachments?: any[];
}

enum NotificationType {
  JOB_CREATED = 'JOB_CREATED',
  PROPOSAL_RECEIVED = 'PROPOSAL_RECEIVED',
  PROPOSAL_ACCEPTED = 'PROPOSAL_ACCEPTED',
  WORK_SUBMITTED = 'WORK_SUBMITTED',
  WORK_APPROVED = 'WORK_APPROVED',
  PAYMENT_RELEASED = 'PAYMENT_RELEASED',
  DISPUTE_RAISED = 'DISPUTE_RAISED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  MILESTONE_COMPLETED = 'MILESTONE_COMPLETED',
  DEADLINE_REMINDER = 'DEADLINE_REMINDER',
  REVIEW_RECEIVED = 'REVIEW_RECEIVED',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
}

interface NotificationTemplate {
  email?: {
    subject: string;
    html: string;
    text: string;
  };
  push?: {
    title: string;
    body: string;
  };
  inApp?: {
    title: string;
    message: string;
  };
}

export class NotificationService extends EventEmitter {
  private templates: Map<NotificationType, NotificationTemplate>;
  private isInitialized: boolean = false;

  constructor() {
    super();
    this.templates = new Map();
    this.setupEventListeners();
  }

  async initialize(): Promise<void> {
    try {
      this.loadNotificationTemplates();
      this.isInitialized = true;
      logger.info('Notification service initialized');
    } catch (error) {
      logger.error('Failed to initialize notification service:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    // Listen for various application events
    this.on('job.created', (data) => this.handleJobCreated(data));
    this.on('proposal.submitted', (data) => this.handleProposalSubmitted(data));
    this.on('proposal.accepted', (data) => this.handleProposalAccepted(data));
    this.on('work.submitted', (data) => this.handleWorkSubmitted(data));
    this.on('work.approved', (data) => this.handleWorkApproved(data));
    this.on('payment.released', (data) => this.handlePaymentReleased(data));
    this.on('dispute.raised', (data) => this.handleDisputeRaised(data));
    this.on('message.received', (data) => this.handleMessageReceived(data));
    this.on('deadline.approaching', (data) => this.handleDeadlineReminder(data));
    this.on('review.received', (data) => this.handleReviewReceived(data));
  }

  private loadNotificationTemplates(): void {
    // Job created notification
    this.templates.set(NotificationType.JOB_CREATED, {
      email: {
        subject: 'New Job Posted: {{jobTitle}}',
        html: `
          <h2>New Job Opportunity</h2>
          <p>A new job has been posted that matches your skills:</p>
          <h3>{{jobTitle}}</h3>
          <p>{{jobDescription}}</p>
          <p><strong>Budget:</strong> {{budget}} {{paymentToken}}</p>
          <p><strong>Deadline:</strong> {{deadline}}</p>
          <a href="{{jobUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Job</a>
        `,
        text: 'New job posted: {{jobTitle}}. Budget: {{budget}} {{paymentToken}}. View at {{jobUrl}}',
      },
      push: {
        title: 'New Job Posted',
        body: '{{jobTitle}} - {{budget}} {{paymentToken}}',
      },
      inApp: {
        title: 'New Job Posted',
        message: '{{jobTitle}} has been posted with a budget of {{budget}} {{paymentToken}}',
      },
    });

    // Proposal received notification
    this.templates.set(NotificationType.PROPOSAL_RECEIVED, {
      email: {
        subject: 'New Proposal Received for {{jobTitle}}',
        html: `
          <h2>New Proposal Received</h2>
          <p>You have received a new proposal for your job:</p>
          <h3>{{jobTitle}}</h3>
          <p><strong>Freelancer:</strong> {{freelancerName}}</p>
          <p><strong>Bid Amount:</strong> {{bidAmount}} {{paymentToken}}</p>
          <p><strong>Delivery Time:</strong> {{deliveryTime}} days</p>
          <p>{{proposalMessage}}</p>
          <a href="{{proposalUrl}}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Proposal</a>
        `,
        text: 'New proposal from {{freelancerName}} for {{jobTitle}}. Bid: {{bidAmount}} {{paymentToken}}. View at {{proposalUrl}}',
      },
      push: {
        title: 'New Proposal Received',
        body: '{{freelancerName}} submitted a proposal for {{jobTitle}}',
      },
      inApp: {
        title: 'New Proposal',
        message: '{{freelancerName}} submitted a proposal for {{jobTitle}} - {{bidAmount}} {{paymentToken}}',
      },
    });

    // Add more templates...
    this.templates.set(NotificationType.PROPOSAL_ACCEPTED, {
      email: {
        subject: 'Congratulations! Your Proposal Was Accepted',
        html: `
          <h2>Proposal Accepted!</h2>
          <p>Great news! Your proposal has been accepted:</p>
          <h3>{{jobTitle}}</h3>
          <p><strong>Client:</strong> {{clientName}}</p>
          <p><strong>Project Value:</strong> {{bidAmount}} {{paymentToken}}</p>
          <p>You can now start working on this project. Please make sure to deliver high-quality work by the agreed deadline.</p>
          <a href="{{contractUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Contract</a>
        `,
        text: 'Your proposal for {{jobTitle}} was accepted! Contract value: {{bidAmount}} {{paymentToken}}. View at {{contractUrl}}',
      },
      push: {
        title: 'Proposal Accepted!',
        body: 'Your proposal for {{jobTitle}} was accepted',
      },
      inApp: {
        title: 'Proposal Accepted',
        message: 'Your proposal for {{jobTitle}} has been accepted by {{clientName}}',
      },
    });

    // Work submitted notification
    this.templates.set(NotificationType.WORK_SUBMITTED, {
      email: {
        subject: 'Work Submitted for {{jobTitle}}',
        html: `
          <h2>Work Submitted for Review</h2>
          <p>{{freelancerName}} has submitted work for your project:</p>
          <h3>{{jobTitle}}</h3>
          <p>Please review the submitted work and approve it if you're satisfied.</p>
          <a href="{{workUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Work</a>
        `,
        text: 'Work submitted for {{jobTitle}} by {{freelancerName}}. Review at {{workUrl}}',
      },
      push: {
        title: 'Work Submitted',
        body: '{{freelancerName}} submitted work for {{jobTitle}}',
      },
      inApp: {
        title: 'Work Submitted',
        message: '{{freelancerName}} has submitted work for {{jobTitle}}',
      },
    });

    // Payment released notification
    this.templates.set(NotificationType.PAYMENT_RELEASED, {
      email: {
        subject: 'Payment Released for {{jobTitle}}',
        html: `
          <h2>Payment Released!</h2>
          <p>Great news! Payment has been released for your completed work:</p>
          <h3>{{jobTitle}}</h3>
          <p><strong>Amount:</strong> {{amount}} {{paymentToken}}</p>
          <p><strong>Transaction Hash:</strong> {{txHash}}</p>
          <p>The payment should appear in your wallet shortly.</p>
          <a href="{{transactionUrl}}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Transaction</a>
        `,
        text: 'Payment of {{amount}} {{paymentToken}} released for {{jobTitle}}. TX: {{txHash}}',
      },
      push: {
        title: 'Payment Released!',
        body: '{{amount}} {{paymentToken}} for {{jobTitle}}',
      },
      inApp: {
        title: 'Payment Released',
        message: 'You received {{amount}} {{paymentToken}} for {{jobTitle}}',
      },
    });
  }

  // Event handlers
  private async handleJobCreated(data: any): Promise<void> {
    try {
      // Notify matching freelancers
      const matchingFreelancers = await this.findMatchingFreelancers(data);
      
      for (const freelancer of matchingFreelancers) {
        await this.sendNotification(freelancer.id, NotificationType.JOB_CREATED, data);
      }
    } catch (error) {
      logger.error('Error handling job created notification:', error);
    }
  }

  private async handleProposalSubmitted(data: any): Promise<void> {
    try {
      await this.sendNotification(data.clientId, NotificationType.PROPOSAL_RECEIVED, data);
    } catch (error) {
      logger.error('Error handling proposal submitted notification:', error);
    }
  }

  private async handleProposalAccepted(data: any): Promise<void> {
    try {
      await this.sendNotification(data.freelancerId, NotificationType.PROPOSAL_ACCEPTED, data);
    } catch (error) {
      logger.error('Error handling proposal accepted notification:', error);
    }
  }

  private async handleWorkSubmitted(data: any): Promise<void> {
    try {
      await this.sendNotification(data.clientId, NotificationType.WORK_SUBMITTED, data);
    } catch (error) {
      logger.error('Error handling work submitted notification:', error);
    }
  }

  private async handleWorkApproved(data: any): Promise<void> {
    try {
      await this.sendNotification(data.freelancerId, NotificationType.WORK_APPROVED, data);
    } catch (error) {
      logger.error('Error handling work approved notification:', error);
    }
  }

  private async handlePaymentReleased(data: any): Promise<void> {
    try {
      await this.sendNotification(data.freelancerId, NotificationType.PAYMENT_RELEASED, data);
    } catch (error) {
      logger.error('Error handling payment released notification:', error);
    }
  }

  private async handleDisputeRaised(data: any): Promise<void> {
    try {
      // Notify both parties and arbitrators
      await Promise.all([
        this.sendNotification(data.clientId, NotificationType.DISPUTE_RAISED, data),
        this.sendNotification(data.freelancerId, NotificationType.DISPUTE_RAISED, data),
        this.notifyArbitrators(data),
      ]);
    } catch (error) {
      logger.error('Error handling dispute raised notification:', error);
    }
  }

  private async handleMessageReceived(data: any): Promise<void> {
    try {
      await this.sendNotification(data.recipientId, NotificationType.MESSAGE_RECEIVED, data);
    } catch (error) {
      logger.error('Error handling message received notification:', error);
    }
  }

  private async handleDeadlineReminder(data: any): Promise<void> {
    try {
      await this.sendNotification(data.freelancerId, NotificationType.DEADLINE_REMINDER, data);
    } catch (error) {
      logger.error('Error handling deadline reminder notification:', error);
    }
  }

  private async handleReviewReceived(data: any): Promise<void> {
    try {
      const recipientId = data.reviewType === 'CLIENT_REVIEW' ? data.freelancerId : data.clientId;
      await this.sendNotification(recipientId, NotificationType.REVIEW_RECEIVED, data);
    } catch (error) {
      logger.error('Error handling review received notification:', error);
    }
  }

  // Core notification methods
  private async sendNotification(userId: string, type: NotificationType, data: any): Promise<void> {
    try {
      // Get user preferences
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { notificationSettings: true },
      });

      if (!user) {
        logger.warn(`User ${userId} not found for notification`);
        return;
      }

      const settings = user.notificationSettings;
      const template = this.templates.get(type);

      if (!template) {
        logger.warn(`No template found for notification type: ${type}`);
        return;
      }

      // Send in-app notification
      await this.createInAppNotification(userId, type, template.inApp!, data);

      // Send email notification
      if (settings?.emailEnabled && user.email && template.email) {
        await this.sendEmail({
          to: user.email,
          subject: this.replaceTemplateVariables(template.email.subject, data),
          html: this.replaceTemplateVariables(template.email.html, data),
          text: this.replaceTemplateVariables(template.email.text, data),
        });
      }

      // Send push notification
      if (settings?.pushEnabled && template.push) {
        await this.sendPushNotification({
          userId,
          title: this.replaceTemplateVariables(template.push.title, data),
          message: this.replaceTemplateVariables(template.push.body, data),
          data,
          type,
        });
      }
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  }

  private async createInAppNotification(
    userId: string,
    type: NotificationType,
    template: any,
    data: any
  ): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          userId,
          type: type.toString(),
          title: this.replaceTemplateVariables(template.title, data),
          message: this.replaceTemplateVariables(template.message, data),
          data: JSON.stringify(data),
          isRead: false,
        },
      });
    } catch (error) {
      logger.error('Error creating in-app notification:', error);
    }
  }

  private async sendEmail(options: EmailOptions): Promise<void> {
    try {
      if (!config.notifications.enableEmailNotifications) {
        logger.debug('Email notifications disabled');
        return;
      }

      // Implement email sending logic (SendGrid, SES, etc.)
      logger.info('Email sent', { to: options.to, subject: options.subject });
    } catch (error) {
      logger.error('Error sending email:', error);
    }
  }

  private async sendPushNotification(options: PushNotificationOptions): Promise<void> {
    try {
      if (!config.notifications.enablePushNotifications) {
        logger.debug('Push notifications disabled');
        return;
      }

      // Implement push notification logic (Firebase, OneSignal, etc.)
      logger.info('Push notification sent', { userId: options.userId, title: options.title });
    } catch (error) {
      logger.error('Error sending push notification:', error);
    }
  }

  // Utility methods
  private replaceTemplateVariables(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  private async findMatchingFreelancers(jobData: any): Promise<any[]> {
    try {
      // Implement skill matching logic
      return await prisma.user.findMany({
        where: {
          userType: 'FREELANCER',
          isActive: true,
          skills: {
            some: {
              skillId: {
                in: jobData.skillIds || [],
              },
            },
          },
        },
        take: 50, // Limit to prevent spam
      });
    } catch (error) {
      logger.error('Error finding matching freelancers:', error);
      return [];
    }
  }

  private async notifyArbitrators(disputeData: any): Promise<void> {
    try {
      // Implement arbitrator notification logic
      logger.info('Notifying arbitrators of new dispute:', disputeData.disputeId);
    } catch (error) {
      logger.error('Error notifying arbitrators:', error);
    }
  }

  // Public methods
  async sendSystemAnnouncement(message: string, userIds?: string[]): Promise<void> {
    try {
      const users = userIds 
        ? await prisma.user.findMany({ where: { id: { in: userIds } } })
        : await prisma.user.findMany({ where: { isActive: true } });

      for (const user of users) {
        await this.sendNotification(user.id, NotificationType.SYSTEM_ANNOUNCEMENT, {
          message,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      logger.error('Error sending system announcement:', error);
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true, readAt: new Date() },
      });
    } catch (error) {
      logger.error('Error marking notification as read:', error);
    }
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      return await prisma.notification.count({
        where: { userId, isRead: false },
      });
    } catch (error) {
      logger.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  async destroy(): Promise<void> {
    try {
      this.removeAllListeners();
      logger.info('Notification service destroyed');
    } catch (error) {
      logger.error('Error destroying notification service:', error);
    }
  }
}

export default NotificationService;