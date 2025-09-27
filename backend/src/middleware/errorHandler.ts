import { Request, Response, NextFunction } from 'express';
import { logger } from '@/config/logger';
import { Prisma } from '@prisma/client';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export const createError = (message: string, statusCode: number = 500): CustomError => {
  return new CustomError(message, statusCode);
};

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let details: any = undefined;

  // Log the error
  logger.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query,
  });

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Duplicate entry found';
        details = {
          field: error.meta?.target,
          code: 'DUPLICATE_ENTRY',
        };
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Record not found';
        details = {
          code: 'RECORD_NOT_FOUND',
        };
        break;
      case 'P2014':
        statusCode = 400;
        message = 'Invalid relation';
        details = {
          code: 'INVALID_RELATION',
        };
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Foreign key constraint failed';
        details = {
          code: 'FOREIGN_KEY_CONSTRAINT',
          field: error.meta?.field_name,
        };
        break;
      default:
        statusCode = 500;
        message = 'Database operation failed';
        details = {
          code: 'DATABASE_ERROR',
        };
    }
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid data provided';
    details = {
      code: 'VALIDATION_ERROR',
    };
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    details = {
      code: 'INVALID_TOKEN',
    };
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    details = {
      code: 'TOKEN_EXPIRED',
    };
  }

  // Handle validation errors (from express-validator)
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = {
      code: 'VALIDATION_FAILED',
    };
  }

  // Handle multer errors (file upload)
  if (error.name === 'MulterError') {
    statusCode = 400;
    switch ((error as any).code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      default:
        message = 'File upload error';
    }
    details = {
      code: 'FILE_UPLOAD_ERROR',
    };
  }

  // Don't expose sensitive error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
    details = undefined;
  }

  const errorResponse: any = {
    error: {
      message,
      code: details?.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
    },
  };

  if (details && process.env.NODE_ENV !== 'production') {
    errorResponse.error.details = details;
  }

  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
};

// Async error handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not found handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new CustomError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

export default errorHandler;