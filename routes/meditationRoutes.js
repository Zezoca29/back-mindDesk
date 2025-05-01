import express from 'express';
import { listMeditations } from '../controllers/meditationController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/list', protect, listMeditations);

export default router;
