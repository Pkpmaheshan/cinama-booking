import express from 'express';
import { createBooking, getMyBookings, getAllBookings, getBookingById } from '../controllers/bookingController';
import { protect } from '../middleware/authMiddleware';
import { admin } from '../middleware/adminMiddleware';

const router = express.Router();

router.post('/', protect, createBooking);
router.get('/my', protect, getMyBookings);
router.get('/', protect, admin, getAllBookings);
router.get('/:id', protect, getBookingById);

export default router;
