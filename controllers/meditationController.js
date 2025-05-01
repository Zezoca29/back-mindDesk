import Meditation from '../models/Meditation.js';

export const listMeditations = async (req, res) => {
  try {
    const meditations = await Meditation.find();
    res.json(meditations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch meditations' });
  }
};
