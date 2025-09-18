-- Production Database Setup for Chick'N Needs
-- Run this script to set up the production database

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS chicknneeds CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE chicknneeds;

-- Create production user with limited privileges
CREATE USER IF NOT EXISTS 'chicknneeds_user'@'localhost' IDENTIFIED BY 'your_mysql_password_here';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON chicknneeds.* TO 'chicknneeds_user'@'localhost';
FLUSH PRIVILEGES;

-- Set SQL mode for production
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- Import the main schema
SOURCE schema.sql;

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);

-- Insert default categories for production
INSERT INTO categories (name, description, image_url, created_at, updated_at) VALUES 
('FEEDS AND SUPPLEMENTS', 'High-quality feeds and nutritional supplements for poultry', '/assets/FEEDS_AND_SUPPLEMENTS.png', NOW(), NOW()),
('HEALTH AND MEDICINE', 'Essential health products and medicines for poultry care', '/assets/HEALTH_AND_MEDICINE.png', NOW(), NOW()),
('EQUIPMENT AND SUPPLIES', 'Professional equipment and supplies for poultry farming', '/assets/EQUIPMENT_AND_SUPPLIES.png', NOW(), NOW());

-- Insert sample products for production
INSERT INTO products (name, slug, description, price, stock, attributes, category_id, created_at, updated_at) VALUES 
('Layer Mash', 'layer-mash', 'Premium layer mash for healthy egg production', 1200.00, 50, '{"weight": "50kg", "protein": "16%"}', 1, NOW(), NOW()),
('Broiler Feed', 'broiler-feed', 'High-quality broiler feed for fast growth', 1100.00, 30, '{"weight": "50kg", "protein": "18%"}', 1, NOW(), NOW()),
('Poultry Premix', 'poultry-premix', 'Essential vitamin and mineral premix', 350.00, 25, '{"weight": "1kg", "vitamins": "A, D, E, K"}', 1, NOW(), NOW()),
('Poultry Antibiotic', 'poultry-antibiotic', 'Broad-spectrum antibiotic for poultry', 450.00, 20, '{"volume": "100ml", "active_ingredient": "Amoxicillin"}', 2, NOW(), NOW()),
('Poultry Vaccine', 'poultry-vaccine', 'Essential vaccines for poultry health', 280.00, 15, '{"volume": "50ml", "type": "Live vaccine"}', 2, NOW(), NOW()),
('Poultry Dewormer', 'poultry-dewormer', 'Effective deworming solution for poultry', 320.00, 18, '{"volume": "100ml", "active_ingredient": "Ivermectin"}', 2, NOW(), NOW()),
('Automatic Poultry Drinker', 'automatic-poultry-drinker', 'Automatic drinking system for poultry', 850.00, 10, '{"capacity": "5L", "material": "Plastic"}', 3, NOW(), NOW()),
('Poultry Feeder', 'poultry-feeder', 'Durable feeding system for poultry', 650.00, 12, '{"capacity": "10kg", "material": "Galvanized steel"}', 3, NOW(), NOW()),
('Poultry Netting', 'poultry-netting', 'Protective netting for poultry areas', 180.00, 25, '{"size": "10m x 2m", "material": "Nylon"}', 3, NOW(), NOW());

-- Update product images to use production URLs
UPDATE products SET image_url = '/assets/Layer_Mash.png' WHERE slug = 'layer-mash';
UPDATE products SET image_url = '/assets/Broiler_Feed.png' WHERE slug = 'broiler-feed';
UPDATE products SET image_url = '/assets/Poultry_Premix.png' WHERE slug = 'poultry-premix';
UPDATE products SET image_url = '/assets/Poultry_Antibiotic.png' WHERE slug = 'poultry-antibiotic';
UPDATE products SET image_url = '/assets/Poultry_Vaccine.png' WHERE slug = 'poultry-vaccine';
UPDATE products SET image_url = '/assets/Poultry_Dewormer.png' WHERE slug = 'poultry-dewormer';
UPDATE products SET image_url = '/assets/Automatic_Poultry_Drinker.png' WHERE slug = 'automatic-poultry-drinker';
UPDATE products SET image_url = '/assets/Poultry_Feeder.png' WHERE slug = 'poultry-feeder';
UPDATE products SET image_url = '/assets/Poultry_Netting.png' WHERE slug = 'poultry-netting';

-- Create product images entries
INSERT INTO product_images (product_id, image_url, alt_text, is_primary, created_at, updated_at) VALUES 
(1, '/assets/Layer_Mash.png', 'Layer Mash Product Image', 1, NOW(), NOW()),
(2, '/assets/Broiler_Feed.png', 'Broiler Feed Product Image', 1, NOW(), NOW()),
(3, '/assets/Poultry_Premix.png', 'Poultry Premix Product Image', 1, NOW(), NOW()),
(4, '/assets/Poultry_Antibiotic.png', 'Poultry Antibiotic Product Image', 1, NOW(), NOW()),
(5, '/assets/Poultry_Vaccine.png', 'Poultry Vaccine Product Image', 1, NOW(), NOW()),
(6, '/assets/Poultry_Dewormer.png', 'Poultry Dewormer Product Image', 1, NOW(), NOW()),
(7, '/assets/Automatic_Poultry_Drinker.png', 'Automatic Poultry Drinker Product Image', 1, NOW(), NOW()),
(8, '/assets/Poultry_Feeder.png', 'Poultry Feeder Product Image', 1, NOW(), NOW()),
(9, '/assets/Poultry_Netting.png', 'Poultry Netting Product Image', 1, NOW(), NOW());

-- Optimize tables for production
OPTIMIZE TABLE users, products, categories, orders, cart_items, reviews, addresses, wishlist_items, product_images, notifications;

-- Show completion message
SELECT 'Production database setup completed successfully!' as status;
