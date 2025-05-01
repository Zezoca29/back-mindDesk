import mongoose from 'mongoose';

const StressEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['anxiety', 'anger'], required: true },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('StressEvent', StressEventSchema);
