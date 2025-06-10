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
  // Novos campos para controle de streak (dias consecutivos)
  streakCount: {
    type: Number,
    default: 0
  },
  lastActivityDate: {
    type: Date,
    default: null
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  // Campos para estatísticas de humor
  moodStats: {
    totalEntries: {
      type: Number,
      default: 0
    },
    averageMood: {
      type: Number,
      default: 0
    },
    lastMoodEntry: {
      type: Date,
      default: null
    },
    moodDistribution: {
      great: { type: Number, default: 0 },
      good: { type: Number, default: 0 },
      neutral: { type: Number, default: 0 },
      stressed: { type: Number, default: 0 },
      bad: { type: Number, default: 0 }
    }
  },
  // Campos para atividades do usuário
  activityStats: {
    totalMeditations: {
      type: Number,
      default: 0
    },
    totalDiaryEntries: {
      type: Number,
      default: 0
    },
    totalStressEvents: {
      type: Number,
      default: 0
    },
    savedQuotes: {
      type: Number,
      default: 0
    },
    lastLoginDate: {
      type: Date,
      default: null
    }
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

// Método para atualizar streak
userSchema.methods.updateStreak = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastActivity = this.lastActivityDate ? new Date(this.lastActivityDate) : null;
  
  if (lastActivity) {
    lastActivity.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - lastActivity.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (diffDays === 1) {
      // Atividade no dia seguinte - incrementa streak
      this.streakCount += 1;
    } else if (diffDays > 1) {
      // Gap maior que 1 dia - reset streak
      this.streakCount = 1;
    }
    // Se diffDays === 0, não faz nada (já registrou atividade hoje)
  } else {
    // Primeira atividade
    this.streakCount = 1;
  }
  
  // Atualiza o recorde de streak
  if (this.streakCount > this.longestStreak) {
    this.longestStreak = this.streakCount;
  }
  
  this.lastActivityDate = new Date();
};

// Método para atualizar estatísticas de humor
userSchema.methods.updateMoodStats = function(mood) {
  this.moodStats.totalEntries += 1;
  this.moodStats.moodDistribution[mood] += 1;
  this.moodStats.lastMoodEntry = new Date();
  
  // Calcular média de humor (convertendo strings para números)
  const moodValues = {
    'great': 5,
    'good': 4,
    'neutral': 3,
    'stressed': 2,
    'bad': 1
  };
  
  const total = Object.keys(this.moodStats.moodDistribution).reduce((sum, key) => {
    return sum + (this.moodStats.moodDistribution[key] * moodValues[key]);
  }, 0);
  
  this.moodStats.averageMood = total / this.moodStats.totalEntries;
};

const User = mongoose.model('User', userSchema);

export default User;