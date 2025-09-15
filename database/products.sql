-- Broiler Feed Product
INSERT INTO `products` (`name`, `slug`, `description`, `price`, `stock`, `category_id`) VALUES
('Broiler Feed', 'broiler-feed', 'High-quality broiler feed for optimal growth and meat production', 1350.00, 40, 1);

-- Broiler Feed Image
INSERT INTO `product_images` (`url`, `product_id`) VALUES
('http://localhost:4000/assets/Broiler Feed.png', LAST_INSERT_ID());
