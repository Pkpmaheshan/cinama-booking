import express from 'express';
import { createPaymentSession, handlePayHereNotification } from '../controllers/paymentController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/create-session', protect, createPaymentSession);
router.post('/notify', express.urlencoded({ extended: true }), handlePayHereNotification);

export default router;
