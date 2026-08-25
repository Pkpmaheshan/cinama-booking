import request from 'supertest';
import app from '../../src/app';
import { connectDB, closeDB, clearDB } from '../setup';
import User from '../../src/models/User';
import Movie from '../../src/models/Movie';
import Hall from '../../src/models/Hall';
import Show from '../../src/models/Show';
import Booking from '../../src/models/Booking';
import { generateToken } from '../../src/utils/authUtils';

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Booking API Integration', () => {
  let adminToken: string;
  let customer1Token: string;
  let customer2Token: string;
  let customer1Id: string;
  let customer2Id: string;
  let showId: string;

  beforeEach(async () => {
    const admin = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'pwd', role: 'ADMIN' });
    const cust1 = await User.create({ name: 'C1', email: 'c1@test.com', password: 'pwd', role: 'CUSTOMER' });
    const cust2 = await User.create({ name: 'C2', email: 'c2@test.com', password: 'pwd', role: 'CUSTOMER' });
    
    adminToken = generateToken(admin.id, process.env.JWT_SECRET || 'secret');
    customer1Token = generateToken(cust1.id, process.env.JWT_SECRET || 'secret');
    customer2Token = generateToken(cust2.id, process.env.JWT_SECRET || 'secret');
    
    customer1Id = cust1.id;
    customer2Id = cust2.id;

    const movie = await Movie.create({ title: 'Test Movie', description: 'Desc', duration: 120, genre: 'Action', releaseDate: new Date(), language: 'EN', posterUrl: 'url', rating: 'R', backdropUrl: 'url' });
    const hall = await Hall.create({ name: 'Hall 1', rows: 10, seatsPerRow: 10 });
    const show = await Show.create({ movieId: movie._id, hallId: hall._id, date: '2026-10-10', startTime: '10:00 AM', endTime: '12:00 PM', ticketPrice: 1000 });
    
    showId = show.id;
  });

  it('customer can create booking', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ showId, seatIds: ['A1', 'A2'], paymentMethod: 'cash', bookingSource: 'counter' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalAmount).toBe(2000);
  });

  it('customer can access only their own bookings', async () => {
    const booking = await Booking.create({
      bookingReference: 'CV-123',
      userId: customer1Id,
      showId,
      seatIds: ['A1'],
      totalAmount: 1000,
      paymentMethod: 'cash',
      bookingSource: 'counter',
      status: 'CONFIRMED',
      paymentStatus: 'PAID'
    });

    const res = await request(app)
      .get('/api/bookings/my')
      .set('Authorization', `Bearer ${customer1Token}`);
      
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);

    const res2 = await request(app)
      .get(`/api/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${customer1Token}`);
    expect(res2.status).toBe(200);
  });

  it('customer cannot access another user booking', async () => {
    const booking = await Booking.create({
      bookingReference: 'CV-123',
      userId: customer1Id,
      showId,
      seatIds: ['A1'],
      totalAmount: 1000,
      paymentMethod: 'cash',
      bookingSource: 'counter',
      status: 'CONFIRMED',
      paymentStatus: 'PAID'
    });

    const res = await request(app)
      .get(`/api/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${customer2Token}`);
      
    expect(res.status).toBe(403);
  });

  it('seat conflicts are rejected', async () => {
    await Booking.create({
      bookingReference: 'CV-123',
      userId: customer1Id,
      showId,
      seatIds: ['A1'],
      totalAmount: 1000,
      paymentMethod: 'cash',
      bookingSource: 'counter',
      status: 'CONFIRMED',
      paymentStatus: 'PAID'
    });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({ showId, seatIds: ['A1', 'A2'], paymentMethod: 'cash', bookingSource: 'counter' });

    expect(res.status).toBe(409);
  });
});
