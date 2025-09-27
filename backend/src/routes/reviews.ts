import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Get reviews endpoint - to be implemented' });
});

router.post('/', authMiddleware, (req, res) => {
  res.json({ message: 'Create review endpoint - to be implemented' });
});

export default router;