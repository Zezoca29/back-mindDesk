import mongoose from 'mongoose';

const MotivationalSchema = new mongoose.Schema({
  text: String,
  week: Number,
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export default mongoose.model('Motivational', MotivationalSchema);
