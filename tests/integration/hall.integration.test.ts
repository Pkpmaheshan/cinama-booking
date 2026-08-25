import request from 'supertest';
import app from '../../src/app';
import { connectDB, closeDB, clearDB } from '../setup';
import User from '../../src/models/User';
import { generateToken } from '../../src/utils/authUtils';
import Hall from '../../src/models/Hall';
import Show from '../../src/models/Show';
import mongoose from 'mongoose';

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Hall API Integration', () => {
  let adminToken: string;
  let customerToken: string;

  beforeEach(async () => {
    const admin = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'pwd', role: 'ADMIN' });
    const customer = await User.create({ name: 'Cust', email: 'cust@test.com', password: 'pwd', role: 'CUSTOMER' });
    
    adminToken = generateToken(admin.id, process.env.JWT_SECRET || 'secret');
    customerToken = generateToken(customer.id, process.env.JWT_SECRET || 'secret');
  });

  it('admin can create hall', async () => {
    const res = await request(app)
      .post('/api/halls')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Hall 1', rows: 10, seatsPerRow: 15 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Hall 1');
  });

  it('customer cannot create hall', async () => {
    const res = await request(app)
      .post('/api/halls')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'Test Hall 2', rows: 10, seatsPerRow: 15 });

    expect(res.status).toBe(403);
  });

  it('hall validation works', async () => {
    const res = await request(app)
      .post('/api/halls')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Hall', rows: -5, seatsPerRow: 10 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/positive number/);
  });

  it('admin can update hall', async () => {
    const hall = await Hall.create({ name: 'Hall 3', rows: 5, seatsPerRow: 5 });

    const res = await request(app)
      .put(`/api/halls/${hall._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rows: 8 });

    expect(res.status).toBe(200);
    expect(res.body.data.rows).toBe(8);
  });

  it('hall cannot be deleted when referenced by a show', async () => {
    const hall = await Hall.create({ name: 'Hall 4', rows: 5, seatsPerRow: 5 });
    
    await Show.create({
      movieId: new mongoose.Types.ObjectId(),
      hallId: hall._id,
      date: '2026-10-10',
      startTime: '10:00 AM',
      endTime: '12:00 PM',
      ticketPrice: 1000
    });

    const res = await request(app)
      .delete(`/api/halls/${hall._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/associated with it/);
  });
});
