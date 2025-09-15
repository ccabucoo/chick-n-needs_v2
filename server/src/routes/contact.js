import express from 'express';
import { body, validationResult } from 'express-validator';
import { sequelize } from '../lib/db.js';
import { ContactMessage } from '../models/index.js';

const router = express.Router();

// For MVP: log messages to console; you can later email/store these
router.post('/',
  body('name').trim().notEmpty().isLength({ max: 191 }),
  body('email').trim().isEmail().isLength({ max: 191 }),
  body('subject').optional().trim().isLength({ max: 191 }),
  body('orderNo').optional().trim().isLength({ max: 100 }),
  body('message').trim().isLength({ min: 5 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { name, email, subject, orderNo, message } = req.body;
    try {
      const saved = await ContactMessage.create({ name, email, subject, orderNo, message });
      return res.json({ ok: true, id: saved.id });
    } catch (e) {
      console.error('Failed to save contact message:', e);
      return res.status(500).json({ ok: false, message: 'Failed to save your message. Please try again.' });
    }
  }
);

export default router;


