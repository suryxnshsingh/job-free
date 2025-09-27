import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth';

const router = Router();

router.get('/', authMiddleware, (req, res) => {
  res.json({ message: 'Get disputes endpoint - to be implemented' });
});

router.post('/', authMiddleware, (req, res) => {
  res.json({ message: 'Create dispute endpoint - to be implemented' });
});

export default router;