const fs = require('fs');
const path = require('path');

const basePath = 'D:/Client Projects/Panchayu NSBM/cinemaAPI';

// 1. Update Booking.ts
let bookingContent = fs.readFileSync(path.join(basePath, 'src/models/Booking.ts'), 'utf8');
if (!bookingContent.includes('payhereOrderId')) {
  bookingContent = bookingContent.replace(
    /paymentStatus: 'PAID' \| 'PENDING' \| 'FAILED';/g,
    "paymentStatus: 'PAID' | 'PENDING' | 'FAILED';\n  payhereOrderId?: string;\n  payherePaymentId?: string;"
  );
  bookingContent = bookingContent.replace(
    /paymentStatus: \{ type: String, enum: \['PAID', 'PENDING', 'FAILED'\], default: 'PENDING' \},/g,
    "paymentStatus: { type: String, enum: ['PAID', 'PENDING', 'FAILED'], default: 'PENDING' },\n  payhereOrderId: { type: String, unique: true, sparse: true },\n  payherePaymentId: { type: String },"
  );
  fs.writeFileSync(path.join(basePath, 'src/models/Booking.ts'), bookingContent);
}

// 2. Rewrite paymentController.ts
const paymentControllerContent = `import { Request, Response } from 'express';
import crypto from 'crypto';
import Booking from '../models/Booking';
import Show from '../models/Show';
import { AuthRequest } from '../middleware/authMiddleware';
import { removeHold } from '../socket/seatSocket';

const generateBookingRef = () => {
  const date = new Date().toISOString().slice(0,10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return \`CV-\${date}-\${rand}\`;
};

export const createPaymentSession = async (req: AuthRequest, res: Response) => {
  try {
    const { showId, seatIds } = req.body;
    console.log(\`[PAYMENT] Create session\\n[PAYMENT] Show: \${showId}\\n[PAYMENT] Seats: \${seatIds.join(',')}\`);

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
      console.log(\`[PAYMENT] Seat validation FAILED (already booked): \${conflicts.join(',')}\`);
      return res.status(409).json({ success: false, message: 'One or more selected seats are already booked' });
    }

    // Calculate total amount
    const totalAmount = show.ticketPrice * seatIds.length;
    const amountFormatted = parseFloat(totalAmount.toString()).toFixed(2);
    console.log(\`[PAYMENT] Calculated amount: \${amountFormatted}\`);

    // Create a PENDING booking to reserve order ID
    const orderId = generateBookingRef();
    console.log(\`[PAYMENT] Order ID: \${orderId}\`);
    
    const booking = new Booking({
      bookingReference: orderId,
      payhereOrderId: orderId,
      userId: req.user?._id,
      showId,
      seatIds,
      totalAmount,
      paymentMethod: 'payhere',
      bookingSource: 'online',
      status: 'PENDING',
      paymentStatus: 'PENDING'
    });
    
    await booking.save();

    const merchantId = process.env.PAYHERE_MERCHANT_ID || '';
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || '';
    const currency = 'LKR';

    // Hash generation
    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const hash = crypto.createHash('md5').update(merchantId + orderId + amountFormatted + currency + hashedSecret).digest('hex').toUpperCase();

    console.log(\`[PAYMENT] Hash generated: YES\\n[PAYMENT] Merchant secret exposed: NO\\n[PAYMENT] Payment session created\`);

    const paymentConfig = {
      sandbox: process.env.PAYHERE_SANDBOX === 'true',
      merchant_id: merchantId,
      return_url: process.env.PAYHERE_RETURN_URL || \`\${process.env.FRONTEND_URL}/payment/success\`,
      cancel_url: process.env.PAYHERE_CANCEL_URL || \`\${process.env.FRONTEND_URL}/payment/cancel\`,
      notify_url: process.env.PAYHERE_NOTIFY_URL || \`http://localhost:5000/api/payments/notify\`,
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

    res.json({ success: true, data: paymentConfig });
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

    console.log(\`[PAYMENT] PayHere notification received\\n[PAYMENT] Order ID: \${order_id}\\n[PAYMENT] Payment ID: \${payment_id}\\n[PAYMENT] Status: \${status_code}\\n[PAYMENT] Amount: \${payhere_amount}\\n[PAYMENT] Currency: \${payhere_currency}\`);

    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || '';
    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const localSig = crypto.createHash('md5').update(
      merchant_id + order_id + payhere_amount + payhere_currency + status_code + hashedSecret
    ).digest('hex').toUpperCase();

    if (localSig !== md5sig) {
      console.log(\`[PAYMENT] Notification signature valid: NO\`);
      return res.status(400).send('Invalid signature');
    }
    
    console.log(\`[PAYMENT] Notification signature valid: YES\`);

    const booking = await Booking.findOne({ payhereOrderId: order_id });
    if (!booking) {
      console.log(\`[PAYMENT] Booking not found for Order ID: \${order_id}\`);
      return res.status(404).send('Booking not found');
    }

    if (booking.paymentStatus === 'PAID') {
      console.log(\`[PAYMENT] Idempotency: Booking already PAID\`);
      return res.status(200).send('Already processed');
    }

    if (status_code === '2') {
      booking.paymentStatus = 'PAID';
      booking.status = 'CONFIRMED';
      booking.payherePaymentId = payment_id;
      await booking.save();

      console.log(\`[PAYMENT] Payment verified successfully\\n[PAYMENT] Booking confirmed\\n[PAYMENT] Seats booked: \${booking.seatIds.join(',')}\`);

      // Socket updates
      const io = req.app.get('io');
      if (io) {
        booking.seatIds.forEach((seatId: string) => {
          removeHold(booking.showId.toString(), seatId);
          io.to(\`show:\${booking.showId}\`).emit('seat:booked', { showId: booking.showId, seatId });
        });
      }
    } else if (status_code === '0' || status_code === '-1' || status_code === '-2' || status_code === '-3') {
      booking.paymentStatus = status_code === '0' ? 'PENDING' : 'FAILED';
      booking.status = 'CANCELLED';
      await booking.save();
      console.log(\`[PAYMENT] Booking cancelled/failed\`);
      
      const io = req.app.get('io');
      if (io) {
        booking.seatIds.forEach((seatId: string) => {
          removeHold(booking.showId.toString(), seatId);
          io.to(\`show:\${booking.showId}\`).emit('seat:released', { showId: booking.showId, seatId, socketId: 'backend' });
        });
      }
      console.log(\`[PAYMENT] Seats released\`);
    }

    res.status(200).send('OK');
  } catch (error: any) {
    console.error(\`[PAYMENT] Error processing notification:\`, error);
    res.status(500).send('Internal Error');
  }
};
`;
fs.writeFileSync(path.join(basePath, 'src/controllers/paymentController.ts'), paymentControllerContent);

// 3. Rewrite paymentRoutes.ts
const paymentRoutesContent = `import express from 'express';
import { createPaymentSession, handlePayHereNotification } from '../controllers/paymentController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/create-session', protect, createPaymentSession);
router.post('/notify', express.urlencoded({ extended: true }), handlePayHereNotification);

export default router;
`;
fs.writeFileSync(path.join(basePath, 'src/routes/paymentRoutes.ts'), paymentRoutesContent);

// 4. Update bookingController.ts to reject online
let bookingCtrlContent = fs.readFileSync(path.join(basePath, 'src/controllers/bookingController.ts'), 'utf8');
if (!bookingCtrlContent.includes("bookingSource === 'online'")) {
  bookingCtrlContent = bookingCtrlContent.replace(
    /if \(!showId \|\| !seatIds \|\| seatIds\.length === 0\) \{/g,
    `if (bookingSource === 'online' && paymentMethod === 'payhere') {
      return res.status(400).json({ success: false, message: 'Online bookings must use /api/payments/create-session' });
    }

    if (!showId || !seatIds || seatIds.length === 0) {`
  );
  fs.writeFileSync(path.join(basePath, 'src/controllers/bookingController.ts'), bookingCtrlContent);
}

// 5. Env variables mapping
let envExample = fs.readFileSync(path.join(basePath, '.env.example'), 'utf8');
if (!envExample.includes('PAYHERE_MERCHANT_ID')) {
  envExample += `\n\n# PayHere Integration\nPAYHERE_MERCHANT_ID=\nPAYHERE_MERCHANT_SECRET=\nPAYHERE_SANDBOX=true\nPAYHERE_NOTIFY_URL=\nPAYHERE_RETURN_URL=\nPAYHERE_CANCEL_URL=\n`;
  fs.writeFileSync(path.join(basePath, '.env.example'), envExample);
}

// 5b. Local Env update for sandbox
if (fs.existsSync(path.join(basePath, '.env'))) {
  let env = fs.readFileSync(path.join(basePath, '.env'), 'utf8');
  if (!env.includes('PAYHERE_MERCHANT_ID')) {
    env += `\n\n# PayHere Integration\nPAYHERE_MERCHANT_ID=1221198\nPAYHERE_MERCHANT_SECRET=YOUR_SANDBOX_SECRET\nPAYHERE_SANDBOX=true\nPAYHERE_NOTIFY_URL=http://localhost:5000/api/payments/notify\nPAYHERE_RETURN_URL=http://localhost:5173/payment/success\nPAYHERE_CANCEL_URL=http://localhost:5173/payment/cancel\n`;
    fs.writeFileSync(path.join(basePath, '.env'), env);
  }
}

console.log('Backend patched successfully.');
