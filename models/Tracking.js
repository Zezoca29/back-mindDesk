import mongoose from 'mongoose';

const TrackingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: String,
  pointsGained: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Tracking', TrackingSchema);
