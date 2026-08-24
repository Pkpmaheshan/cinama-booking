import express from 'express';
import { getDashboardStats } from '../controllers/adminController';
import { protect } from '../middleware/authMiddleware';
import { admin } from '../middleware/adminMiddleware';

const router = express.Router();

router.get('/dashboard', protect, admin, getDashboardStats);

export default router;
