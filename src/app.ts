import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import movieRoutes from './routes/movieRoutes';
import showRoutes from './routes/showRoutes';
import bookingRoutes from './routes/bookingRoutes';
import paymentRoutes from './routes/paymentRoutes';
import adminRoutes from './routes/adminRoutes';
import { apiLogger } from './middleware/loggerMiddleware';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(apiLogger);

// Basic Health Check Endpoint
app.get('/api/health', (req, res) => {
  console.log('[HEALTH] Health check requested');
  res.status(200).json({ success: true, message: 'CineVerse API is running perfectly.' });
});

// Import Routes
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/shows', showRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log(`\n[API ERROR]`);
  console.log(`Method: ${req.method}`);
  console.log(`Path: ${req.originalUrl}`);
  console.log(`Status: 500`);
  console.log(`Error: ${err.message || 'Unknown error'}`);
  console.log(`Stack: ${err.stack}`);
  
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

export default app;
