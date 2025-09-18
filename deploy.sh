#!/bin/bash

# Chick'N Needs VPS Deployment Script
# Run this script on your VPS to deploy the application

echo "🚀 Starting Chick'N Needs VPS Deployment..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 22.x
echo "📦 Installing Node.js 22.x..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL Server
echo "📦 Installing MySQL Server..."
sudo apt-get install -y mysql-server

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt-get install -y nginx

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/chicknneeds
sudo chown -R $USER:$USER /var/www/chicknneeds

# Create MySQL database
echo "🗄️ Setting up MySQL database..."
sudo mysql -e "CREATE DATABASE IF NOT EXISTS chicknneeds;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'chicknneeds'@'localhost' IDENTIFIED BY 'your_secure_password';"
sudo mysql -e "GRANT ALL PRIVILEGES ON chicknneeds.* TO 'chicknneeds'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# Import database schema
echo "🗄️ Importing database schema..."
sudo mysql -u chicknneeds -p chicknneeds < database/schema.sql

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install --production

# Install client dependencies and build
echo "📦 Installing client dependencies and building..."
cd ../client
npm install
npm run build

# Copy built files to web root
echo "📁 Copying built files to web root..."
sudo cp -r dist/* /var/www/chicknneeds/

# Setup PM2 ecosystem
echo "⚙️ Setting up PM2 ecosystem..."
cd ../server
pm2 start ecosystem.config.js

# Setup Nginx configuration
echo "⚙️ Setting up Nginx configuration..."
sudo cp ../nginx.conf /etc/nginx/sites-available/chicknneeds
sudo ln -sf /etc/nginx/sites-available/chicknneeds /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "🔍 Testing Nginx configuration..."
sudo nginx -t

# Restart services
echo "🔄 Restarting services..."
sudo systemctl restart nginx
sudo systemctl enable nginx
sudo systemctl restart mysql
sudo systemctl enable mysql

# Setup SSL with Let's Encrypt (optional)
echo "🔒 Setting up SSL with Let's Encrypt..."
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d chicknneeds.shop

echo "✅ Deployment completed successfully!"
echo "🌐 Your website should be available at: https://chicknneeds.shop"
echo "🔧 API endpoint: https://chicknneeds.shop/api"
echo "📊 Monitor your app with: pm2 monit"
