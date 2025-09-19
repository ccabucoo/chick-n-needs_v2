-- Reset Database for Production Setup
-- This script safely resets the database without duplicate column errors

USE `chicknneeds`;

-- Drop all tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS `wishlists`;
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `product_images`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `cart_items`;
DROP TABLE IF EXISTS `addresses`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `email_tokens`;
DROP TABLE IF EXISTS `contact_messages`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `users`;

-- Now run the original schema.sql
SOURCE /var/www/chicknneeds/database/schema.sql;
