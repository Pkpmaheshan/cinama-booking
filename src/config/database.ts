import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/cineverse';

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[DB] MongoDB connected successfully');
  } catch (error: unknown) {
    console.log('[DB ERROR]');
    console.log('Operation: Connect to MongoDB');

    if (error instanceof Error) {
      console.log(`Error: ${error.message}`);
    } else {
      console.log('Error: Unknown database error');
    }

    process.exit(1);
  }
};