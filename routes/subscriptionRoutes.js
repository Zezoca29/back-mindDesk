import express from 'express';
import { getSubscriptionDetails, getPaymentHistory } from '../controllers/subscriptionController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rota para obter detalhes da assinatura
router.get('/details', protect, getSubscriptionDetails);

// Rota para obter histórico de pagamentos
router.get('/history', protect, getPaymentHistory);

export default router;