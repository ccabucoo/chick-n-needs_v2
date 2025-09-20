import express from 'express';
import { Category, Product } from '../models/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const items = await Category.findAll();
  res.json(items);
});

router.get('/:id/products', async (req, res) => {
  const products = await Product.findAll({ where: { categoryId: req.params.id } });
  res.json(products);
});

export default router;


