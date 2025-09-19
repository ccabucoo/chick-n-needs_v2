#!/bin/bash

echo "⚡ Quick deployment for Chick'N Needs..."

# Navigate to project directory
cd /var/www/chicknneeds

# Pull latest changes
git pull origin Hostinger

# Build client
cd client
npm run build

# Restart API
pm2 restart chicknneeds-api

echo "✅ Quick deployment completed!"