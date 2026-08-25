import express from 'express';
import { getAllShows, createShow, updateShow, deleteShow, scheduleBulkShows, getShowSeats, getTodayShows } from '../controllers/showController';
import { protect } from '../middleware/authMiddleware';
import { admin } from '../middleware/adminMiddleware';

const router = express.Router();

router.get('/', protect, admin, getAllShows);
router.post('/', protect, admin, createShow);
router.post('/schedule', protect, admin, scheduleBulkShows);
router.put('/:id', protect, admin, updateShow);
router.delete('/:id', protect, admin, deleteShow);

router.get('/today', getTodayShows);
router.get('/:showId/seats', getShowSeats);

export default router;
