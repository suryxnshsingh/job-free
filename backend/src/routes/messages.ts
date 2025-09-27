import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth';

const router = Router();

router.get('/', authMiddleware, (req, res) => {
  res.json({ message: 'Get messages endpoint - to be implemented' });
});

export default router;