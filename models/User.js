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
  // Configurações de metas personalizadas
  goals: {
    dailyMoodEntries: {
      type: Number,
      default: 1
    },
    dailyMeditationMinutes: {
      type: Number,
      default: 10
    },
    dailyDiaryEntries: {
      type: Number,
      default: 1
    },
    weeklyMindfulnessHours: {
      type: Number,
      default: 2
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

// Método para atualizar streak melhorado
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

// Método para calcular progresso da meta diária
userSchema.methods.getDailyProgress = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Metas diárias (usar as configurações personalizadas do usuário)
  const dailyGoals = {
    moodEntries: this.goals.dailyMoodEntries,
    meditationMinutes: this.goals.dailyMeditationMinutes,
    diaryEntries: this.goals.dailyDiaryEntries
  };

  // Progresso atual do dia
  const todayProgress = {
    moodEntries: 0,
    meditationMinutes: 0,
    diaryEntries: 0
  };

  // Verificar se fez entrada de humor hoje
  if (this.moodStats.lastMoodEntry) {
    const lastMoodDate = new Date(this.moodStats.lastMoodEntry);
    if (lastMoodDate >= today && lastMoodDate < tomorrow) {
      todayProgress.moodEntries = 1;
    }
  }

  // Verificar outras atividades de hoje (simulação - você pode implementar com base em timestamps reais)
  const hasActivityToday = this.lastActivityDate && 
    new Date(this.lastActivityDate) >= today && 
    new Date(this.lastActivityDate) < tomorrow;

  if (hasActivityToday) {
    todayProgress.meditationMinutes = Math.min(this.activityStats.totalMeditations > 0 ? 10 : 0, dailyGoals.meditationMinutes);
    todayProgress.diaryEntries = this.activityStats.totalDiaryEntries > 0 ? 1 : 0;
  }

  // Calcular porcentagem total
  const totalPoints = Object.keys(dailyGoals).reduce((sum, key) => {
    const progress = Math.min(todayProgress[key], dailyGoals[key]);
    return sum + (progress / dailyGoals[key]);
  }, 0);

  const percentage = Math.round((totalPoints / Object.keys(dailyGoals).length) * 100);

  return {
    percentage,
    goals: dailyGoals,
    progress: todayProgress,
    isCompleted: percentage >= 100
  };
};

// Método para calcular minutos totais de mindfulness
userSchema.methods.getTotalMindfulnessMinutes = function() {
  // Calcular baseado nas atividades do usuário
  const meditationMinutes = this.activityStats.totalMeditations * 10; // 10 min por meditação em média
  const moodReflectionMinutes = this.moodStats.totalEntries * 3; // 3 min por entrada de humor
  const diaryMinutes = this.activityStats.totalDiaryEntries * 15; // 15 min por entrada de diário
  
  return meditationMinutes + moodReflectionMinutes + diaryMinutes;
};

// Método para verificar se o usuário está ativo hoje
userSchema.methods.isActiveToday = function() {
  if (!this.lastActivityDate) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const lastActivity = new Date(this.lastActivityDate);
  
  return lastActivity >= today && lastActivity < tomorrow;
};

// Método para resetar streak se necessário
userSchema.methods.checkAndResetStreak = function() {
  if (!this.lastActivityDate) return;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastActivity = new Date(this.lastActivityDate);
  lastActivity.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - lastActivity.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  // Se passou mais de 1 dia sem atividade, reset do streak
  if (diffDays > 1) {
    this.streakCount = 0;
  }
};

// Middleware para verificar streak antes de salvar
userSchema.pre('save', function(next) {
  // Verificar e resetar streak se necessário
  this.checkAndResetStreak();
  next();
});

const User = mongoose.model('User', userSchema);

export default User;