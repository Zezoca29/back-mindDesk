import Motivational from '../models/Motivational.js';

export const listMotivationalQuotes = async (req, res) => {
  try {
    const quotes = await Motivational.find();
    res.json(quotes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch quotes' });
  }
};

export const saveQuote = async (req, res) => {
  const { quoteId } = req.body;

  try {
    const quote = await Motivational.findById(quoteId);
    quote.savedBy.push(req.user.id);
    await quote.save();

    res.json({ message: 'Quote saved!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to save quote' });
  }
};
