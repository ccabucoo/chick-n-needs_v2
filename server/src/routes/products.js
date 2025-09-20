import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { Op, Product, Category, ProductImage } from '../models/index.js';
import { sequelize } from '../lib/db.js';

const router = express.Router();

router.get('/', 
  [
    query('q').optional().isLength({ max: 100 }).withMessage('Search query too long'),
    query('categoryId').optional().isInt({ min: 1 }).withMessage('Invalid category ID'),
    query('sort').optional().isIn(['name', 'price', 'createdAt', 'sold']).withMessage('Invalid sort field'),
    query('order').optional().isIn(['asc', 'desc']).withMessage('Invalid order'),
    query('minPrice').optional().isFloat({ min: 0 }).withMessage('Invalid min price'),
    query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Invalid max price'),
    query('tags').optional().isLength({ max: 200 }).withMessage('Tags too long'),
    query('inStock').optional().isBoolean().withMessage('Invalid inStock value')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Invalid filters', errors: errors.array() });
      }
      const { 
        q, 
        categoryId, 
        sort = 'name', 
        order = 'asc', 
        minPrice, 
        maxPrice,
        tags,
        inStock,
        page: pageParam,
        limit: limitParam
      } = req.query;
      const page = Math.max(1, parseInt(pageParam, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(limitParam, 10) || 20));
      const offset = (page - 1) * limit;
    
    const where = {};
    
    // Search by name and description (avoid JSON LIKE issues on some MySQL setups)
    if (q) {
      where[Op.or] = [
        { name: { [Op.like]: `%${q}%` } },
        { description: { [Op.like]: `%${q}%` } }
      ];
    }
    
    // Price range filtering
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }
    
    // Category filtering
    if (categoryId) {
      where.categoryId = categoryId;
    }
    
    // Stock filtering
    if (inStock === 'true') {
      where.stock = { [Op.gt]: 0 };
    }
    
    // Tags filtering: match tag terms against name or description
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      if (tagArray.length) {
        const tagConds = tagArray.map(tag => ({
          [Op.or]: [
            { name: { [Op.like]: `%${tag}%` } },
            { description: { [Op.like]: `%${tag}%` } }
          ]
        }));
        where[Op.and] = (where[Op.and] || []).concat(tagConds);
      }
    }
    
    const { rows, count } = await Product.findAndCountAll({
      where,
      attributes: {
        include: [
          [
            sequelize.literal(
              '(SELECT COALESCE(SUM(`order_items`.`quantity`),0) FROM `order_items` WHERE `order_items`.`product_id` = `product`.`id`)'
            ),
            'soldCount'
          ]
        ]
      },
      include: [Category, ProductImage],
      order: sort === 'sold' 
        ? [[sequelize.literal('soldCount'), order.toUpperCase()]]
        : [[sort, order.toUpperCase()]],
      offset,
      limit
    });
      console.log('Products API:', {
        count: rows.length,
        where,
        sort,
        order,
        page,
        limit
      });
      res.setHeader('X-Total-Count', String(count));
      res.setHeader('X-Page', String(page));
      res.setHeader('X-Limit', String(limit));
      res.json(rows);
    } catch (error) {
      console.error('Products fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch products' });
    }
  }
);

router.get('/:id', 
  async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }
      const item = await Product.findByPk(req.params.id, { 
        attributes: {
          include: [
            [
              sequelize.literal(
                '(SELECT COALESCE(SUM(`order_items`.`quantity`),0) FROM `order_items` WHERE `order_items`.`product_id` = `product`.`id`)'
              ),
              'soldCount'
            ]
          ]
        },
        include: [Category, ProductImage]
      });
      if (!item) return res.status(404).json({ message: 'Product not found' });
      res.json(item);
    } catch (error) {
      console.error('Product fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch product' });
    }
  }
);

export default router;


