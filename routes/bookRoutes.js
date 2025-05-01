import express from 'express';
import { listBooks } from '../controllers/bookController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/list', protect, listBooks);

export default router;
