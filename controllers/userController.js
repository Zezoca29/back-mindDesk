import User from '../models/User.js';
import jwt from 'jsonwebtoken';

// Middleware para verificar token
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Header de autorização não fornecido'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso não fornecido'
      });
    }

    console.log('Verificando token:', token.substring(0, 20) + '...');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decodificado:', decoded);
    
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    console.log('Usuário encontrado:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error('Erro na verificação do token:', error);
    
    let message = 'Token inválido';
    if (error.name === 'TokenExpiredError') {
      message = 'Token expirado';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Token malformado';
    }
    
    return res.status(401).json({
      success: false,
      message: message
    });
  }
};

// Endpoint para buscar dados do usuário atual
export const getCurrentUser = async (req, res) => {
  try {
    console.log('Buscando dados do usuário atual...');
    
    const user = req.user; // Vem do middleware verifyToken
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const userData = {
      _id: user._id,
      email: user.email,
      nome: user.nome,
      subscriptionStatus: user.subscriptionStatus,
      points: user.points,
      createdAt: user.createdAt
    };

    console.log('Retornando dados do usuário:', userData);
    
    // Garantir que a resposta seja JSON
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Erro ao buscar usuário atual:', error);
    
    // Garantir que mesmo em erro, a resposta seja JSON
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};