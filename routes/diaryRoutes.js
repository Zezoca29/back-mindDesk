// routes/diary.js
import express from 'express';
import { createDiaryEntry, getDiaryEntries } from '../controllers/diaryController.js';

const router = express.Router();

router.post('/', createDiaryEntry);
router.get('/', getDiaryEntries);

export default router;