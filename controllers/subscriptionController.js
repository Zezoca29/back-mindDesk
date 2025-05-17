import User from '../models/User.js';
import Payment from '../models/Payment.js';

// Obter detalhes da assinatura do usuário atual
export const getSubscriptionDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar o usuário com todos os detalhes
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Buscar o último pagamento aprovado
    const lastPayment = await Payment.findOne({
      user: userId,
      status: 'approved'
    }).sort({ createdAt: -1 });

    // Montar a resposta
    const response = {
      subscriptionStatus: user.subscriptionStatus,
      isPremium: user.subscriptionStatus === 'premium' || user.subscriptionStatus === 'premium_plus',
      points: user.points,
      subscriptionDetails: lastPayment ? {
        type: lastPayment.subscriptionType,
        activatedAt: lastPayment.updatedAt,
        paymentId: lastPayment._id
      } : null
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao buscar detalhes da assinatura:', error);
    res.status(500).json({ message: 'Erro ao buscar detalhes da assinatura' });
  }
};

// Obter histórico de pagamentos do usuário
export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const payments = await Payment.find({ user: userId })
      .sort({ createdAt: -1 })
      .select('status amount subscriptionType createdAt updatedAt paymentMethod');

    res.json(payments);
  } catch (error) {
    console.error('Erro ao buscar histórico de pagamentos:', error);
    res.status(500).json({ message: 'Erro ao buscar histórico de pagamentos' });
  }
};