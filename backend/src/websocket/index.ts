import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '@/config/logger';
import config from '@/config/app';
import prisma from '@/config/database';
import { cache } from '@/config/redis';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userType?: string;
}

interface SocketUser {
  id: string;
  socketId: string;
  userType: string;
  rooms: Set<string>;
  lastActivity: Date;
}

export class WebSocketService {
  private io: SocketIOServer;
  private authenticatedUsers: Map<string, SocketUser>;
  private socketToUser: Map<string, string>;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.authenticatedUsers = new Map();
    this.socketToUser = new Map();
  }

  initialize(): void {
    this.setupMiddleware();
    this.setupEventHandlers();
    logger.info('WebSocket service initialized');
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const payload = jwt.verify(token, config.jwt.secret) as any;
        
        if (payload.tokenType !== 'access') {
          return next(new Error('Invalid token type'));
        }

        // Check if token is blacklisted
        const isBlacklisted = await cache.exists(`blacklist:${token}`);
        if (isBlacklisted) {
          return next(new Error('Token has been revoked'));
        }

        // Get user data
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            walletAddress: true,
            userType: true,
            isBlocked: true,
            isActive: true,
          },
        });

        if (!user || user.isBlocked || !user.isActive) {
          return next(new Error('User not found or inactive'));
        }

        // Attach user info to socket
        socket.userId = user.id;
        socket.userType = user.userType;

        next();
      } catch (error) {
        logger.error('WebSocket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Rate limiting middleware
    this.io.use((socket, next) => {
      const userId = (socket as AuthenticatedSocket).userId;
      if (userId) {
        // Implement connection rate limiting per user
        cache.checkRateLimit(`ws_connect:${userId}`, 10, 60).then((result) => {
          if (!result.allowed) {
            return next(new Error('Too many connections'));
          }
          next();
        }).catch(() => next(new Error('Rate limit check failed')));
      } else {
        next();
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;
    const userType = socket.userType!;

    logger.info(`User ${userId} connected via WebSocket`, {
      socketId: socket.id,
      userType,
    });

    // Store user connection info
    const userInfo: SocketUser = {
      id: userId,
      socketId: socket.id,
      userType,
      rooms: new Set(),
      lastActivity: new Date(),
    };

    this.authenticatedUsers.set(userId, userInfo);
    this.socketToUser.set(socket.id, userId);

    // Join user-specific room
    socket.join(`user:${userId}`);
    userInfo.rooms.add(`user:${userId}`);

    // Join type-specific rooms
    socket.join(`type:${userType.toLowerCase()}`);
    userInfo.rooms.add(`type:${userType.toLowerCase()}`);

    // Set up event listeners
    this.setupSocketEventListeners(socket);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Send initial data
    this.sendInitialData(socket);
  }

  private setupSocketEventListeners(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;

    // Job-related events
    socket.on('job:subscribe', (jobId: string) => {
      this.handleJobSubscription(socket, jobId);
    });

    socket.on('job:unsubscribe', (jobId: string) => {
      this.handleJobUnsubscription(socket, jobId);
    });

    // Contract-related events
    socket.on('contract:subscribe', (contractId: string) => {
      this.handleContractSubscription(socket, contractId);
    });

    socket.on('contract:unsubscribe', (contractId: string) => {
      this.handleContractUnsubscription(socket, contractId);
    });

    // Message events
    socket.on('message:send', (data) => {
      this.handleMessageSend(socket, data);
    });

    socket.on('message:typing', (data) => {
      this.handleTypingIndicator(socket, data);
    });

    socket.on('message:read', (messageId: string) => {
      this.handleMessageRead(socket, messageId);
    });

    // Notification events
    socket.on('notification:mark_read', (notificationId: string) => {
      this.handleNotificationMarkRead(socket, notificationId);
    });

    socket.on('notification:mark_all_read', () => {
      this.handleNotificationMarkAllRead(socket);
    });

    // Presence events
    socket.on('presence:update', (status: string) => {
      this.handlePresenceUpdate(socket, status);
    });

    // Heartbeat for connection health
    socket.on('ping', () => {
      socket.emit('pong');
      this.updateUserActivity(userId);
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error(`WebSocket error for user ${userId}:`, error);
    });
  }

  private async handleJobSubscription(socket: AuthenticatedSocket, jobId: string): Promise<void> {
    try {
      const userId = socket.userId!;
      
      // Verify user has access to this job
      const job = await prisma.job.findFirst({
        where: {
          id: jobId,
          OR: [
            { clientId: userId },
            { proposals: { some: { freelancerId: userId } } },
          ],
        },
      });

      if (!job) {
        socket.emit('error', { message: 'Job not found or access denied' });
        return;
      }

      const roomName = `job:${jobId}`;
      socket.join(roomName);
      
      const userInfo = this.authenticatedUsers.get(userId);
      if (userInfo) {
        userInfo.rooms.add(roomName);
      }

      socket.emit('job:subscribed', { jobId });
      logger.debug(`User ${userId} subscribed to job ${jobId}`);
    } catch (error) {
      logger.error('Error handling job subscription:', error);
      socket.emit('error', { message: 'Failed to subscribe to job' });
    }
  }

  private handleJobUnsubscription(socket: AuthenticatedSocket, jobId: string): void {
    const userId = socket.userId!;
    const roomName = `job:${jobId}`;
    
    socket.leave(roomName);
    
    const userInfo = this.authenticatedUsers.get(userId);
    if (userInfo) {
      userInfo.rooms.delete(roomName);
    }

    socket.emit('job:unsubscribed', { jobId });
    logger.debug(`User ${userId} unsubscribed from job ${jobId}`);
  }

  private async handleContractSubscription(socket: AuthenticatedSocket, contractId: string): Promise<void> {
    try {
      const userId = socket.userId!;
      
      // Verify user is part of this contract
      const contract = await prisma.contract.findFirst({
        where: {
          id: contractId,
          OR: [
            { job: { clientId: userId } },
            { freelancerId: userId },
          ],
        },
      });

      if (!contract) {
        socket.emit('error', { message: 'Contract not found or access denied' });
        return;
      }

      const roomName = `contract:${contractId}`;
      socket.join(roomName);
      
      const userInfo = this.authenticatedUsers.get(userId);
      if (userInfo) {
        userInfo.rooms.add(roomName);
      }

      socket.emit('contract:subscribed', { contractId });
      logger.debug(`User ${userId} subscribed to contract ${contractId}`);
    } catch (error) {
      logger.error('Error handling contract subscription:', error);
      socket.emit('error', { message: 'Failed to subscribe to contract' });
    }
  }

  private handleContractUnsubscription(socket: AuthenticatedSocket, contractId: string): void {
    const userId = socket.userId!;
    const roomName = `contract:${contractId}`;
    
    socket.leave(roomName);
    
    const userInfo = this.authenticatedUsers.get(userId);
    if (userInfo) {
      userInfo.rooms.delete(roomName);
    }

    socket.emit('contract:unsubscribed', { contractId });
    logger.debug(`User ${userId} unsubscribed from contract ${contractId}`);
  }

  private async handleMessageSend(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const userId = socket.userId!;
      const { recipientId, content, contractId } = data;

      // Validate and create message
      const message = await prisma.message.create({
        data: {
          senderId: userId,
          recipientId,
          content,
          contractId,
        },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
      });

      // Send to recipient if online
      this.sendToUser(recipientId, 'message:received', {
        message,
        timestamp: new Date(),
      });

      // Confirm to sender
      socket.emit('message:sent', { messageId: message.id });

      logger.debug(`Message sent from ${userId} to ${recipientId}`);
    } catch (error) {
      logger.error('Error handling message send:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private handleTypingIndicator(socket: AuthenticatedSocket, data: any): void {
    const userId = socket.userId!;
    const { recipientId, isTyping } = data;

    this.sendToUser(recipientId, 'message:typing', {
      senderId: userId,
      isTyping,
    });
  }

  private async handleMessageRead(socket: AuthenticatedSocket, messageId: string): Promise<void> {
    try {
      const userId = socket.userId!;

      await prisma.message.update({
        where: {
          id: messageId,
          recipientId: userId,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      socket.emit('message:read_confirmed', { messageId });
    } catch (error) {
      logger.error('Error marking message as read:', error);
    }
  }

  private async handleNotificationMarkRead(socket: AuthenticatedSocket, notificationId: string): Promise<void> {
    try {
      const userId = socket.userId!;

      await prisma.notification.update({
        where: {
          id: notificationId,
          userId,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      socket.emit('notification:read_confirmed', { notificationId });
    } catch (error) {
      logger.error('Error marking notification as read:', error);
    }
  }

  private async handleNotificationMarkAllRead(socket: AuthenticatedSocket): Promise<void> {
    try {
      const userId = socket.userId!;

      await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      socket.emit('notification:all_read_confirmed');
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
    }
  }

  private async handlePresenceUpdate(socket: AuthenticatedSocket, status: string): Promise<void> {
    const userId = socket.userId!;
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        presenceStatus: status,
        lastActiveAt: new Date(),
      },
    });

    // Broadcast presence update to relevant users
    socket.broadcast.emit('presence:updated', {
      userId,
      status,
      timestamp: new Date(),
    });
  }

  private async sendInitialData(socket: AuthenticatedSocket): Promise<void> {
    const userId = socket.userId!;

    try {
      // Send unread notification count
      const unreadCount = await prisma.notification.count({
        where: { userId, isRead: false },
      });

      socket.emit('notifications:unread_count', { count: unreadCount });

      // Send active contracts
      const activeContracts = await prisma.contract.findMany({
        where: {
          OR: [
            { job: { clientId: userId } },
            { freelancerId: userId },
          ],
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      socket.emit('contracts:active', { 
        contracts: activeContracts.map(c => c.id) 
      });
    } catch (error) {
      logger.error('Error sending initial data:', error);
    }
  }

  private handleDisconnection(socket: AuthenticatedSocket, reason: string): void {
    const userId = socket.userId;
    if (!userId) return;

    logger.info(`User ${userId} disconnected`, {
      socketId: socket.id,
      reason,
    });

    // Clean up user data
    this.authenticatedUsers.delete(userId);
    this.socketToUser.delete(socket.id);

    // Update user's last activity
    this.updateUserActivity(userId);
  }

  // Public methods for other services to use
  public sendToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public sendToJob(jobId: string, event: string, data: any): void {
    this.io.to(`job:${jobId}`).emit(event, data);
  }

  public sendToContract(contractId: string, event: string, data: any): void {
    this.io.to(`contract:${contractId}`).emit(event, data);
  }

  public broadcastToType(userType: string, event: string, data: any): void {
    this.io.to(`type:${userType.toLowerCase()}`).emit(event, data);
  }

  public broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  public getOnlineUsers(): string[] {
    return Array.from(this.authenticatedUsers.keys());
  }

  public isUserOnline(userId: string): boolean {
    return this.authenticatedUsers.has(userId);
  }

  private async updateUserActivity(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: new Date() },
      });
    } catch (error) {
      logger.error('Error updating user activity:', error);
    }
  }
}

let webSocketService: WebSocketService;

export const initializeWebSocket = (io: SocketIOServer): void => {
  webSocketService = new WebSocketService(io);
  webSocketService.initialize();
};

export const getWebSocketService = (): WebSocketService => {
  if (!webSocketService) {
    throw new Error('WebSocket service not initialized');
  }
  return webSocketService;
};

export default webSocketService;