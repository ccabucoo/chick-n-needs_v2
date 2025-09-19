#!/bin/bash

echo "🚀 Starting Chick'N Needs deployment..."

# Navigate to project directory
cd /var/www/chicknneeds

echo "📥 Pulling latest changes from GitHub..."
git pull origin Hostinger

echo "📦 Installing server dependencies..."
cd server
npm install --production

echo "📦 Installing client dependencies and building..."
cd ../client
npm install
npm run build

echo "🔄 Restarting PM2 process..."
pm2 restart chicknneeds-api

echo "✅ Deployment completed successfully!"
echo "🌐 Website: https://chicknneeds.shop"
echo "🔗 API: https://api.chicknneeds.shop"