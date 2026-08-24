import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Booking from '../models/Booking';
import Show from '../models/Show';
import { removeHold } from '../socket/seatSocket';

export const generateBookingRef = () => {
  const date = new Date().toISOString().slice(0,10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CV-${date}-${rand}`;
};

export const createBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { showId, seatIds, paymentMethod, bookingSource } = req.body;
    
    if (bookingSource === 'counter') {
      console.log(`[COUNTER BOOKING]\nAdmin: ${req.user?._id}\nShow: ${showId}\nSeats: ${seatIds.join(',')}\nPayment method: ${paymentMethod}\nBooking source: ${bookingSource}`);
    } else {
      console.log(`[BOOKING]\nUser: ${req.user?._id}\nShow: ${showId}\nRequested seats: ${seatIds.join(',')}`);
    }

    if (bookingSource === 'online' && paymentMethod === 'payhere') {
      return res.status(400).json({ success: false, message: 'Online bookings must use /api/payments/create-session' });
    }

    if (!showId || !seatIds || seatIds.length === 0) {
      console.log(`[BOOKING]\nSeat validation: FAILED\nReason: Invalid booking data\nReturning HTTP 400`);
      return res.status(400).json({ success: false, message: 'Invalid booking data' });
    }

    // 1. Verify show exists
    const show = await Show.findById(showId);
    if (!show) {
      console.log(`[BOOKING]\nSeat validation: FAILED\nReason: Show not found\nReturning HTTP 404`);
      return res.status(404).json({ success: false, message: 'Show not found' });
    }

    // 2. Check that the seats are not already booked
    const existingBookings = await Booking.find({
      showId,
      status: { $in: ['CONFIRMED', 'PENDING'] },
      seatIds: { $in: seatIds }
    });

    if (existingBookings.length > 0) {
      const booked = new Set();
      existingBookings.forEach(b => b.seatIds.forEach(id => booked.add(id)));
      const conflicts = seatIds.filter((id: string) => booked.has(id));
      console.log(`[BOOKING]\nSeat validation: FAILED\nBooked seats: ${conflicts.join(',')}\nReturning HTTP 409`);
      return res.status(409).json({ success: false, message: 'One or more selected seats are already booked' });
    }
    
    console.log(`[BOOKING]\nSeat validation: PASSED`);

    // 3. Calculate total
    const totalAmount = show.ticketPrice * seatIds.length;
    console.log(`[BOOKING]\nTicket price: ${show.ticketPrice}\nCalculated total: ${totalAmount}`);

    // 4. Set Status based on Payment Method
    const status = paymentMethod === 'cash' ? 'CONFIRMED' : 'PENDING';
    const paymentStatus = paymentMethod === 'cash' ? 'PAID' : 'PENDING';

    const booking = new Booking({
      bookingReference: generateBookingRef(),
      userId: req.user?._id,
      showId,
      seatIds,
      totalAmount,
      paymentMethod,
      bookingSource,
      status,
      paymentStatus
    });

    const createdBooking = await booking.save();
    console.log(`[BOOKING]\nDatabase creation: SUCCESS\nReference: ${createdBooking.bookingReference}`);
    console.log(`[DB] Booking created: ${createdBooking._id}`);
    
    const io = req.app.get('io');
    if (io) {
      seatIds.forEach((seatId: string) => {
        removeHold(showId, seatId);
        io.to("show:${showId}").emit('seat:booked', { showId, seatId });
      });
    }

    res.status(201).json({ success: true, data: createdBooking });
  } catch (error: any) {
    console.log(`[DB ERROR]\nOperation: Create Booking\nError: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyBookings = async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await Booking.find({ userId: req.user?._id }).populate({ path: 'showId', populate: [{ path: 'movieId' }, { path: 'hallId' }] }).sort('-bookingDate');
    res.json(bookings);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllBookings = async (req: AuthRequest, res: Response) => {
  try {
    const { date, status, paymentMethod, bookingSource } = req.query;
    
    const filter: any = {};
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (bookingSource) filter.bookingSource = bookingSource;
    // Date filtering can be more complex, keeping it simple
    
    const bookings = await Booking.find(filter).populate({ path: 'showId', populate: [{ path: 'movieId' }, { path: 'hallId' }] }).populate('userId', 'name email').sort('-bookingDate');
    res.json(bookings);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBookingById = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id).populate({ path: 'showId', populate: [{ path: 'movieId' }, { path: 'hallId' }] }).populate('userId', 'name email');
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Verify ownership if not admin
    if (req.user?.role !== 'ADMIN' && (typeof booking.userId === 'object' && (booking.userId as any)._id ? (booking.userId as any)._id.toString() : booking.userId.toString()) !== req.user?._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this booking' });
    }

    res.json(booking);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

