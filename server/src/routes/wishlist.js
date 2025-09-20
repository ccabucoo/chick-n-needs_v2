import express from 'express';
import jwt from 'jsonwebtoken';
import { Wishlist, Product, ProductImage } from '../models/index.js';
import { isDenylisted } from '../utils/tokenDenylist.js';

const router = express.Router();

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try { 
    if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'Server misconfiguration' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (isDenylisted(payload.jti)) return res.status(401).json({ message: 'Unauthorized' });
    req.user = payload; 
    next(); 
  }
  catch { return res.status(401).json({ message: 'Unauthorized' }); }
}

router.get('/', auth, async (req, res) => {
  const items = await Wishlist.findAll({ where: { userId: req.user.uid }, include: [{ model: Product, include: [ProductImage] }] });
  res.json(items);
});

router.post('/', auth, async (req, res) => {
  const { productId } = req.body;
  const item = await Wishlist.findOrCreate({ where: { userId: req.user.uid, productId }, defaults: {} });
  res.json(item[0]);
});

router.delete('/:id', auth, async (req, res) => {
  const count = await Wishlist.destroy({ where: { id: req.params.id, userId: req.user.uid } });
  res.json({ deleted: count > 0 });
});

export default router;


