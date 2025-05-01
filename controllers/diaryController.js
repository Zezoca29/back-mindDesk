import DiaryEntry from '../models/DiaryEntry.js';

export const createDiaryEntry = async (req, res) => {
  const { content } = req.body;

  try {
    const entry = await DiaryEntry.create({
      user: req.user.id,
      content,
      aiAnalysis: 'Em análise...', // depois podemos integrar uma IA
    });

    res.json(entry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create diary entry' });
  }
};
