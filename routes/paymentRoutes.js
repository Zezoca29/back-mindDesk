import express from 'express';
import { createPayment, webhookHandler, checkPaymentStatus } from '../controllers/paymentController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rota original para iniciar um pagamento com preferências - requer autenticação
router.post('/create', protect, createPayment);

// Rota para webhook do Mercado Pago - não requer autenticação pois é chamada pelo Mercado Pago
router.post('/webhook', webhookHandler);

// Rota para verificar status do pagamento - requer autenticação
router.get('/status/:paymentId', protect, checkPaymentStatus);

export default router;