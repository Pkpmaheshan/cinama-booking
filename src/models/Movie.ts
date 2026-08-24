import mongoose, { Document, Schema } from 'mongoose';

export interface IMovie extends Document {
  title: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  duration: number;
  genre: string;
  rating: string;
  releaseDate: string;
  status: 'now_showing' | 'coming_soon';
  createdAt: Date;
  updatedAt: Date;
}

const movieSchema = new Schema<IMovie>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  posterUrl: { type: String, required: true },
  backdropUrl: { type: String, required: true },
  duration: { type: Number, required: true },
  genre: { type: String, required: true },
  rating: { type: String, required: true },
  releaseDate: { type: String, required: true },
  status: { type: String, enum: ['now_showing', 'coming_soon'], default: 'now_showing' },
}, { timestamps: true });

export default mongoose.model<IMovie>('Movie', movieSchema);
