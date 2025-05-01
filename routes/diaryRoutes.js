import express from 'express';
import { createDiaryEntry } from '../controllers/diaryController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/create', protect, createDiaryEntry);

export default router;
