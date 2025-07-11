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
import paymentRoutes from './routes/paymentRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import userRoutes from './routes/userRoutes.js';
import habitRoutes from './routes/habitRoutes.js';

// Configurações do ambiente
dotenv.config();
const app = express();

// Obter as origens permitidas
const allowedOrigins = [
  process.env.FRONTEND_URL, 
  'http://localhost:5173', // Libera localhost:5173
  'https://localhost:5173', // Caso use HTTPS local
  /^https:\/\/.*\.ngrok\.io$/,
  /^https:\/\/.*\.ngrok-free\.app$/,
  /^https:\/\/.*\.onrender\.com$/, // Render
  /^https:\/\/.*\.railway\.app$/, // Railway
  /^https:\/\/.*\.herokuapp\.com$/, // Heroku
  /^https:\/\/.*\.vercel\.app$/ // Vercel
];

// Configurar CORS
app.use(cors({
  origin: function(origin, callback) {
    // Permitir requisições sem origem (como apps mobile ou API direto)
    if (!origin) return callback(null, true);
    
    // Verificar se a origem está na lista de permitidas
    if (allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    })) {
      return callback(null, true);
    }
    
    console.warn(`Origem bloqueada por CORS: ${origin}`);
    callback(null, false);
  },
  credentials: true
}));

// Aumentar o limite de tamanho do payload JSON para receber os dados completos de pagamento
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Logger para requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/stress', stressButtonRoutes);
app.use('/api/meditations', meditationRoutes);
app.use('/api/motivational', motivationalRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/user', userRoutes);
app.use('/api/habits', habitRoutes);

// Rota para teste de webhook
app.post('/test-webhook', (req, res) => {
  console.log('Webhook de teste recebido:', req.body);
  res.status(200).send('OK');
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`Backend URL: ${process.env.BACKEND_URL}`);
  console.log(`Webhook URL: ${process.env.MERCADO_PAGO_WEBHOOK_URL || process.env.BACKEND_URL + '/api/payments/webhook'}`);
});