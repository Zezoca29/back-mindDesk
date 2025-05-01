import express from 'express';
import {registerUser, loginUser } from '../controllers/authController.js';

const router = express.Router();

// Rota de cadastro
router.post('/register', registerUser);

// Rota de login
router.post('/login', loginUser);

export default router;
