import mongoose, { Document, Schema } from 'mongoose';

export interface IShow extends Document {
  movieId: mongoose.Types.ObjectId;
  hallId: mongoose.Types.ObjectId;
  date: string;
  startTime: string;
  endTime: string;
  ticketPrice: number;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
  createdAt: Date;
}

const showSchema = new Schema<IShow>({
  movieId: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
  hallId: { type: Schema.Types.ObjectId, ref: 'Hall', required: true },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  ticketPrice: { type: Number, required: true },
  status: { type: String, enum: ['SCHEDULED', 'CANCELLED', 'COMPLETED'], default: 'SCHEDULED' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IShow>('Show', showSchema);
