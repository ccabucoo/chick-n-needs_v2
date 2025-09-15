import { DataTypes, Op } from 'sequelize';
import { sequelize } from '../lib/db.js';

export const User = sequelize.define('user', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  email: { type: DataTypes.STRING(191), allowNull: false, unique: true },
  username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  firstName: { type: DataTypes.STRING(100), allowNull: false },
  lastName: { type: DataTypes.STRING(100), allowNull: false },
  fullName: { type: DataTypes.STRING(201), allowNull: true },
  emailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  passwordHash: { type: DataTypes.STRING(191), allowNull: false },
  passwordHistory: { type: DataTypes.TEXT, allowNull: true }, // JSON string of last 3 password hashes
  phone: { type: DataTypes.STRING(50) },
  failedLoginAttempts: { type: DataTypes.INTEGER, defaultValue: 0 },
  lockedUntil: { type: DataTypes.DATE, allowNull: true }
});

// Keep fullName in sync
User.beforeCreate((user) => {
  if (user.firstName || user.lastName) {
    const parts = [user.firstName || '', user.lastName || ''].filter(Boolean);
    user.fullName = parts.join(' ');
  }
});
User.beforeUpdate((user) => {
  if (user.changed('firstName') || user.changed('lastName')) {
    const parts = [user.firstName || '', user.lastName || ''].filter(Boolean);
    user.fullName = parts.join(' ');
  }
});

export const EmailToken = sequelize.define('email_token', {
  token: { type: DataTypes.STRING(191), allowNull: false },
  purpose: { type: DataTypes.STRING(50), allowNull: false }
});

EmailToken.belongsTo(User);
User.hasMany(EmailToken);

export const Address = sequelize.define('address', {
  line1: { type: DataTypes.STRING(191), allowNull: false },
  line2: { type: DataTypes.STRING(191) },
  barangay: { type: DataTypes.STRING(100) },
  city: { type: DataTypes.STRING(100), allowNull: false },
  state: { type: DataTypes.STRING(100) },
  postalCode: { type: DataTypes.STRING(20) },
  country: { type: DataTypes.STRING(100), defaultValue: 'Philippines' },
  phone: { type: DataTypes.STRING(30) }
});
Address.belongsTo(User);
User.hasMany(Address);

export const Category = sequelize.define('category', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT },
  imageUrl: { type: DataTypes.STRING(255) }
});

export const Product = sequelize.define('product', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(191), allowNull: false },
  slug: { type: DataTypes.STRING(191), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT },
  price: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  stock: { type: DataTypes.INTEGER, defaultValue: 0 },
  attributes: { type: DataTypes.JSON }
});
Product.belongsTo(Category);
Category.hasMany(Product);

export const ProductImage = sequelize.define('product_image', {
  url: { type: DataTypes.STRING(255), allowNull: false }
});
ProductImage.belongsTo(Product);
Product.hasMany(ProductImage);

export const Wishlist = sequelize.define('wishlist', {});
Wishlist.belongsTo(User);
Wishlist.belongsTo(Product);
User.hasMany(Wishlist);
Product.hasMany(Wishlist);

export const Review = sequelize.define('review', {
  rating: { type: DataTypes.INTEGER, allowNull: false },
  comment: { type: DataTypes.TEXT }
});
Review.belongsTo(User);
Review.belongsTo(Product);
User.hasMany(Review);
Product.hasMany(Review);

export const ContactMessage = sequelize.define('contact_message', {
  name: { type: DataTypes.STRING(191), allowNull: false },
  email: { type: DataTypes.STRING(191), allowNull: false },
  subject: { type: DataTypes.STRING(191) },
  orderNo: { type: DataTypes.STRING(100) },
  message: { type: DataTypes.TEXT, allowNull: false }
});

export const CartItem = sequelize.define('cart_item', {
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 }
});
CartItem.belongsTo(User);
CartItem.belongsTo(Product);
User.hasMany(CartItem);
Product.hasMany(CartItem);

export const Order = sequelize.define('order', {
  status: { type: DataTypes.STRING(50), defaultValue: 'pending' },
  subtotal: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  shippingFee: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  paymentMethod: { type: DataTypes.STRING(50), defaultValue: 'cod' },
  transactionNumber: { type: DataTypes.STRING(100), unique: true, allowNull: true },
  orderTime: { type: DataTypes.DATE, allowNull: true }
});
Order.belongsTo(User);
Order.belongsTo(Address, { as: 'shippingAddress' });
User.hasMany(Order);

export const OrderItem = sequelize.define('order_item', {
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  price: { type: DataTypes.DECIMAL(10,2), allowNull: false }
});
OrderItem.belongsTo(Order);
OrderItem.belongsTo(Product);
Order.hasMany(OrderItem);
Product.hasMany(OrderItem);

export { Op };


