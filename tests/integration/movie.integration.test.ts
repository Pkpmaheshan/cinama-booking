import request from 'supertest';
import app from '../../src/app';
import { connectDB, closeDB, clearDB } from '../setup';
import User from '../../src/models/User';
import Movie from '../../src/models/Movie';
import { generateToken } from '../../src/utils/authUtils';

beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('Movie API Integration', () => {
  let adminToken: string;
  let customerToken: string;

  beforeEach(async () => {
    const admin = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'pwd', role: 'ADMIN' });
    const customer = await User.create({ name: 'Cust', email: 'cust@test.com', password: 'pwd', role: 'CUSTOMER' });
    
    adminToken = generateToken(admin.id, process.env.JWT_SECRET || 'secret');
    customerToken = generateToken(customer.id, process.env.JWT_SECRET || 'secret');
  });

    it('public movie retrieval', async () => {
    await Movie.create({ title: 'Test Movie', description: 'Desc', duration: 120, genre: 'Action', releaseDate: new Date(), language: 'EN', posterUrl: 'url', rating: 'PG-13', backdropUrl: 'url' });
    
    const res = await request(app).get('/api/movies');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('Test Movie');
  });

  it('admin can create movie', async () => {
    const res = await request(app)
      .post('/api/movies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'New Movie', description: 'Desc', duration: 100, genre: 'Comedy', releaseDate: new Date(), language: 'EN', posterUrl: 'url', rating: 'R', backdropUrl: 'url' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('customer cannot create movie', async () => {
    const res = await request(app)
      .post('/api/movies')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ title: 'New Movie' });

    expect(res.status).toBe(403);
  });

  it('admin can update movie', async () => {
    const movie = await Movie.create({ title: 'Test Movie', description: 'Desc', duration: 120, genre: 'Action', releaseDate: new Date(), language: 'EN', posterUrl: 'url', rating: 'PG-13', backdropUrl: 'url' });
    
    const res = await request(app)
      .put(`/api/movies/${movie._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ duration: 130 });

    expect(res.status).toBe(200);
    expect(res.body.data.duration).toBe(130);
  });

  it('admin can delete movie', async () => {
    const movie = await Movie.create({ title: 'Test Movie', description: 'Desc', duration: 120, genre: 'Action', releaseDate: new Date(), language: 'EN', posterUrl: 'url', rating: 'PG-13', backdropUrl: 'url' });
    
    const res = await request(app)
      .delete(`/api/movies/${movie._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });
});
