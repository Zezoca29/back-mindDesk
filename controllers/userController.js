import User from '../models/User.js';
import MoodHistory from '../models/MoodHistory.js';
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
      // Novos campos
      streakCount: user.streakCount || 0,
      longestStreak: user.longestStreak || 0,
      lastActivityDate: user.lastActivityDate,
      moodStats: user.moodStats || {
        totalEntries: 0,
        averageMood: 0,
        lastMoodEntry: null,
        moodDistribution: {
          great: 0,
          good: 0,
          neutral: 0,
          stressed: 0,
          bad: 0
        }
      },
      activityStats: user.activityStats || {
        totalMeditations: 0,
        totalDiaryEntries: 0,
        totalStressEvents: 0,
        savedQuotes: 0,
        lastLoginDate: null
      },
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

// Novo endpoint para registrar humor
export const recordMood = async (req, res) => {
  try {
    const userId = req.user._id;
    const { mood, emotions, notes, triggers, activities, context } = req.body;

    if (!mood) {
      return res.status(400).json({
        success: false,
        message: 'Humor é obrigatório'
      });
    }

    // Criar entrada no histórico de humor
    const moodEntry = new MoodHistory({
      user: userId,
      mood,
      emotions: emotions || [],
      notes: notes || '',
      triggers: triggers || [],
      activities: activities || [],
      context: context || {}
    });

    await moodEntry.save();

    // Atualizar estatísticas do usuário
    const user = await User.findById(userId);
    if (user) {
      user.updateMoodStats(mood);
      user.updateStreak();
      await user.save();
    }

    res.status(201).json({
      success: true,
      message: 'Humor registrado com sucesso',
      moodEntry: {
        _id: moodEntry._id,
        mood: moodEntry.mood,
        moodValue: moodEntry.moodValue,
        createdAt: moodEntry.createdAt
      }
    });

  } catch (error) {
    console.error('Erro ao registrar humor:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Endpoint para obter histórico de humor
export const getMoodHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { days = 30, page = 1, limit = 20 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const moodHistory = await MoodHistory.find({
      user: userId,
      createdAt: { $gte: startDate }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select('mood moodValue emotions notes createdAt');

    const total = await MoodHistory.countDocuments({
      user: userId,
      createdAt: { $gte: startDate }
    });

    res.status(200).json({
      success: true,
      data: {
        history: moodHistory,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          count: moodHistory.length,
          totalRecords: total
        }
      }
    });

  } catch (error) {
    console.error('Erro ao buscar histórico de humor:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Endpoint para estatísticas de humor
export const getMoodStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = 30 } = req.query;

    // Tendência de humor nos últimos X dias
    const moodTrend = await MoodHistory.getMoodTrend(userId, parseInt(period));
    
    // Média por dia da semana
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    const weeklyAverage = await MoodHistory.getWeeklyAverage(userId, startDate, new Date());

    res.status(200).json({
      success: true,
      data: {
        trend: moodTrend,
        weeklyPattern: weeklyAverage,
        period: parseInt(period)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas de humor:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};