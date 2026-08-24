const fs = require('fs');
const path = require('path');

const basePath = 'D:/Client Projects/Panchayu NSBM/cinemaAPI';

// 1. bookingController.ts
let bookingContent = fs.readFileSync(path.join(basePath, 'src/controllers/bookingController.ts'), 'utf8');
bookingContent = bookingContent.replace(
  /\.populate\('showId'\)/g,
  ".populate({ path: 'showId', populate: [{ path: 'movieId' }, { path: 'hallId' }] })"
);
fs.writeFileSync(path.join(basePath, 'src/controllers/bookingController.ts'), bookingContent);

// 2. adminController.ts (NEW)
const adminControllerContent = `import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Booking from '../models/Booking';
import Movie from '../models/Movie';
import Show from '../models/Show';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    // Basic authorization check
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized as admin' });
    }

    const [totalMovies, nowShowingMovies, upcomingMovies, totalShows, totalBookings, confirmedBookings, pendingBookings, cancelledBookings] = await Promise.all([
      Movie.countDocuments(),
      Movie.countDocuments({ status: 'now_showing' }),
      Movie.countDocuments({ status: 'coming_soon' }),
      Show.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'CONFIRMED' }),
      Booking.countDocuments({ status: 'PENDING' }),
      Booking.countDocuments({ status: 'CANCELLED' })
    ]);

    // Calculate Total Revenue (Only PAID bookings)
    const paidBookings = await Booking.find({ paymentStatus: 'PAID' });
    const totalRevenue = paidBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);

    // Today's shows (Timezone agnostic, finding shows scheduled today)
    const todayStr = new Date().toISOString().split('T')[0]; 
    const todayShows = await Show.find({ date: { $regex: \`^\${todayStr}\` } })
      .populate('movieId')
      .populate('hallId')
      .limit(10)
      .sort('startTime');

    // Recent bookings
    const recentBookings = await Booking.find()
      .populate({ path: 'showId', populate: [{ path: 'movieId' }, { path: 'hallId' }] })
      .populate('userId', 'name email')
      .sort('-bookingDate')
      .limit(10);

    res.json({
      success: true,
      data: {
        stats: {
          totalMovies,
          nowShowingMovies,
          upcomingMovies,
          totalShows,
          totalBookings,
          confirmedBookings,
          pendingBookings,
          cancelledBookings,
          totalRevenue
        },
        todayShows,
        recentBookings
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
`;
fs.writeFileSync(path.join(basePath, 'src/controllers/adminController.ts'), adminControllerContent);

// 3. adminRoutes.ts (NEW)
const adminRoutesContent = `import express from 'express';
import { getDashboardStats } from '../controllers/adminController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/dashboard', protect, admin, getDashboardStats);

export default router;
`;
fs.writeFileSync(path.join(basePath, 'src/routes/adminRoutes.ts'), adminRoutesContent);

// 4. app.ts (Update to mount adminRoutes)
let appContent = fs.readFileSync(path.join(basePath, 'src/app.ts'), 'utf8');
if (!appContent.includes('adminRoutes')) {
  appContent = appContent.replace(
    "import paymentRoutes from './routes/paymentRoutes';",
    "import paymentRoutes from './routes/paymentRoutes';\nimport adminRoutes from './routes/adminRoutes';"
  );
  appContent = appContent.replace(
    "app.use('/api/payments', paymentRoutes);",
    "app.use('/api/payments', paymentRoutes);\napp.use('/api/admin', adminRoutes);"
  );
  fs.writeFileSync(path.join(basePath, 'src/app.ts'), appContent);
}

// 5. paymentController.ts (Fix Webhook logging and amount formatting)
let paymentCtrlContent = fs.readFileSync(path.join(basePath, 'src/controllers/paymentController.ts'), 'utf8');

const webhookRegex = /export const handlePayHereNotification = async \(req: Request, res: Response\) => \{[\s\S]*?res\.status\(200\)\.send\('OK'\);\s*\} catch \(error: any\) \{[\s\S]*?res\.status\(500\)\.send\('Internal Error'\);\s*\}\s*\};/;

const newWebhookLogic = `export const handlePayHereNotification = async (req: Request, res: Response) => {
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

    console.log(\`[PAYMENT] Notification received\`);
    console.log(\`[PAYMENT] order_id: \${order_id}\`);
    console.log(\`[PAYMENT] status_code: \${status_code}\`);
    console.log(\`[PAYMENT] payhere_amount: \${payhere_amount}\`);
    console.log(\`[PAYMENT] payhere_currency: \${payhere_currency}\`);

    // Verify signature with correct 2 decimal formatting
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || '';
    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    
    // Format to 2 decimal places as per PayHere docs
    const formattedAmount = parseFloat(payhere_amount).toFixed(2);
    
    const localSig = crypto.createHash('md5').update(
      merchant_id + order_id + formattedAmount + payhere_currency + status_code + hashedSecret
    ).digest('hex').toUpperCase();

    const isSignatureValid = localSig === md5sig || localSig === md5sig.toUpperCase();
    console.log(\`[PAYMENT] Signature valid: \${isSignatureValid ? 'YES' : 'NO'}\`);

    if (!isSignatureValid) {
      return res.status(400).send('Invalid signature');
    }
    
    const booking = await Booking.findOne({ payhereOrderId: order_id });
    if (!booking) {
      console.log(\`[PAYMENT] Booking found: NO (Order ID: \${order_id})\`);
      return res.status(404).send('Booking not found');
    }
    
    console.log(\`[PAYMENT] Booking found: YES (\${booking._id})\`);
    console.log(\`[PAYMENT] Previous booking status: \${booking.status}\`);
    console.log(\`[PAYMENT] Previous payment status: \${booking.paymentStatus}\`);

    if (booking.paymentStatus === 'PAID') {
      console.log(\`[PAYMENT] Idempotency: Booking already PAID\`);
      return res.status(200).send('Already processed');
    }

    const statusCodeStr = String(status_code);

    if (statusCodeStr === '2') {
      booking.paymentStatus = 'PAID';
      booking.status = 'CONFIRMED';
      booking.payherePaymentId = payment_id;
      await booking.save();

      console.log(\`[PAYMENT] New booking status: CONFIRMED\`);
      console.log(\`[PAYMENT] New payment status: PAID\`);
      console.log(\`[PAYMENT] Payment verified successfully\\n[PAYMENT] Booking confirmed\\n[PAYMENT] Seats booked: \${booking.seatIds.join(',')}\`);

      // Socket updates
      const io = req.app.get('io');
      if (io) {
        booking.seatIds.forEach((seatId: string) => {
          removeHold(booking.showId.toString(), seatId);
          io.to(\`show:\${booking.showId}\`).emit('seat:booked', { showId: booking.showId, seatId });
        });
      }
    } else if (['0', '-1', '-2', '-3'].includes(statusCodeStr)) {
      booking.paymentStatus = statusCodeStr === '0' ? 'PENDING' : 'FAILED';
      booking.status = statusCodeStr === '0' ? 'PENDING' : 'CANCELLED';
      await booking.save();
      
      console.log(\`[PAYMENT] New booking status: \${booking.status}\`);
      console.log(\`[PAYMENT] New payment status: \${booking.paymentStatus}\`);
      console.log(\`[PAYMENT] Booking cancelled/failed\`);
      
      const io = req.app.get('io');
      if (io) {
        booking.seatIds.forEach((seatId: string) => {
          removeHold(booking.showId.toString(), seatId);
          io.to(\`show:\${booking.showId}\`).emit('seat:released', { showId: booking.showId, seatId, socketId: 'backend' });
        });
      }
      console.log(\`[PAYMENT] Seats released\`);
    } else {
      console.log(\`[PAYMENT] Unknown status code: \${statusCodeStr}\`);
    }

    res.status(200).send('OK');
  } catch (error: any) {
    console.error(\`[PAYMENT] Error processing notification:\`, error);
    res.status(500).send('Internal Error');
  }
};`;

paymentCtrlContent = paymentCtrlContent.replace(webhookRegex, newWebhookLogic);
fs.writeFileSync(path.join(basePath, 'src/controllers/paymentController.ts'), paymentCtrlContent);

console.log('Backend patched successfully.');
