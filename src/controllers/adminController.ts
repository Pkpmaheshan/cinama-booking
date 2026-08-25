import { Response } from 'express';
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
    const todayShows = await Show.find({ date: { $regex: `^${todayStr}` } })
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
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : 'Unknown server error';

    res.status(500).json({
      success: false,
      message
    });
  }
};