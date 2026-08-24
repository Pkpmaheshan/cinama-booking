import mongoose, { Document, Schema } from 'mongoose';

export interface IHall extends Document {
  name: string;
  rows: number;
  seatsPerRow: number;
}

const hallSchema = new Schema<IHall>({
  name: { type: String, required: true, unique: true },
  rows: { type: Number, required: true },
  seatsPerRow: { type: Number, required: true }
});

export default mongoose.model<IHall>('Hall', hallSchema);
