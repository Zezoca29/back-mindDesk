import express from 'express';
import { checkEmailExists } from '../controllers/userController.js';

const router = express.Router();

// Rota para verificar se um email já está em uso
router.post('/check-email', checkEmailExists);

export default router;