import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cineverse';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(`[DB] MongoDB connected successfully`);
  } catch (error: any) {
    console.log(`[DB ERROR]`);
    console.log(`Operation: Connect to MongoDB`);
    console.log(`Error: ${error.message || 'Unknown database error'}`);
    process.exit(1);
  }
};
