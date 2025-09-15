import express from 'express';
import jwt from 'jsonwebtoken';
import { sequelize } from '../lib/db.js';
import { CartItem, Order, OrderItem, Address, Product, ProductImage, User } from '../models/index.js';
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
  } catch (e) { return res.status(401).json({ message: 'Unauthorized' }); }
}

router.get('/', auth, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  const { rows, count } = await Order.findAndCountAll({ 
    where: { userId: req.user.uid }, 
    include: [
      { model: OrderItem, include: [{ model: Product, include: [ProductImage] }] }
    ],
    offset,
    limit,
    order: [['orderTime', 'DESC']]
  });
  res.setHeader('X-Total-Count', String(count));
  res.setHeader('X-Page', String(page));
  res.setHeader('X-Limit', String(limit));
  res.json(rows);
});

router.get('/:id', auth, async (req, res) => {
  const order = await Order.findOne({ 
    where: { id: req.params.id, userId: req.user.uid }, 
    include: [
      { model: OrderItem, include: [{ model: Product, include: [ProductImage] }] }, 
      { model: Address, as: 'shippingAddress' }
    ] 
  });
  if (!order) return res.status(404).json({ message: 'Not found' });
  res.json(order);
});

router.post('/checkout', auth, async (req, res) => {
  const { shippingAddress } = req.body; // { line1, city, phone, ... } or { id: addressId }
  const t = await sequelize.transaction();
  try {
    let address;
    // If shippingAddress has an id, it's a saved address
    if (shippingAddress.id) {
      address = await Address.findByPk(shippingAddress.id, { transaction: t });
      if (!address || address.userId !== req.user.uid) {
        await t.rollback();
        return res.status(400).json({ message: 'Invalid address' });
      }
      // Ensure phone exists for delivery
      if (!address.phone) {
        await t.rollback();
        return res.status(400).json({ message: 'Saved address missing phone. Please edit address to add a recipient phone.' });
      }
    } else {
      // Create new address
      // Server-side validation and filtering for PH 11-digit numbers starting with 09
      const rawPhone = String(shippingAddress.phone || '').replace(/\D/g, '').slice(0, 11);
      if (!/^09\d{9}$/.test(rawPhone)) {
        await t.rollback();
        return res.status(400).json({ message: 'Invalid recipient phone. Use 11 digits starting with 09.' });
      }
      address = await Address.create({ ...shippingAddress, phone: rawPhone, userId: req.user.uid }, { transaction: t });
    }
    
    const cartItems = await CartItem.findAll({ where: { userId: req.user.uid }, include: [Product], transaction: t, lock: t.LOCK.UPDATE });
    if (cartItems.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Validate stock and compute totals
    for (const ci of cartItems) {
      const product = await Product.findByPk(ci.productId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!product) {
        await t.rollback();
        return res.status(400).json({ message: `Product not found (id ${ci.productId})` });
      }
      if (product.stock < ci.quantity) {
        await t.rollback();
        return res.status(400).json({ message: `Insufficient stock for ${product.name}. Available: ${product.stock}` });
      }
    }

    const subtotal = cartItems.reduce((sum, ci) => sum + Number(ci.product.price) * ci.quantity, 0);
    const shippingFee = 0;
    const total = subtotal + shippingFee;
    const uniq = `${Date.now()}-${req.user.uid}-${Math.floor(Math.random()*1e6).toString().padStart(6,'0')}`;
    const order = await Order.create({ 
      userId: req.user.uid, 
      subtotal, 
      shippingFee, 
      total, 
      paymentMethod: 'cod', 
      shippingAddressId: address.id,
      transactionNumber: uniq,
      orderTime: new Date()
    }, { transaction: t });

    // Deduct stock and create order items
    for (const ci of cartItems) {
      const product = await Product.findByPk(ci.productId, { transaction: t, lock: t.LOCK.UPDATE });
      product.stock = product.stock - ci.quantity;
      await product.save({ transaction: t });
      await OrderItem.create({ orderId: order.id, productId: ci.productId, quantity: ci.quantity, price: ci.product.price }, { transaction: t });
    }

    await CartItem.destroy({ where: { userId: req.user.uid }, transaction: t });
    await t.commit();
    res.json(order);
  } catch (e) {
    await t.rollback();
    console.error('Checkout error:', e);
    res.status(500).json({ message: 'Checkout failed' });
  }
});

export default router;


