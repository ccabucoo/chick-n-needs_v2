import express from 'express';
import jwt from 'jsonwebtoken';
import { CartItem, Product, ProductImage } from '../models/index.js';
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
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

// Get current user's cart
router.get('/', auth, async (req, res) => {
  const items = await CartItem.findAll({ where: { userId: req.user.uid }, include: [{ model: Product, include: [ProductImage] }] });
  res.json(items);
});

// Add item to cart (does not reserve stock)
router.post('/', auth, async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  if (!productId) return res.status(400).json({ message: 'productId is required' });

  const product = await Product.findByPk(productId);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const requestedQty = Number(quantity) || 1;
  if (requestedQty < 1) return res.status(400).json({ message: 'Quantity must be at least 1' });

  const [item, created] = await CartItem.findOrCreate({
    where: { userId: req.user.uid, productId },
    defaults: { quantity: requestedQty }
  });

  if (!created) {
    const newQty = item.quantity + requestedQty;
    item.quantity = Math.max(1, Math.min(newQty, 999));
    await item.save();
  }

  const withProduct = await CartItem.findByPk(item.id, { include: [{ model: Product, include: [ProductImage] }] });
  res.json(withProduct);
});

// Update cart item quantity (does not reserve stock)
router.patch('/:id', auth, async (req, res) => {
  const { quantity } = req.body;
  const item = await CartItem.findByPk(req.params.id);
  if (!item || item.userId !== req.user.uid) return res.status(404).json({ message: 'Cart item not found' });
  if (quantity !== undefined) {
    const q = Number(quantity);
    if (!Number.isInteger(q) || q < 1) return res.status(400).json({ message: 'Invalid quantity' });
    item.quantity = Math.min(q, 999);
  }
  await item.save();
  const withProduct = await CartItem.findByPk(item.id, { include: [{ model: Product, include: [ProductImage] }] });
  res.json(withProduct);
});

// Remove item from cart
router.delete('/:id', auth, async (req, res) => {
  const item = await CartItem.findByPk(req.params.id);
  if (!item || item.userId !== req.user.uid) return res.status(404).json({ message: 'Cart item not found' });
  await item.destroy();
  res.json({ ok: true });
});

export default router;



