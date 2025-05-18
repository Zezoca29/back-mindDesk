import User from '../models/User.js';

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