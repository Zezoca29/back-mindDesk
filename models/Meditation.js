import mongoose from 'mongoose';

const MeditationSchema = new mongoose.Schema({
  title: String,
  description: String,
  audioUrl: String,
  type: { type: String, enum: ['anxiety', 'anger', 'focus'] },
  premium: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Meditation', MeditationSchema);
