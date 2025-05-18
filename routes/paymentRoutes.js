import express from 'express';
import { createPaymentWithSignup } from '../controllers/paymentController.js';

const router = express.Router();

// Nova rota para pagamento com cadastro - não requer autenticação
router.post('/create-with-signup', createPaymentWithSignup);


export default router;