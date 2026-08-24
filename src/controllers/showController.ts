import { Request, Response } from 'express';
import Show from '../models/Show';
import Hall from '../models/Hall';
import Booking from '../models/Booking';

export const getAllShows = async (req: Request, res: Response) => {
  try {
    console.log(`[SHOW] Get all shows`);
    const shows = await Show.find().populate('hallId').sort({ date: 1, startTime: 1 });
    res.json(shows);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getShowsByMovie = async (req: Request, res: Response) => {
  try {
    console.log(`[SHOW] Get shows for movie`);
    const shows = await Show.find({ movieId: req.params.movieId }).populate('hallId');
    res.json(shows);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createShow = async (req: Request, res: Response) => {
  try {
    console.log(`[SHOW] Create show`);
    const show = new Show(req.body);
    const createdShow = await show.save();
    res.status(201).json({ success: true, data: createdShow });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateShow = async (req: Request, res: Response) => {
  try {
    console.log(`[SHOW] Update show`);
    const show = await Show.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (show) {
      res.json({ success: true, data: show });
    } else {
      res.status(404).json({ success: false, message: 'Show not found' });
    }
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteShow = async (req: Request, res: Response) => {
  try {
    console.log(`[SHOW] Delete show`);
    const show = await Show.findByIdAndDelete(req.params.id);
    if (show) {
      res.status(204).send();
    } else {
      res.status(404).json({ success: false, message: 'Show not found' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const scheduleBulkShows = async (req: Request, res: Response) => {
  try {
    console.log(`[SHOW] Bulk schedule`);
    const { movieId, hallId, startDate, endDate, daysOfWeek, showtimes } = req.body;
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const daysStr = daysOfWeek.map((d: number) => dayNames[d]).join(', ');
    const timesStr = showtimes.map((st: any) => st.startTime).join(', ');

    console.log(`[SHOW SCHEDULE]\nMovie: ${movieId}\nHall: ${hallId}\nRange: ${startDate} → ${endDate}\nDays: ${daysStr}\nTimes: ${timesStr}`);

    const start = new Date(startDate);
    const end = new Date(endDate);
    const generatedShows = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayIndex = d.getDay();
      if (daysOfWeek.includes(dayIndex)) {
        const dateString = d.toISOString().split('T')[0];
        for (const time of showtimes) {
          const existingShow = await Show.findOne({
            hallId, date: dateString, startTime: time.startTime
          });
          if (!existingShow) {
            generatedShows.push({
              movieId, hallId, date: dateString, startTime: time.startTime,
              endTime: time.endTime, ticketPrice: time.ticketPrice, status: 'SCHEDULED'
            });
          }
        }
      }
    }
    const created = await Show.insertMany(generatedShows);
    console.log(`Generated: ${created.length} shows`);
    res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getShowSeats = async (req: Request, res: Response) => {
  try {
    const show = await Show.findById(req.params.showId);
    if (!show) {
      return res.status(404).json({ success: false, message: 'Show not found' });
    }
    
    const hall: any = await Hall.findById(show.hallId);
    if (!hall) {
      return res.status(404).json({ success: false, message: 'Hall not found' });
    }
    
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].slice(0, hall.rows);
    
    const bookings = await Booking.find({ 
      showId: show._id,
      status: { $in: ['CONFIRMED', 'PENDING'] }
    });
    
    const bookedSeatIds = new Set<string>();
    bookings.forEach(b => {
      b.seatIds.forEach(id => bookedSeatIds.add(id));
    });

    const seats = [];
    
    for (const row of rows) {
      for (let i = 1; i <= hall.seatsPerRow; i++) {
        const id = `${row}${i}`;
        seats.push({
          id, row, number: i,
          status: bookedSeatIds.has(id) ? 'BOOKED' : 'AVAILABLE',
          price: show.ticketPrice
        });
      }
    }
    
    const totalSeats = rows.length * hall.seatsPerRow;
    const bookedCount = bookedSeatIds.size;
    const availableCount = totalSeats - bookedCount;

    console.log(`[SEATS]\nShow: ${show._id}\nHall: ${hall._id}\nTotal seats: ${totalSeats}\nBooked: ${bookedCount}\nAvailable: ${availableCount}\nResult: SUCCESS`);
    
    res.json(seats);
  } catch (error: any) {
    console.log(`[SEATS ERROR] ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
