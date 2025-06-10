// models/MoodHistory.js
import mongoose from 'mongoose';

const MoodHistorySchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  mood: {
    type: String,
    enum: ['great', 'good', 'neutral', 'stressed', 'bad'],
    required: true
  },
  moodValue: {
    type: Number,
    required: true,
    min: 1,
    max: 5
    // great: 5, good: 4, neutral: 3, stressed: 2, bad: 1
  },
  emotions: [{
    emotion: {
      type: String,
      enum: ['happy', 'sad', 'angry', 'anxious', 'excited', 'calm', 'frustrated', 'hopeful', 'lonely', 'grateful']
    },
    intensity: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    }
  }],
  notes: {
    type: String,
    maxlength: 500
  },
  triggers: [{
    type: String,
    enum: ['work', 'family', 'health', 'finance', 'relationship', 'weather', 'exercise', 'sleep', 'social', 'other']
  }],
  activities: [{
    type: String,
    enum: ['meditation', 'exercise', 'reading', 'music', 'socializing', 'working', 'resting', 'eating', 'studying', 'other']
  }],
  // Contexto do momento
  context: {
    location: String,
    weather: String,
    timeOfDay: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night']
    }
  },
  // Dados para análise de padrões
  patterns: {
    weekday: {
      type: Number,
      min: 0,
      max: 6 // 0 = Domingo, 6 = Sábado
    },
    hour: {
      type: Number,
      min: 0,
      max: 23
    },
    month: {
      type: Number,
      min: 1,
      max: 12
    }
  },
  // Referência para entrada do diário (se existir)
  diaryEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DiaryEntry',
    default: null
  }
}, { 
  timestamps: true 
});

// Middleware para calcular padrões antes de salvar
MoodHistorySchema.pre('save', function(next) {
  const now = new Date();
  this.patterns.weekday = now.getDay();
  this.patterns.hour = now.getHours();
  this.patterns.month = now.getMonth() + 1;
  
  // Converter mood string para valor numérico
  const moodValues = {
    'bad': 1,
    'stressed': 2,
    'neutral': 3,
    'good': 4,
    'great': 5
  };
  
  if (!this.moodValue) {
    this.moodValue = moodValues[this.mood];
  }
  
  next();
});

// Índices para consultas otimizadas
MoodHistorySchema.index({ user: 1, createdAt: -1 });
MoodHistorySchema.index({ user: 1, mood: 1 });
MoodHistorySchema.index({ user: 1, 'patterns.weekday': 1 });
MoodHistorySchema.index({ user: 1, 'patterns.hour': 1 });

// Métodos estáticos para análises
MoodHistorySchema.statics.getWeeklyAverage = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$patterns.weekday',
        averageMood: { $avg: '$moodValue' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

MoodHistorySchema.statics.getMoodTrend = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        averageMood: { $avg: '$moodValue' },
        entries: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);
};

export default mongoose.model('MoodHistory', MoodHistorySchema);