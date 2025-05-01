import mongoose from 'mongoose';

const BookSchema = new mongoose.Schema({
  title: String,
  author: String,
  summary: String,
  affiliateLink: String,
  premium: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Book', BookSchema);
