import express from 'express';
import { registerStressEvent } from '../controllers/stressButtonController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', protect, registerStressEvent);

export default router;
