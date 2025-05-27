// routes/payments.js
import express from 'express';
import { createPaymentWithSignup, mercadoPagoWebhook, checkPayment } from '../controllers/paymentController.js';

const router = express.Router();

// Rota para criar pagamento com cadastro
router.post('/create-with-signup', createPaymentWithSignup);

// Webhook do Mercado Pago (deve ser configurado no painel do MP)
router.post('/webhook', mercadoPagoWebhook);

// Rota para verificar status de um pagamento (debug/admin)
router.get('/check/:paymentId', checkPayment);

export default router;