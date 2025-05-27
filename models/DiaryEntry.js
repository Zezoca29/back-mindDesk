import mongoose from 'mongoose';

const DiaryEntrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  mood: {
    type: String,
    enum: ['great', 'good', 'neutral', 'stressed', 'bad'],
    default: 'neutral'
  },
  emotions: {
    mood: String,
    timestamp: Date,
    intensity: Number // Opcional: intensidade da emoção de 1-10
  },
  aiAnalysis: String,
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('DiaryEntry', DiaryEntrySchema);