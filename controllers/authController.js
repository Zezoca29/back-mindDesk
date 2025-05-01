import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const loginWithInstagram = async (req, res) => {
  const { instagramId, email } = req.body;

  try {
    let user = await User.findOne({ instagramId });

    if (!user) {
      user = await User.create({ instagramId, email });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.json({ message: 'Login successful', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Função para gerar o token JWT
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Cadastro
export const registerUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Usuário já existe' });
    }

    const user = new User({ email, password });
    await user.save();

    res.status(201).json({
      _id: user._id,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Por favor, informe e-mail e senha' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas (usuário não encontrado)' });
    }

    // Verificar se o usuário tem uma senha definida
    if (!user.password) {
      console.error('Erro no login: usuário não possui senha definida');
      return res.status(401).json({ message: 'Erro na autenticação. Contate o suporte.' });
    }

    // Verificação adicional de logs para debug
    console.log('Tentando comparar senha para:', email);
    console.log('A senha do usuário está definida:', !!user.password);
    
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciais inválidas (senha incorreta)' });
    }

    res.status(200).json({
      _id: user._id,
      email: user.email,
      subscriptionStatus: user.subscriptionStatus,
      points: user.points,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
};