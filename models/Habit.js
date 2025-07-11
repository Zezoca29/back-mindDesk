import mongoose from 'mongoose';

const habitSchema = new mongoose.Schema({
  habitName: {
    type: String,
    required: [true, 'Habit name is required'],
    trim: true
  },
  time: {
    type: String,
    required: [true, 'Time is required']
  },
  description: {
    type: String,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  }
}, {
  timestamps: true
});

const Habit = mongoose.model('Habit', habitSchema);

export default Habit;