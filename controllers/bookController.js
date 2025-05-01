import Book from '../models/Book.js';

export const listBooks = async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch books' });
  }
};
