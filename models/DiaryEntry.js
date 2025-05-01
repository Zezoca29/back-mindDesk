import mongoose from 'mongoose';

const DiaryEntrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  aiAnalysis: String,
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('DiaryEntry', DiaryEntrySchema);
