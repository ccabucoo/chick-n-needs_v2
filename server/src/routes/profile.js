import express from 'express';
import jwt from 'jsonwebtoken';
import { User, Address } from '../models/index.js';
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
  } catch { return res.status(401).json({ message: 'Unauthorized' }); }
}

router.get('/', auth, async (req, res) => {
  const user = await User.findByPk(req.user.uid, { include: [Address] });
  res.json(user);
});

router.patch('/', auth, async (req, res) => {
  const user = await User.findByPk(req.user.uid);
  const { firstName, lastName, phone } = req.body;
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (phone !== undefined) user.phone = phone;
  await user.save();
  res.json(user);
});

router.post('/addresses', auth, async (req, res) => {
  const count = await Address.count({ where: { userId: req.user.uid } });
  if (count >= 2) {
    return res.status(400).json({ message: 'Address limit reached (max 2). Please delete an address before adding a new one.' });
  }
  const address = await Address.create({ ...req.body, userId: req.user.uid });
  res.json(address);
});

// Update an address (must belong to the user)
router.put('/addresses/:id', auth, async (req, res) => {
  const address = await Address.findByPk(req.params.id);
  if (!address || address.userId !== req.user.uid) {
    return res.status(404).json({ message: 'Address not found' });
  }
  const { line1, line2, barangay, city, state, postalCode, country, phone } = req.body;
  if (line1 !== undefined) address.line1 = line1;
  if (line2 !== undefined) address.line2 = line2;
  if (barangay !== undefined) address.barangay = barangay;
  if (city !== undefined) address.city = city;
  if (state !== undefined) address.state = state;
  if (postalCode !== undefined) address.postalCode = postalCode;
  if (country !== undefined) address.country = country;
  if (phone !== undefined) address.phone = phone;
  await address.save();
  res.json(address);
});

// Delete an address (must belong to the user)
router.delete('/addresses/:id', auth, async (req, res) => {
  const address = await Address.findByPk(req.params.id);
  if (!address || address.userId !== req.user.uid) {
    return res.status(404).json({ message: 'Address not found' });
  }
  await address.destroy();
  res.json({ ok: true });
});

export default router;


