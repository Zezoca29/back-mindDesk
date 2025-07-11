import Habit from '../models/Habit.js';

// Create a new habit
export const createHabit = async (req, res) => {
  try {
    const { habitName, time, description } = req.body;
    const user = req.user._id; // req.user deve ser preenchido pelo middleware de autenticação

    console.log(`[CREATE HABIT] Usuário: ${user}, Habit: ${habitName}`);

    const habit = new Habit({
      habitName,
      time,
      description,
      user
    });

    await habit.save();
    console.log(`[CREATE HABIT] Hábito criado com sucesso: ${habit._id}`);
    res.status(201).json(habit);
  } catch (error) {
    console.error(`[CREATE HABIT][ERRO]`, error);
    res.status(400).json({ error: error.message });
  }
};

// Get all habits
export const getHabits = async (req, res) => {
  try {
    console.log('[GET HABITS] Iniciando busca de hábitos...');
    console.log('[GET HABITS] req.user:', req.user);
    
    const userId = req.user._id;
    console.log(`[GET HABITS] Listando hábitos do usuário: ${userId}`);
    
    const habits = await Habit.find({ user: userId });
    console.log(`[GET HABITS] Hábitos encontrados: ${habits.length}`);
    console.log('[GET HABITS] Hábitos:', habits);
    
    res.json(habits);
  } catch (error) {
    console.error(`[GET HABITS][ERRO]`, error);
    res.status(500).json({ error: error.message });
  }
};

// Edit a habit
export const updateHabit = async (req, res) => {
  try {
    console.log(`[UPDATE HABIT] ID: ${req.params.id}`);
    const habit = await Habit.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!habit) {
      console.warn(`[UPDATE HABIT][NOT FOUND] ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Habit not found' });
    }
    console.log(`[UPDATE HABIT] Hábito atualizado: ${habit._id}`);
    res.json(habit);
  } catch (error) {
    console.error(`[UPDATE HABIT][ERRO]`, error);
    res.status(400).json({ error: error.message });
  }
};

// Delete a habit
export const deleteHabit = async (req, res) => {
  try {
    console.log(`[DELETE HABIT] ID: ${req.params.id}`);
    const habit = await Habit.findByIdAndDelete(req.params.id);
    if (!habit) {
      console.warn(`[DELETE HABIT][NOT FOUND] ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Habit not found' });
    }
    console.log(`[DELETE HABIT] Hábito deletado: ${habit._id}`);
    res.json({ message: 'Habit deleted' });
  } catch (error) {
    console.error(`[DELETE HABIT][ERRO]`, error);
    res.status(500).json({ error: error.message });
  }
}