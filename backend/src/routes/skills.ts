import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Get skills endpoint - to be implemented' });
});

export default router;