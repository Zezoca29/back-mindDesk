import StressEvent from '../models/StressEvent.js';

export const registerStressEvent = async (req, res) => {
  const { type } = req.body;

  try {
    const event = await StressEvent.create({
      user: req.user.id,
      type,
    });

    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to register stress event' });
  }
};
