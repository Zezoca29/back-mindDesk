import express from 'express';
import { 
  checkEmailExists, 
  getCurrentUser, 
  verifyToken,
  recordMood,
  getMoodHistory,
  getMoodStats,
  recordMeditation,
  recordDiaryEntry
} from '../controllers/userController.js';

const router = express.Router();

// Rota para verificar se email existe
router.post('/check-email', checkEmailExists);

// Rota para buscar dados do usuário atual (protegida)
router.get('/me', verifyToken, getCurrentUser);

// Rotas para humor
router.post('/mood', verifyToken, recordMood);
router.get('/mood/history', verifyToken, getMoodHistory);
router.get('/mood/stats', verifyToken, getMoodStats);

// Rotas para atividades
router.post('/meditation', verifyToken, recordMeditation);
router.post('/diary', verifyToken, recordDiaryEntry);

export default router;