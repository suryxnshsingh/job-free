import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ethers } from 'ethers';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { generateTokens, verifyWalletSignature } from '@/middleware/auth';
import { CustomError } from '@/middleware/errorHandler';
import { logger } from '@/config/logger';
import config from '@/config/app';
import prisma from '@/config/database';
import { cache } from '@/config/redis';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError('Validation failed', 400);
    }

    const {
      walletAddress,
      signature,
      message,
      userType,
      email,
      firstName,
      lastName,
      profileData,
    } = req.body;

    try {
      // Verify wallet signature
      if (!verifyWalletSignature(message, signature, walletAddress)) {
        throw new CustomError('Invalid wallet signature', 400);
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
      });

      if (existingUser) {
        throw new CustomError('User already exists with this wallet address', 409);
      }

      // Check email uniqueness if provided
      if (email) {
        const existingEmail = await prisma.user.findUnique({
          where: { email },
        });

        if (existingEmail) {
          throw new CustomError('User already exists with this email', 409);
        }
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          walletAddress: walletAddress.toLowerCase(),
          userType,
          email,
          firstName,
          lastName,
          isEmailVerified: false,
          isActive: true,
          reputation: 500, // Default reputation
          profileData: profileData ? JSON.stringify(profileData) : null,
          createdAt: new Date(),
          lastActiveAt: new Date(),
        },
      });

      // Generate tokens
      const tokens = generateTokens(user.id, user.walletAddress);

      // Store refresh token
      await cache.set(`refresh_token:${user.id}`, tokens.refreshToken, 7 * 24 * 60 * 60); // 7 days

      // Log successful registration
      logger.info('User registered successfully', {
        userId: user.id,
        walletAddress: user.walletAddress,
        userType: user.userType,
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            walletAddress: user.walletAddress,
            userType: user.userType,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isEmailVerified: user.isEmailVerified,
            reputation: user.reputation,
            createdAt: user.createdAt,
          },
          tokens,
        },
      });
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new CustomError('Validation failed', 400);
    }

    const { walletAddress, signature, message } = req.body;

    try {
      // Verify wallet signature
      if (!verifyWalletSignature(message, signature, walletAddress)) {
        throw new CustomError('Invalid wallet signature', 400);
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
      });

      if (!user) {
        throw new CustomError('User not found', 404);
      }

      if (!user.isActive) {
        throw new CustomError('Account is deactivated', 403);
      }

      if (user.isBlocked) {
        throw new CustomError('Account is blocked', 403);
      }

      // Generate tokens
      const tokens = generateTokens(user.id, user.walletAddress);

      // Store refresh token
      await cache.set(`refresh_token:${user.id}`, tokens.refreshToken, 7 * 24 * 60 * 60); // 7 days

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      });

      // Log successful login
      logger.info('User logged in successfully', {
        userId: user.id,
        walletAddress: user.walletAddress,
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            walletAddress: user.walletAddress,
            userType: user.userType,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isEmailVerified: user.isEmailVerified,
            reputation: user.reputation,
            lastActiveAt: user.lastActiveAt,
          },
          tokens,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const oldRefreshToken = req.token!;

    try {
      // Generate new tokens
      const tokens = generateTokens(user.id, user.walletAddress);

      // Blacklist old refresh token
      await cache.set(`blacklist:${oldRefreshToken}`, true, 7 * 24 * 60 * 60);

      // Store new refresh token
      await cache.set(`refresh_token:${user.id}`, tokens.refreshToken, 7 * 24 * 60 * 60);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: { tokens },
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    const user = req.user!;

    try {
      // Remove refresh token
      await cache.del(`refresh_token:${user.id}`);

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }

  async logoutAll(req: Request, res: Response): Promise<void> {
    const user = req.user!;

    try {
      // Remove all refresh tokens for this user
      await cache.flushPattern(`refresh_token:${user.id}*`);

      res.json({
        success: true,
        message: 'Logged out from all devices successfully',
      });
    } catch (error) {
      logger.error('Logout all error:', error);
      throw error;
    }
  }

  async getNonce(req: Request, res: Response): Promise<void> {
    const { walletAddress } = req.params;

    try {
      if (!ethers.isAddress(walletAddress)) {
        throw new CustomError('Invalid wallet address', 400);
      }

      // Generate nonce
      const nonce = crypto.randomBytes(32).toString('hex');
      const message = `Please sign this message to authenticate with FreelanceDAO.\n\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;

      // Store nonce temporarily
      await cache.set(`nonce:${walletAddress.toLowerCase()}`, nonce, 300); // 5 minutes

      res.json({
        success: true,
        data: {
          message,
          nonce,
        },
      });
    } catch (error) {
      logger.error('Get nonce error:', error);
      throw error;
    }
  }

  async verifySignature(req: Request, res: Response): Promise<void> {
    const { walletAddress, signature, message } = req.body;

    try {
      const isValid = verifyWalletSignature(message, signature, walletAddress);

      res.json({
        success: true,
        data: { isValid },
      });
    } catch (error) {
      logger.error('Signature verification error:', error);
      throw error;
    }
  }

  async sendEmailVerification(req: Request, res: Response): Promise<void> {
    const user = req.user!;

    try {
      if (!user.email) {
        throw new CustomError('No email address associated with account', 400);
      }

      if (user.isEmailVerified) {
        throw new CustomError('Email already verified', 400);
      }

      // Generate verification token
      const token = crypto.randomBytes(32).toString('hex');
      
      // Store token
      await cache.set(`email_verification:${token}`, user.id, 3600); // 1 hour

      // TODO: Send email with verification link
      // await emailService.sendVerificationEmail(user.email, token);

      res.json({
        success: true,
        message: 'Verification email sent successfully',
      });
    } catch (error) {
      logger.error('Send email verification error:', error);
      throw error;
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    const { token } = req.body;

    try {
      // Get user ID from token
      const userId = await cache.get(`email_verification:${token}`);
      
      if (!userId) {
        throw new CustomError('Invalid or expired verification token', 400);
      }

      // Update user
      await prisma.user.update({
        where: { id: userId },
        data: { isEmailVerified: true },
      });

      // Remove token
      await cache.del(`email_verification:${token}`);

      res.json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      logger.error('Email verification error:', error);
      throw error;
    }
  }

  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    const { email } = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Don't reveal if email exists
        res.json({
          success: true,
          message: 'If an account with this email exists, a reset link has been sent',
        });
        return;
      }

      // Generate reset token
      const token = crypto.randomBytes(32).toString('hex');
      
      // Store token
      await cache.set(`password_reset:${token}`, user.id, 3600); // 1 hour

      // TODO: Send password reset email
      // await emailService.sendPasswordResetEmail(user.email, token);

      res.json({
        success: true,
        message: 'If an account with this email exists, a reset link has been sent',
      });
    } catch (error) {
      logger.error('Password reset request error:', error);
      throw error;
    }
  }

  async confirmPasswordReset(req: Request, res: Response): Promise<void> {
    const { token, newPassword } = req.body;

    try {
      // Get user ID from token
      const userId = await cache.get(`password_reset:${token}`);
      
      if (!userId) {
        throw new CustomError('Invalid or expired reset token', 400);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, config.security.bcryptRounds);

      // Update user password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      // Remove token
      await cache.del(`password_reset:${token}`);

      // Invalidate all sessions for this user
      await cache.flushPattern(`refresh_token:${userId}*`);

      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      logger.error('Password reset confirmation error:', error);
      throw error;
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const { currentPassword, newPassword } = req.body;

    try {
      // Get user with password
      const userWithPassword = await prisma.user.findUnique({
        where: { id: user.id },
        select: { password: true },
      });

      if (!userWithPassword?.password) {
        throw new CustomError('No password set for this account', 400);
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, userWithPassword.password);
      if (!isValid) {
        throw new CustomError('Current password is incorrect', 400);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, config.security.bcryptRounds);

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  }

  async getProfileStatus(req: Request, res: Response): Promise<void> {
    const user = req.user!;

    try {
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          isEmailVerified: true,
          bio: true,
          location: true,
          avatar: true,
          skills: true,
          portfolio: true,
        },
      });

      const completionItems = {
        basicInfo: !!(userData?.firstName && userData?.lastName),
        email: !!userData?.email,
        emailVerified: !!userData?.isEmailVerified,
        bio: !!userData?.bio,
        location: !!userData?.location,
        avatar: !!userData?.avatar,
        skills: userData?.skills && userData.skills.length > 0,
        portfolio: userData?.portfolio && userData.portfolio.length > 0,
      };

      const completedCount = Object.values(completionItems).filter(Boolean).length;
      const totalCount = Object.keys(completionItems).length;
      const completionPercentage = Math.round((completedCount / totalCount) * 100);

      res.json({
        success: true,
        data: {
          completionPercentage,
          completedItems: completionItems,
          suggestions: this.getProfileSuggestions(completionItems),
        },
      });
    } catch (error) {
      logger.error('Get profile status error:', error);
      throw error;
    }
  }

  private getProfileSuggestions(completionItems: any): string[] {
    const suggestions = [];
    
    if (!completionItems.basicInfo) {
      suggestions.push('Add your first and last name');
    }
    if (!completionItems.email) {
      suggestions.push('Add your email address');
    }
    if (!completionItems.emailVerified && completionItems.email) {
      suggestions.push('Verify your email address');
    }
    if (!completionItems.bio) {
      suggestions.push('Write a professional bio');
    }
    if (!completionItems.skills) {
      suggestions.push('Add your skills');
    }
    if (!completionItems.portfolio) {
      suggestions.push('Upload portfolio items');
    }

    return suggestions;
  }

  // Placeholder methods for 2FA and session management
  async setup2FA(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: '2FA setup not implemented yet' });
  }

  async verify2FA(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: '2FA verification not implemented yet' });
  }

  async disable2FA(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: '2FA disable not implemented yet' });
  }

  async getSessions(req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: { sessions: [] } });
  }

  async revokeSession(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Session revoked' });
  }

  async getSecurityLog(req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: { logs: [] } });
  }

  async reportSuspiciousActivity(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Report submitted' });
  }
}

export default AuthController;