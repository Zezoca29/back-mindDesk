import DiaryEntry from '../models/DiaryEntry.js';

export const createDiaryEntry = async (req, res) => {
  const { content, mood, emotions } = req.body;

  try {
    const entry = await DiaryEntry.create({
      user: req.user.id,
      content,
      mood: mood || 'neutral',
      emotions: emotions || {},
      aiAnalysis: 'Em análise...', // depois podemos integrar uma IA
    });

    res.json(entry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create diary entry' });
  }
};

export const getDiaryEntries = async (req, res) => {
  try {
    const entries = await DiaryEntry.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50); // Limitar a 50 entradas mais recentes

    res.json(entries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch diary entries' });
  }
};