// controllers/authController.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Função para gerar o token JWT
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Cadastro
export const registerUser = async (req, res) => {
  const { email, password, nome } = req.body;

  try {
    // Validar campos obrigatórios
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email e senha são obrigatórios' 
      });
    }

    // Verificar se o usuário já existe (busca case-insensitive)
    const existingUser = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });
    
    if (existingUser) {
      console.log(`Tentativa de cadastro com email já existente: ${email}`);
      return res.status(409).json({ 
        success: false,
        message: 'Este email já está cadastrado. Tente fazer login ou use outro email.' 
      });
    }

    // Criar usuário com senha em texto simples (sem criptografia)
    const user = new User({ 
      email: email.toLowerCase().trim(), 
      password, // Senha armazenada diretamente
      nome: nome?.trim() || ''
    });
    
    await user.save();

    console.log(`Novo usuário cadastrado com sucesso: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Usuário cadastrado com sucesso',
      user: {
        _id: user._id,
        email: user.email,
        nome: user.nome,
        subscriptionStatus: user.subscriptionStatus,
        points: user.points
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    
    // Tratar erro de duplicação do MongoDB
    if (error.code === 11000) {
      return res.status(409).json({ 
        success: false,
        message: 'Este email já está cadastrado.' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Erro interno do servidor. Tente novamente.' 
    });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      message: 'Por favor, informe e-mail e senha' 
    });
  }

  try {
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Email ou senha incorretos' 
      });
    }

    // Verificar se o usuário tem uma senha definida
    if (!user.password) {
      console.error('Erro no login: usuário não possui senha definida');
      return res.status(401).json({ 
        success: false,
        message: 'Erro na autenticação. Contate o suporte.' 
      });
    }
    
    // Comparação direta das senhas (sem criptografia)
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      console.log('Login falhou - credenciais inválidas para:', user.email);
      return res.status(401).json({ 
        success: false,
        message: 'Email ou senha incorretos' 
      });
    }

    console.log('Login realizado com sucesso para:', user.email);

    res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso',
      user: {
        _id: user._id,
        email: user.email,
        nome: user.nome,
        subscriptionStatus: user.subscriptionStatus,
        points: user.points
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro interno no servidor' 
    });
  }
};