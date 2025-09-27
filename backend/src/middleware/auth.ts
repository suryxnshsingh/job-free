import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { cache } from '@/config/redis';
import { logger } from '@/config/logger';
import config from '@/config/app';
import prisma from '@/config/database';
import { CustomError } from './errorHandler';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        walletAddress: string;
        userType: string;
        isEmailVerified: boolean;
        isBlocked: boolean;
      };
      token?: string;
    }
  }
}

interface JWTPayload {
  userId: string;
  walletAddress: string;
  tokenType: 'access' | 'refresh';
  iat: number;
  exp: number;
}

interface AuthenticatedUser {
  id: string;
  walletAddress: string;
  userType: string;
  isEmailVerified: boolean;
  isBlocked: boolean;
}

// Verify JWT token
const verifyToken = (token: string, secret: string): Promise<JWTPayload> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded as JWTPayload);
      }
    });
  });
};

// Generate JWT tokens
export const generateTokens = (userId: string, walletAddress: string) => {
  const accessToken = jwt.sign(
    { userId, walletAddress, tokenType: 'access' },
    config.jwt.secret,
    { expiresIn: config.jwt.accessTokenExpiry }
  );

  const refreshToken = jwt.sign(
    { userId, walletAddress, tokenType: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshTokenExpiry }
  );

  return { accessToken, refreshToken };
};

// Verify wallet signature
export const verifyWalletSignature = (
  message: string,
  signature: string,
  address: string
): boolean => {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    logger.error('Signature verification error:', error);
    return false;
  }
};

// Main authentication middleware
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new CustomError('No token provided', 401);
    }

    const token = authHeader.substring(7);
    req.token = token;

    // Check if token is blacklisted
    const isBlacklisted = await cache.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new CustomError('Token has been revoked', 401);
    }

    // Verify token
    const payload = await verifyToken(token, config.jwt.secret);
    
    if (payload.tokenType !== 'access') {
      throw new CustomError('Invalid token type', 401);
    }

    // Check if user exists and get user data
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        walletAddress: true,
        userType: true,
        isEmailVerified: true,
        isBlocked: true,
        lastActiveAt: true,
      },
    });

    if (!user) {
      throw new CustomError('User not found', 404);
    }

    if (user.isBlocked) {
      throw new CustomError('Account has been blocked', 403);
    }

    // Update last active timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    // Attach user to request
    req.user = user as AuthenticatedUser;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new CustomError('Invalid token', 401));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new CustomError('Token expired', 401));
    }
    next(error);
  }
};

// Optional authentication middleware (doesn't throw if no token)
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    req.token = token;

    // Check if token is blacklisted
    const isBlacklisted = await cache.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      return next();
    }

    // Verify token
    const payload = await verifyToken(token, config.jwt.secret);
    
    if (payload.tokenType !== 'access') {
      return next();
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        walletAddress: true,
        userType: true,
        isEmailVerified: true,
        isBlocked: true,
      },
    });

    if (user && !user.isBlocked) {
      req.user = user as AuthenticatedUser;
    }

    next();
  } catch (error) {
    // Silently continue without authentication
    next();
  }
};

// Role-based authorization middleware
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new CustomError('Authentication required', 401));
    }

    if (!roles.includes(req.user.userType)) {
      return next(new CustomError('Insufficient permissions', 403));
    }

    next();
  };
};

// Email verification required middleware
export const requireEmailVerification = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new CustomError('Authentication required', 401));
  }

  if (!req.user.isEmailVerified) {
    return next(new CustomError('Email verification required', 403));
  }

  next();
};

// Refresh token middleware
export const refreshTokenMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new CustomError('Refresh token required', 400);
    }

    // Check if token is blacklisted
    const isBlacklisted = await cache.exists(`blacklist:${refreshToken}`);
    if (isBlacklisted) {
      throw new CustomError('Token has been revoked', 401);
    }

    // Verify refresh token
    const payload = await verifyToken(refreshToken, config.jwt.refreshSecret);
    
    if (payload.tokenType !== 'refresh') {
      throw new CustomError('Invalid token type', 401);
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        walletAddress: true,
        userType: true,
        isEmailVerified: true,
        isBlocked: true,
      },
    });

    if (!user) {
      throw new CustomError('User not found', 404);
    }

    if (user.isBlocked) {
      throw new CustomError('Account has been blocked', 403);
    }

    req.user = user as AuthenticatedUser;
    req.token = refreshToken;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new CustomError('Invalid refresh token', 401));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new CustomError('Refresh token expired', 401));
    }
    next(error);
  }
};

// Logout middleware (blacklist token)
export const logoutMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.token;
    
    if (token) {
      // Add token to blacklist
      const payload = jwt.decode(token) as JWTPayload;
      const expiryTime = payload.exp - Math.floor(Date.now() / 1000);
      
      if (expiryTime > 0) {
        await cache.set(`blacklist:${token}`, true, expiryTime);
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Check if user owns resource
export const checkResourceOwnership = (resourceField: string = 'userId') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new CustomError('Authentication required', 401));
      }

      const resourceId = req.params.id;
      if (!resourceId) {
        return next(new CustomError('Resource ID required', 400));
      }

      // This is a generic middleware - specific implementation would be in controllers
      // For now, we'll just pass through and let controllers handle ownership checks
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default authMiddleware;