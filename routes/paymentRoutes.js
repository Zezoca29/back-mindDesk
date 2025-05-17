
import express from 'express';
import { createPayment, createDirectPayment, webhookHandler, checkPaymentStatus, updatePaymentStatus } from '../controllers/paymentController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rota original para iniciar um pagamento com preferências - requer autenticação
router.post('/create', protect, createPayment);

// Nova rota para pagamento direto via API - requer autenticação
router.post('/direct', protect, createDirectPayment);

// Rota para webhook do Mercado Pago - não requer autenticação pois é chamada pelo Mercado Pago
router.post('/webhook', webhookHandler);

// Rota para verificar status do pagamento - requer autenticação
router.get('/status/:paymentId', protect, checkPaymentStatus);

// Rota para atualizar status manualmente (para testes ou painel admin)
// Em produção, você deve adicionar um middleware para verificar se o usuário é admin
router.put('/status/:paymentId', protect, updatePaymentStatus);

export default router;