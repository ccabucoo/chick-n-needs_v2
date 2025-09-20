import express from 'express';
import jwt from 'jsonwebtoken';
import { Review, Product } from '../models/index.js';
import { isDenylisted } from '../utils/tokenDenylist.js';

const router = express.Router();

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Server misconfiguration' });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (isDenylisted(payload.jti)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.user = payload;
    next();
  } catch (e) { return res.status(401).json({ message: 'Unauthorized' }); }
}

router.get('/:productId', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  const { rows, count } = await Review.findAndCountAll({ where: { productId: req.params.productId }, offset, limit, order: [['createdAt', 'DESC']] });
  res.setHeader('X-Total-Count', String(count));
  res.setHeader('X-Page', String(page));
  res.setHeader('X-Limit', String(limit));
  res.json(rows);
});

router.post('/:productId', auth, async (req, res) => {
  const { rating, comment } = req.body;
  const text = String(comment || '').trim();
  if (!text) return res.status(400).json({ message: 'Comment is required' });
  if (text.length > 1000) return res.status(400).json({ message: 'Comment too long (max 1000 characters)' });
  const banned = ['shit','fuck','bitch','asshole','bastard'];
  const lowered = text.toLowerCase();
  if (banned.some(w => lowered.includes(w))) {
    return res.status(400).json({ message: 'Comment contains inappropriate language' });
  }
  const safeComment = text.replace(/https?:\/\/\S+/g, '[link]');
  const numericRating = Number(rating);
  if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  }
  const review = await Review.create({ productId: req.params.productId, userId: req.user.uid, rating: numericRating, comment: safeComment });
  res.json(review);
});

export default router;


