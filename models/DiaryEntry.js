// models/DiaryEntry.js
import mongoose from 'mongoose';

const DiaryEntrySchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  mood: {
    type: String,
    enum: ['great', 'good', 'neutral', 'stressed', 'bad'],
    default: 'neutral'
  },
  moodValue: {
    type: Number,
    min: 1,
    max: 5
  },
  emotions: {
    primary: {
      type: String,
      enum: ['happy', 'sad', 'angry', 'anxious', 'excited', 'calm', 'frustrated', 'hopeful', 'lonely', 'grateful']
    },
    secondary: [{
      emotion: String,
      intensity: {
        type: Number,
        min: 1,
        max: 10,
        default: 5
      }
    }],
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  // Tags para categorização
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  // Análise de IA (mantendo o campo original)
  aiAnalysis: {
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral']
    },
    keyTopics: [String],
    suggestions: [String],
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    }
  },
  // Métricas de escrita
  metrics: {
    wordCount: {
      type: Number,
      default: 0
    },
    sentimentScore: {
      type: Number,
      default: 0,
      min: -1,
      max: 1
    },
    timeSpentWriting: {
      type: Number, // em segundos
      default: 0
    }
  },
  // Status da entrada
  isPrivate: {
    type: Boolean,
    default: true
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  // Referência para histórico de humor
  moodHistory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MoodHistory',
    default: null
  }
}, { 
  timestamps: true 
});

// Middleware para calcular métricas antes de salvar
DiaryEntrySchema.pre('save', function(next) {
  // Calcular contagem de palavras
  if (this.content) {
    this.metrics.wordCount = this.content.split(/\s+/).filter(word => word.length > 0).length;
  }
  
  // Converter mood para valor numérico
  const moodValues = {
    'bad': 1,
    'stressed': 2,
    'neutral': 3,
    'good': 4,
    'great': 5
  };
  
  if (this.mood && !this.moodValue) {
    this.moodValue = moodValues[this.mood];
  }
  
  next();
});

// Middleware para atualizar estatísticas do usuário
DiaryEntrySchema.post('save', async function(doc) {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(doc.user);
    
    if (user) {
      // Atualizar streak
      user.updateStreak();
      
      // Atualizar estatísticas de humor
      user.updateMoodStats(doc.mood);
      
      // Incrementar contador de entradas do diário
      user.activityStats.totalDiaryEntries += 1;
      
      await user.save();
    }
  } catch (error) {
    console.error('Erro ao atualizar estatísticas do usuário:', error);
  }
});

// Índices para consultas otimizadas
DiaryEntrySchema.index({ user: 1, createdAt: -1 });
DiaryEntrySchema.index({ user: 1, mood: 1 });
DiaryEntrySchema.index({ user: 1, tags: 1 });
DiaryEntrySchema.index({ user: 1, isFavorite: 1 });

export default mongoose.model('DiaryEntry', DiaryEntrySchema);