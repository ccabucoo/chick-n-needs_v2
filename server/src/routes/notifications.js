import express from 'express';
import jwt from 'jsonwebtoken';
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

// MVP: return simple notifications (order status, promotions)
router.get('/', auth, async (req, res) => {
  res.json([
    { id: 1, type: 'info', message: 'Welcome to Chick\'N Needs!' }
  ]);
});

export default router;


