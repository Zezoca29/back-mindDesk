import express from 'express';
import { createHabit, getHabits, updateHabit, deleteHabit } from '../controllers/habitController.js';
import { verifyToken } from '../controllers/userController.js';

const router = express.Router();

router.post('/create', verifyToken, createHabit);
router.get('/get', verifyToken, getHabits);
router.put('/:id', verifyToken, updateHabit);
router.delete('/:id', verifyToken, deleteHabit);

export default router;