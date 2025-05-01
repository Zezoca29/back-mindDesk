import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'; // não esqueça de importar o bcrypt

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
  subscriptionStatus: { type: String, default: 'free' },
  points: { type: Number, default: 0 },
}, { timestamps: true });

// Criptografar senha antes de salvar
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para comparar senha digitada com senha salva
UserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    console.error("Tentativa de comparar senha, mas o usuário não tem senha definida");
    return false;
  }
  
  if (!candidatePassword) {
    console.error("Tentativa de comparar com senha candidata indefinida");
    return false;
  }
  
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error("Erro ao comparar senhas:", error);
    return false;
  }
};

const User = mongoose.model('User', UserSchema);

export default User;
