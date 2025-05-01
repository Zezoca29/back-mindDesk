import express from 'express';
import { listMotivationalQuotes, saveQuote } from '../controllers/motivationalController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/list', protect, listMotivationalQuotes);
router.post('/save', protect, saveQuote);

export default router;
