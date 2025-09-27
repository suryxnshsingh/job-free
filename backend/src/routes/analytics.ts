import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth';

const router = Router();

router.get('/dashboard', authMiddleware, (req, res) => {
  res.json({ message: 'Analytics dashboard endpoint - to be implemented' });
});

export default router;