// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'Senha é obrigatória']
  },
  nome: {
    type: String,
    trim: true
  },
  subscriptionStatus: {
    type: String,
    enum: ['free', 'premium', 'premium_plus'],
    default: 'free'
  },
  points: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Método para comparar senha durante login (comparação direta, sem hash)
userSchema.methods.comparePassword = async function(enteredPassword) {
  return this.password === enteredPassword;
};

// Removido o middleware de criptografia da senha

const User = mongoose.model('User', userSchema);

export default User;