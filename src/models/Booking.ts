import mongoose, { Document, Schema } from 'mongoose';

export interface IBooking extends Document {
  bookingReference: string;
  userId: mongoose.Types.ObjectId;
  showId: mongoose.Types.ObjectId;
  seatIds: string[];
  totalAmount: number;
  paymentMethod: 'payhere' | 'cash';
  bookingSource: 'online' | 'counter';
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED';
  payhereOrderId?: string;
  payherePaymentId?: string;
  bookingDate: Date;
}

const bookingSchema = new Schema<IBooking>({
  bookingReference: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  showId: { type: Schema.Types.ObjectId, ref: 'Show', required: true },
  seatIds: { type: [String], required: true },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['payhere', 'cash'], required: true },
  bookingSource: { type: String, enum: ['online', 'counter'], required: true },
  status: { type: String, enum: ['CONFIRMED', 'PENDING', 'CANCELLED'], default: 'PENDING' },
  paymentStatus: { type: String, enum: ['PAID', 'PENDING', 'FAILED'], default: 'PENDING' },
  payhereOrderId: { type: String, unique: true, sparse: true },
  payherePaymentId: { type: String },
  bookingDate: { type: Date, default: Date.now }
});

export default mongoose.model<IBooking>('Booking', bookingSchema);
