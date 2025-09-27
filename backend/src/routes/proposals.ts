import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth';

const router = Router();

router.get('/', authMiddleware, (req, res) => {
  res.json({ message: 'Get proposals endpoint - to be implemented' });
});

router.post('/', authMiddleware, (req, res) => {
  res.json({ message: 'Create proposal endpoint - to be implemented' });
});

export default router;