import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware, refreshTokenMiddleware, logoutMiddleware } from '@/middleware/auth';
import { authRateLimiter } from '@/middleware/rateLimiter';
import { asyncHandler } from '@/middleware/errorHandler';
import { AuthController } from '@/controllers/AuthController';

const router = Router();
const authController = new AuthController();

// Validation middleware
const registerValidation = [
  body('walletAddress')
    .isEthereumAddress()
    .withMessage('Invalid wallet address'),
  body('signature')
    .notEmpty()
    .withMessage('Signature is required'),
  body('message')
    .notEmpty()
    .withMessage('Message is required'),
  body('userType')
    .isIn(['CLIENT', 'FREELANCER', 'BOTH'])
    .withMessage('Invalid user type'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email address'),
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be 1-50 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be 1-50 characters'),
];

const loginValidation = [
  body('walletAddress')
    .isEthereumAddress()
    .withMessage('Invalid wallet address'),
  body('signature')
    .notEmpty()
    .withMessage('Signature is required'),
  body('message')
    .notEmpty()
    .withMessage('Message is required'),
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
];

const resetPasswordValidation = [
  body('email')
    .isEmail()
    .withMessage('Invalid email address'),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain uppercase, lowercase, number and special character'),
];

// Public routes
router.post('/register', 
  authRateLimiter,
  registerValidation,
  asyncHandler(authController.register.bind(authController))
);

router.post('/login',
  authRateLimiter,
  loginValidation,
  asyncHandler(authController.login.bind(authController))
);

router.post('/refresh',
  authRateLimiter,
  refreshTokenValidation,
  refreshTokenMiddleware,
  asyncHandler(authController.refreshToken.bind(authController))
);

router.post('/logout',
  authMiddleware,
  logoutMiddleware,
  asyncHandler(authController.logout.bind(authController))
);

router.post('/logout-all',
  authMiddleware,
  asyncHandler(authController.logoutAll.bind(authController))
);

// Wallet authentication
router.get('/nonce/:walletAddress',
  asyncHandler(authController.getNonce.bind(authController))
);

router.post('/verify-signature',
  loginValidation,
  asyncHandler(authController.verifySignature.bind(authController))
);

// Email verification
router.post('/send-verification',
  authMiddleware,
  asyncHandler(authController.sendEmailVerification.bind(authController))
);

router.post('/verify-email',
  body('token').notEmpty().withMessage('Verification token is required'),
  asyncHandler(authController.verifyEmail.bind(authController))
);

// Password management (for users who also use email/password)
router.post('/reset-password',
  authRateLimiter,
  resetPasswordValidation,
  asyncHandler(authController.requestPasswordReset.bind(authController))
);

router.post('/reset-password/confirm',
  authRateLimiter,
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  asyncHandler(authController.confirmPasswordReset.bind(authController))
);

router.post('/change-password',
  authMiddleware,
  changePasswordValidation,
  asyncHandler(authController.changePassword.bind(authController))
);

// Profile completion check
router.get('/profile-status',
  authMiddleware,
  asyncHandler(authController.getProfileStatus.bind(authController))
);

// Two-factor authentication
router.post('/2fa/setup',
  authMiddleware,
  asyncHandler(authController.setup2FA.bind(authController))
);

router.post('/2fa/verify',
  authMiddleware,
  body('token').isLength({ min: 6, max: 6 }).withMessage('Invalid 2FA token'),
  asyncHandler(authController.verify2FA.bind(authController))
);

router.post('/2fa/disable',
  authMiddleware,
  body('token').isLength({ min: 6, max: 6 }).withMessage('Invalid 2FA token'),
  asyncHandler(authController.disable2FA.bind(authController))
);

// Session management
router.get('/sessions',
  authMiddleware,
  asyncHandler(authController.getSessions.bind(authController))
);

router.delete('/sessions/:sessionId',
  authMiddleware,
  asyncHandler(authController.revokeSession.bind(authController))
);

// Account security
router.get('/security-log',
  authMiddleware,
  asyncHandler(authController.getSecurityLog.bind(authController))
);

router.post('/report-suspicious-activity',
  authMiddleware,
  body('description').notEmpty().withMessage('Description is required'),
  asyncHandler(authController.reportSuspiciousActivity.bind(authController))
);

export default router;