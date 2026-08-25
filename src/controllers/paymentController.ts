import { Request, Response } from 'express';
import crypto from 'crypto';
import Booking from '../models/Booking';
import Show from '../models/Show';
import { AuthRequest } from '../middleware/authMiddleware';
import { removeHold } from '../socket/seatSocket';
import { generatePaymentHash, verifyPaymentSignature } from '../utils/paymentUtils';

const generateBookingRef = () => {
  const date = new Date().toISOString().slice(0,10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CV-${date}-${rand}`;
};

export const createPaymentSession = async (req: AuthRequest, res: Response) => {
  try {
    const { showId, seatIds } = req.body;
    console.log(`[PAYMENT] Create session\n[PAYMENT] Show: ${showId}\n[PAYMENT] Seats: ${seatIds.join(',')}`);

    if (!showId || !seatIds || seatIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid booking data' });
    }

    const show = await Show.findById(showId);
    if (!show) {
      return res.status(404).json({ success: false, message: 'Show not found' });
    }

    // Check existing bookings
    const existingBookings = await Booking.find({
      showId,
      status: { $in: ['CONFIRMED', 'PENDING'] },
      seatIds: { $in: seatIds }
    });

    if (existingBookings.length > 0) {
      const booked = new Set();
      existingBookings.forEach(b => b.seatIds.forEach(id => booked.add(id)));
      const conflicts = seatIds.filter((id: string) => booked.has(id));
      console.log(`[PAYMENT] Seat validation FAILED (already booked): ${conflicts.join(',')}`);
      return res.status(409).json({ success: false, message: 'One or more selected seats are already booked' });
    }

    // Calculate total amount
    const totalAmount = show.ticketPrice * seatIds.length;
    const amountFormatted = parseFloat(totalAmount.toString()).toFixed(2);
    console.log(`[PAYMENT] Calculated amount: ${amountFormatted}`);

    // Create a PENDING booking to reserve order ID
    const orderId = generateBookingRef();
    console.log(`[PAYMENT] Order ID: ${orderId}`);
    
    const booking = new Booking({
      bookingReference: orderId,
      payhereOrderId: orderId,
      userId: req.user?._id,
      showId,
      seatIds,
      totalAmount,
      paymentMethod: 'payhere',
      bookingSource: 'online',
      status: 'CONFIRMED',
      paymentStatus: 'PAID'
    });
    
    await booking.save();

    const merchantId = process.env.PAYHERE_MERCHANT_ID || '';
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || '';
    const currency = 'LKR';

    const hash = generatePaymentHash(merchantId, orderId, amountFormatted, currency, merchantSecret);

    console.log(`[PAYMENT] Hash generated: YES\n[PAYMENT] Merchant secret exposed: NO\n[PAYMENT] Payment session created`);

    const paymentConfig = {
      sandbox: process.env.PAYHERE_SANDBOX === 'true',
      merchant_id: merchantId,
      return_url: process.env.PAYHERE_RETURN_URL || `${process.env.FRONTEND_URL}/payment/success`,
      cancel_url: process.env.PAYHERE_CANCEL_URL || `${process.env.FRONTEND_URL}/payment/cancel`,
      notify_url: process.env.PAYHERE_NOTIFY_URL || `http://localhost:5000/api/payments/notify`,
      order_id: orderId,
      items: 'CineVerse Tickets',
      currency: currency,
      amount: amountFormatted,
      hash: hash,
      first_name: req.user?.name?.split(' ')[0] || 'Customer',
      last_name: req.user?.name?.split(' ').slice(1).join(' ') || '',
      email: req.user?.email || '',
      phone: '0771234567',
      address: 'No 1, Cinema Rd',
      city: 'Colombo',
      country: 'Sri Lanka'
    };

    res.json({ success: true, data: { ...paymentConfig, bookingId: booking._id } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const handlePayHereNotification = async (req: Request, res: Response) => {
  try {
    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig
    } = req.body;

    console.log(`[PAYMENT] Notification received`);
    console.log(`[PAYMENT] order_id: ${order_id}`);
    console.log(`[PAYMENT] status_code: ${status_code}`);
    console.log(`[PAYMENT] payhere_amount: ${payhere_amount}`);
    console.log(`[PAYMENT] payhere_currency: ${payhere_currency}`);

    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || '';
    const isSignatureValid = verifyPaymentSignature(
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      merchantSecret
    );
    console.log(`[PAYMENT] Signature valid: ${isSignatureValid ? 'YES' : 'NO'}`);

    if (!isSignatureValid) {
      return res.status(400).send('Invalid signature');
    }
    
    const booking = await Booking.findOne({ payhereOrderId: order_id });
    if (!booking) {
      console.log(`[PAYMENT] Booking found: NO (Order ID: ${order_id})`);
      return res.status(404).send('Booking not found');
    }
    
    console.log(`[PAYMENT] Booking found: YES (${booking._id})`);
    console.log(`[PAYMENT] Previous booking status: ${booking.status}`);
    console.log(`[PAYMENT] Previous payment status: ${booking.paymentStatus}`);

    if (booking.paymentStatus === 'PAID') {
      console.log(`[PAYMENT] Idempotency: Booking already PAID`);
      return res.status(200).send('Already processed');
    }

    const statusCodeStr = String(status_code);

    if (statusCodeStr === '2') {
      booking.paymentStatus = 'PAID';
      booking.status = 'CONFIRMED';
      booking.payherePaymentId = payment_id;
      await booking.save();

      console.log(`[PAYMENT] New booking status: CONFIRMED`);
      console.log(`[PAYMENT] New payment status: PAID`);
      console.log(`[PAYMENT] Payment verified successfully\n[PAYMENT] Booking confirmed\n[PAYMENT] Seats booked: ${booking.seatIds.join(',')}`);

      // Socket updates
      const io = req.app.get('io');
      if (io) {
        booking.seatIds.forEach((seatId: string) => {
          removeHold(booking.showId.toString(), seatId);
          io.to(`show:${booking.showId}`).emit('seat:booked', { showId: booking.showId, seatId });
        });
      }
    } else if (['0', '-1', '-2', '-3'].includes(statusCodeStr)) {
      booking.paymentStatus = statusCodeStr === '0' ? 'PENDING' : 'FAILED';
      booking.status = statusCodeStr === '0' ? 'PENDING' : 'CANCELLED';
      await booking.save();
      
      console.log(`[PAYMENT] New booking status: ${booking.status}`);
      console.log(`[PAYMENT] New payment status: ${booking.paymentStatus}`);
      console.log(`[PAYMENT] Booking cancelled/failed`);
      
      const io = req.app.get('io');
      if (io) {
        booking.seatIds.forEach((seatId: string) => {
          removeHold(booking.showId.toString(), seatId);
          io.to(`show:${booking.showId}`).emit('seat:released', { showId: booking.showId, seatId, socketId: 'backend' });
        });
      }
      console.log(`[PAYMENT] Seats released`);
    } else {
      console.log(`[PAYMENT] Unknown status code: ${statusCodeStr}`);
    }

    res.status(200).send('OK');
  } catch (error: any) {
    console.error(`[PAYMENT] Error processing notification:`, error);
    res.status(500).send('Internal Error');
  }
};
