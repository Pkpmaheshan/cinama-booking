import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../src/models/User';
import Movie from '../src/models/Movie';
import Hall from '../src/models/Hall';
import Show from '../src/models/Show';
import Booking from '../src/models/Booking';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cineverse';

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for Seeding...');

    // 1. Clear Database
    await User.deleteMany();
    await Movie.deleteMany();
    await Hall.deleteMany();
    await Show.deleteMany();
    await Booking.deleteMany();
    console.log('Cleared existing data.');

    // 2. Seed Users
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('Admin123', salt);
    const customerPassword = await bcrypt.hash('Customer123', salt);

    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@cineverse.com',
      password: adminPassword,
      role: 'ADMIN'
    });

    const customer = await User.create({
      name: 'Test Customer',
      email: 'customer@cineverse.com',
      password: customerPassword,
      role: 'CUSTOMER'
    });
    console.log('Users created.');

    // 3. Seed Halls
    const hall1 = await Hall.create({ name: 'Hall 01', rows: 8, seatsPerRow: 12 });
    const hall2 = await Hall.create({ name: 'Hall 02', rows: 10, seatsPerRow: 15 });
    console.log('Halls created.');

    // 4. Seed Movies
    const m1 = await Movie.create({
      title: 'Spider-Man: Brand New Day',
      description: 'Peter Parker swings back into action.',
      posterUrl: 'https://m.media-amazon.com/images/M/MV5BOWNjYWM3NWItOGE0ZS00MWRjLThiZWEtYjc4ZmNmMmU5ZTVmXkEyXkFqcGc@._V1_.jpg',
      backdropUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=80',
      duration: 135,
      genre: 'Action, Adventure',
      rating: 'PG-13',
      releaseDate: '2026-05-01',
      status: 'now_showing'
    });

    const m2 = await Movie.create({
      title: 'Deadpool & Wolverine',
      description: 'A listless Wade Wilson toils away.',
      posterUrl: 'https://upload.wikimedia.org/wikipedia/en/4/4c/Deadpool_%26_Wolverine_poster.jpg',
      backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80',
      duration: 127,
      genre: 'Action, Comedy',
      rating: 'R',
      releaseDate: '2024-07-24',
      status: 'coming_soon'
    });
    console.log('Movies created.');

    // 5. Seed Shows
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    await Show.create({
      movieId: m1._id,
      hallId: hall1._id,
      date: dateStr,
      startTime: '10:30 AM',
      endTime: '01:00 PM',
      ticketPrice: 1200,
      status: 'SCHEDULED'
    });

    await Show.create({
      movieId: m2._id,
      hallId: hall2._id,
      date: dateStr,
      startTime: '04:30 PM',
      endTime: '07:00 PM',
      ticketPrice: 1500,
      status: 'SCHEDULED'
    });
    console.log('Shows created.');

    console.log('Seeding successful!');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
};

seedData();
