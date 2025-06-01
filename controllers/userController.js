import User from '../models/User.js';
import jwt from 'jsonwebtoken';

// Middleware para verificar token
export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso não fornecido'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Erro na verificação do token:', error);
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

// Endpoint para buscar dados do usuário atual
export const getCurrentUser = async (req, res) => {
  try {
    const user = req.user; // Vem do middleware verifyToken
    
    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        nome: user.nome,
        subscriptionStatus: user.subscriptionStatus,
        points: user.points,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Erro ao buscar usuário atual:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Função para verificar se um email já está em uso
export const checkEmailExists = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email não fornecido' 
      });
    }

    const existingUser = await User.findOne({ email });
    
    return res.status(200).json({
      success: true,
      exists: !!existingUser
    });
  } catch (error) {
    console.error('Erro ao verificar email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao verificar disponibilidade do email', 
      error: error.message 
    });
  }
};