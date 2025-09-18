#!/bin/bash

# Chick'N Needs VPS Deployment Script
# Run this script on your Hostinger VPS

echo "🚀 Starting Chick'N Needs deployment..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 22.x
echo "📦 Installing Node.js 22.x..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL Server
echo "📦 Installing MySQL Server..."
sudo apt install -y mysql-server

# Install Apache
echo "📦 Installing Apache..."
sudo apt install -y apache2

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/chicknneeds
sudo chown -R $USER:$USER /var/www/chicknneeds

# Navigate to application directory
cd /var/www/chicknneeds

# Clone repository (if not already present)
if [ ! -d "chick-n-needs_v2" ]; then
    echo "📥 Cloning repository..."
    git clone https://github.com/ccabucoo/chick-n-needs_v2.git
fi

cd chick-n-needs_v2

# Switch to Hostinger branch
echo "🌿 Switching to Hostinger branch..."
git checkout Hostinger

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install --production

# Install client dependencies
echo "📦 Installing client dependencies..."
cd ../client
npm install

# Build client for production
echo "🏗️ Building client for production..."
npm run build

# Copy environment files
echo "⚙️ Setting up environment files..."
cp env.production .env
cd ../server
cp env.production .env

echo "✅ Deployment script completed!"
echo "📋 Next steps:"
echo "1. Configure MySQL database"
echo "2. Update .env files with your actual values"
echo "3. Start the application with PM2"
echo "4. Configure Apache virtual host"
