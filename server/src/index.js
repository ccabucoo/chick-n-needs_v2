import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize } from './lib/db.js';
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import categoriesRouter from './routes/categories.js';
import cartRouter from './routes/cart.js';
import ordersRouter from './routes/orders.js';
import reviewsRouter from './routes/reviews.js';
import profileRouter from './routes/profile.js';
import wishlistRouter from './routes/wishlist.js';
import contactRouter from './routes/contact.js';
import notificationsRouter from './routes/notifications.js';
import { 
  securityHeaders, 
  generalRateLimit, 
  authRateLimit, 
  sanitizeInput, 
  errorHandler, 
  requestLogger 
} from './middleware/security.js';

const app = express();

// Ensure critical envs are set
if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET. Set a strong secret in environment.');
  process.exit(1);
}

// CORS must be first so even rate-limit/error responses include CORS headers
app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Ensure responses are not cached (dev-friendly)
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Security middleware
app.use(securityHeaders);
app.use(generalRateLimit);
app.use(requestLogger);
app.use(sanitizeInput);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve local images at /assets
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const imagesDir = path.resolve(__dirname, '../../images');
app.use('/assets', express.static(imagesDir));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Routes with specific rate limiting
app.use('/api/auth', authRateLimit, authRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/contact', contactRouter);
app.use('/api/notifications', notificationsRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    app.listen(PORT, () => console.log(`API running on :${PORT}`));
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();


