import express from 'express';
import { getHalls, getHallById, createHall, updateHall, deleteHall } from '../controllers/hallController';
import { protect } from '../middleware/authMiddleware';
import { admin } from '../middleware/adminMiddleware';

const router = express.Router();

router.get('/', getHalls);
router.get('/:id', getHallById);

router.post('/', protect, admin, createHall);
router.put('/:id', protect, admin, updateHall);
router.delete('/:id', protect, admin, deleteHall);

export default router;
