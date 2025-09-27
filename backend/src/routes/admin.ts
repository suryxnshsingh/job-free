import { Router } from 'express';
import { authMiddleware, authorize } from '@/middleware/auth';

const router = Router();

// Admin only routes
router.get('/stats', authMiddleware, authorize('ADMIN'), (req, res) => {
  res.json({ message: 'Admin stats endpoint - to be implemented' });
});

router.get('/users', authMiddleware, authorize('ADMIN'), (req, res) => {
  res.json({ message: 'Admin user management endpoint - to be implemented' });
});

export default router;