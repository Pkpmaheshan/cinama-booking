import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Point dotenv to the root .env
dotenv.config();

import User from '../src/models/User';
import Movie from '../src/models/Movie';
import Hall from '../src/models/Hall';
import Show from '../src/models/Show';
import Booking from '../src/models/Booking';

const API_URL = 'http://localhost:5000/api';

let adminToken = '';
let customerToken = '';
let testMovieId = '';
let testShowId = '';
let testHallId = '';

const pass = (msg: string) => console.log(`✅ PASS: ${msg}`);
const fail = (msg: string) => console.error(`❌ FAIL: ${msg}`);

async function runTests() {
  console.log('Starting API Audit...\n');

  try {
    // 1. Connect to DB for verification
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('MongoDB Connected for state verification.\n');

    // 2. HEALTH ENDPOINT
    const healthRes = await fetch(`${API_URL}/health`);
    const healthData = await healthRes.json();
    if (healthRes.ok && healthData.message) pass('Health Endpoint');
    else fail('Health Endpoint');

    // 3. AUTHENTICATION
    // Login Admin
    const adminRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@cineverse.com', password: 'Admin123' })
    });
    const adminData = await adminRes.json();
    if (adminData.success && adminData.data.token) {
      adminToken = adminData.data.token;
      pass('Admin Login');
    } else fail('Admin Login');

    // Login Customer
    const custRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@cineverse.com', password: 'Customer123' })
    });
    const custData = await custRes.json();
    if (custData.success && custData.data.token) {
      customerToken = custData.data.token;
      pass('Customer Login');
    } else fail('Customer Login');

    // 4. MOVIES CRUD
    // Create
    const createMovieRes = await fetch(`${API_URL}/movies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Test Movie', description: 'Test', posterUrl: 'url', backdropUrl: 'url',
        duration: 120, genre: 'Action', rating: 'PG', releaseDate: '2026-01-01'
      })
    });
    const createMovieData = await createMovieRes.json();
    if (createMovieRes.status === 201) {
      testMovieId = createMovieData.data._id;
      // DB Verify
      const dbMovie = await Movie.findById(testMovieId);
      if (dbMovie && dbMovie.title === 'Test Movie') pass('Create Movie & DB Verify');
      else fail('Create Movie DB Verify');
    } else fail('Create Movie');

    // Update
    await fetch(`${API_URL}/movies/${testMovieId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ title: 'Updated Movie' })
    });
    const updatedDbMovie = await Movie.findById(testMovieId);
    if (updatedDbMovie?.title === 'Updated Movie') pass('Update Movie & DB Verify');
    else fail('Update Movie');

    // 5. SHOWS & BULK SCHEDULING
    const hall = await Hall.findOne();
    if (hall) {
      testHallId = hall._id.toString();
      const bulkRes = await fetch(`${API_URL}/shows/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          movieId: testMovieId,
          hallId: testHallId,
          startDate: '2028-08-20',
          endDate: '2028-08-27', // 1 week
          daysOfWeek: [1, 3, 5], // Mon, Wed, Fri (e.g. 3 days in a week)
          showtimes: [{ startTime: '13:30', endTime: '15:40', ticketPrice: 1000 }]
        })
      });
      const bulkData = await bulkRes.json();
      if (bulkRes.status === 201 && bulkData.data.length > 0) {
        testShowId = bulkData.data[0]._id;
        pass(`Bulk Schedule created ${bulkData.data.length} shows`);
      } else fail('Bulk Schedule');
    } else {
      fail('No Hall found for scheduling tests');
    }

    // 6. SEATS & BOOKINGS
    if (testShowId) {
      // Get Seats (Should all be AVAILABLE)
      const seatsRes = await fetch(`${API_URL}/shows/${testShowId}/seats`);
      const seatsData = await seatsRes.json();
      if (Array.isArray(seatsData) && seatsData.length > 0 && seatsData[0].status === 'AVAILABLE') {
        pass('Get Seats (Initial)');
      } else {
        fail(`Get Seats (Initial). Got: ${JSON.stringify(seatsData)}`);
      }

      // Create Booking (Customer)
      const bookRes = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          showId: testShowId,
          seatIds: ['A1', 'A2'],
          paymentMethod: 'cash',
          bookingSource: 'counter' // technically customer should be online, but testing endpoint logic
        })
      });
      const bookData = await bookRes.json();
      
      if (bookRes.status === 201) {
        pass('Create Booking');
        
        // Verify DB Calculation (2 seats * 1000 = 2000)
        const dbBooking = await Booking.findById(bookData.data._id);
        if (dbBooking && dbBooking.totalAmount === 2000) pass('Booking Server-side Price Calc Verify');
        else fail(`Booking Server-side Price Calc (Got ${dbBooking?.totalAmount})`);
      } else fail(`Create Booking: ${JSON.stringify(bookData)}`);

      // Duplicate Booking Test (HTTP 409)
      const dupBookRes = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          showId: testShowId,
          seatIds: ['A1'], // Already booked
          paymentMethod: 'payhere',
          bookingSource: 'online'
        })
      });
      if (dupBookRes.status === 409) pass('Duplicate Seat Prevention (HTTP 409)');
      else fail(`Duplicate Seat Prevention (Got ${dupBookRes.status})`);
      
      // Get Seats again (Should show A1 and A2 as BOOKED)
      const updatedSeatsRes = await fetch(`${API_URL}/shows/${testShowId}/seats`);
      const updatedSeatsData = await updatedSeatsRes.json();
      if (Array.isArray(updatedSeatsData)) {
        const a1 = updatedSeatsData.find((s: any) => s.id === 'A1');
        if (a1 && a1.status === 'BOOKED') pass('Get Seats (Reflects Bookings)');
        else fail('Get Seats (Reflects Bookings)');
      } else {
        fail(`Get Seats (Reflects Bookings). Got: ${JSON.stringify(updatedSeatsData)}`);
      }
    }

    // 7. GET BOOKINGS (Auth Check)
    const myBookRes = await fetch(`${API_URL}/bookings/my`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const myBookData = await myBookRes.json();
    if (myBookRes.ok && Array.isArray(myBookData)) pass('Get My Bookings');
    else fail('Get My Bookings');

    // Admin Get All Bookings
    const allBookRes = await fetch(`${API_URL}/bookings`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (allBookRes.ok) pass('Admin Get All Bookings');
    else fail('Admin Get All Bookings');
    
    // Customer trying to get All Bookings (Should fail 403)
    const custAllBookRes = await fetch(`${API_URL}/bookings`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    if (custAllBookRes.status === 403) pass('Admin Route Protection (HTTP 403)');
    else fail('Admin Route Protection');

    // 8. CLEANUP
    if (testMovieId) {
      await fetch(`${API_URL}/movies/${testMovieId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const checkDel = await Movie.findById(testMovieId);
      if (!checkDel) pass('Delete Movie & DB Verify');
      else fail('Delete Movie DB Verify');
    }

  } catch (error) {
    console.error('Test Execution Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nAudit Complete.');
  }
}

runTests();
