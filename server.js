import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import stressButtonRoutes from './routes/stressButtonRoutes.js';
import meditationRoutes from './routes/meditationRoutes.js';
import motivationalRoutes from './routes/motivationalRoutes.js';
import bookRoutes from './routes/bookRoutes.js';
import diaryRoutes from './routes/diaryRoutes.js';
import trackingRoutes from './routes/trackingRoutes.js';

dotenv.config();
const app = express();

// Middlewares
app.use(cors({
  origin: ['http://localhost:5173'], // frontend URL
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/stress', stressButtonRoutes);
app.use('/api/meditations', meditationRoutes);
app.use('/api/motivational', motivationalRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/tracking', trackingRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
