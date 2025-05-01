import Tracking from '../models/Tracking.js';

export const registerTracking = async (req, res) => {
  const { action, pointsGained } = req.body;

  try {
    const tracking = await Tracking.create({
      user: req.user.id,
      action,
      pointsGained,
    });

    res.json(tracking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to register tracking' });
  }
};
