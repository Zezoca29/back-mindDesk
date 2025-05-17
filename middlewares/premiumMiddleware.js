import User from '../models/User.js';

// Middleware para verificar se o usuário tem assinatura premium
export const isPremium = async (req, res, next) => {
  try {
    // O middleware protect já deve ter sido executado antes deste
    // req.user já deve estar disponível

    if (!req.user) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    // Verifica se o status de assinatura do usuário é premium ou premium_plus
    if (req.user.subscriptionStatus !== 'premium' && req.user.subscriptionStatus !== 'premium_plus') {
      return res.status(403).json({ 
        message: 'Recurso disponível apenas para assinantes premium',
        subscriptionStatus: req.user.subscriptionStatus
      });
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao verificar status de assinatura' });
  }
};