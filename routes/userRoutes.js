import express from 'express';
import { checkEmailExists, getCurrentUser, verifyToken } from '../controllers/userController.js';

const router = express.Router();

// Rota para verificar se email existe
router.post('/check-email', checkEmailExists);

// Rota para buscar dados do usuário atual (protegida)
router.get('/me', verifyToken, getCurrentUser);

export default router;