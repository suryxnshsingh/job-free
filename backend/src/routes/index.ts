import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import jobRoutes from './jobs';
import proposalRoutes from './proposals';
import contractRoutes from './contracts';
import paymentRoutes from './payments';
import messageRoutes from './messages';
import notificationRoutes from './notifications';
import skillRoutes from './skills';
import reviewRoutes from './reviews';
import disputeRoutes from './disputes';
import analyticsRoutes from './analytics';
import adminRoutes from './admin';

const router = Router();

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API documentation
router.get('/docs', (req, res) => {
  res.json({
    message: 'FreelanceDAO API Documentation',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      jobs: '/api/v1/jobs',
      proposals: '/api/v1/proposals',
      contracts: '/api/v1/contracts',
      payments: '/api/v1/payments',
      messages: '/api/v1/messages',
      notifications: '/api/v1/notifications',
      skills: '/api/v1/skills',
      reviews: '/api/v1/reviews',
      disputes: '/api/v1/disputes',
      analytics: '/api/v1/analytics',
      admin: '/api/v1/admin',
    },
    documentation: 'https://docs.freelancedao.com/api',
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/jobs', jobRoutes);
router.use('/proposals', proposalRoutes);
router.use('/contracts', contractRoutes);
router.use('/payments', paymentRoutes);
router.use('/messages', messageRoutes);
router.use('/notifications', notificationRoutes);
router.use('/skills', skillRoutes);
router.use('/reviews', reviewRoutes);
router.use('/disputes', disputeRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);

export { router as apiRoutes };
export default router;