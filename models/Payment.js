import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  mercadoPagoId: { 
    type: String,
    required: true 
  },
  amount: { 
    type: Number,
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'refunded'],
    default: 'pending'
  },
  subscriptionType: {
    type: String,
    default: 'premium',
    enum: ['premium', 'premium_plus'] // Para futuras opções de assinatura
  },
  paymentMethod: {
    type: String
  },
  paymentDetails: {
    type: mongoose.Schema.Types.Mixed // Para armazenar detalhes adicionais do pagamento
  }
}, { timestamps: true });

export default mongoose.model('Payment', PaymentSchema);