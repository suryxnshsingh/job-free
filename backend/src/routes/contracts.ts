import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth';

const router = Router();

router.get('/', authMiddleware, (req, res) => {
  res.json({ message: 'Get contracts endpoint - to be implemented' });
});

router.get('/:id', authMiddleware, (req, res) => {
  res.json({ message: 'Get contract by ID endpoint - to be implemented' });
});

export default router;