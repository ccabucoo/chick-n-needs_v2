#!/bin/bash

echo "🚀 Setting up Chick'N Needs on Hostinger VPS..."

# Update system packages
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 22.x
echo "📦 Installing Node.js 22.x..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
apt-get install -y nodejs

# Install MySQL Server
echo "📦 Installing MySQL Server..."
apt install mysql-server -y

# Install Nginx
echo "📦 Installing Nginx..."
apt install nginx -y

# Install PM2 for process management
echo "📦 Installing PM2..."
npm install -g pm2

# Install Git
echo "📦 Installing Git..."
apt install git -y

# Install additional tools
echo "📦 Installing additional tools..."
apt install curl wget unzip -y

# Configure MySQL
echo "🔧 Configuring MySQL..."
mysql_secure_installation

# Create database and user
echo "🗄️ Setting up database..."
mysql -u root -p << EOF
CREATE DATABASE chicknneeds;
CREATE USER 'chicknneeds_user'@'localhost' IDENTIFIED BY 'Ch1ckitout@09999';
GRANT ALL PRIVILEGES ON chicknneeds.* TO 'chicknneeds_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
EOF

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /var/www/chicknneeds
cd /var/www/chicknneeds

# Clone repository
echo "📥 Cloning repository..."
git clone https://github.com/ccabucoo/chick-n-needs_v2.git .
git checkout Hostinger

# Import database schema
echo "📊 Importing database schema..."
mysql -u chicknneeds_user -p chicknneeds < database/complete-setup.sql

# Install dependencies
echo "📦 Installing dependencies..."
cd server
npm install

cd ../client
npm install
npm run build

# Create required directories
echo "📁 Creating required directories..."
mkdir -p /var/www/chicknneeds/uploads
mkdir -p /var/www/chicknneeds/images
mkdir -p /var/log/chicknneeds

# Copy images
cp -r /var/www/chicknneeds/client/src/assets/* /var/www/chicknneeds/images/

# Set permissions
chown -R www-data:www-data /var/www/chicknneeds
chmod -R 755 /var/www/chicknneeds

# Configure Nginx
echo "🌐 Configuring Nginx..."
cp /var/www/chicknneeds/nginx.conf /etc/nginx/sites-available/chicknneeds.shop
ln -s /etc/nginx/sites-available/chicknneeds.shop /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx

# Install Certbot for SSL
echo "🔒 Installing SSL certificates..."
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d chicknneeds.shop -d www.chicknneeds.shop -d api.chicknneeds.shop

# Configure PM2
echo "⚙️ Configuring PM2..."
cd /var/www/chicknneeds
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Create log rotation
echo "📝 Setting up log rotation..."
cat > /etc/logrotate.d/chicknneeds << 'EOF'
/var/log/chicknneeds/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Make deployment scripts executable
chmod +x /var/www/chicknneeds/deploy.sh
chmod +x /var/www/chicknneeds/quick-deploy.sh

echo "✅ VPS setup completed successfully!"
echo "🌐 Website: https://chicknneeds.shop"
echo "🔗 API: https://api.chicknneeds.shop"
echo "📊 Health Check: https://api.chicknneeds.shop/api/health"
