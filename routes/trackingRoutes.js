import express from 'express';
import { registerTracking } from '../controllers/trackingController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', protect, registerTracking);

export default router;
