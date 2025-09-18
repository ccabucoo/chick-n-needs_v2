#!/bin/bash

# Quick Deployment Script for Hostinger VPS
# Run this script on your VPS after uploading files

echo "🚀 Starting Chick'N Needs deployment..."

# Set variables
DOMAIN="chickenneeds.shop"
WEB_ROOT="/var/www/chickenneeds.shop"
SERVICE_USER="www-data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

print_status "Setting up file permissions..."
chown -R $SERVICE_USER:$SERVICE_USER $WEB_ROOT/client/dist
chown -R root:root $WEB_ROOT/server
chmod -R 755 $WEB_ROOT/client/dist
chmod -R 700 $WEB_ROOT/server

print_status "Installing server dependencies..."
cd $WEB_ROOT/server
npm install --production

print_status "Setting up PM2 process manager..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

print_status "Enabling Apache modules..."
a2enmod rewrite ssl headers proxy proxy_http
systemctl restart apache2

print_status "Enabling Apache site..."
a2ensite chickenneeds.shop.conf
a2dissite 000-default
systemctl reload apache2

print_status "Configuring firewall..."
ufw allow ssh
ufw allow 'Apache Full'
ufw allow 4000
ufw --force enable

print_status "Testing services..."

# Test Apache
if systemctl is-active --quiet apache2; then
    print_status "✅ Apache is running"
else
    print_error "❌ Apache is not running"
fi

# Test MySQL
if systemctl is-active --quiet mysql; then
    print_status "✅ MySQL is running"
else
    print_error "❌ MySQL is not running"
fi

# Test PM2
if pm2 list | grep -q "chicknneeds-api"; then
    print_status "✅ PM2 process is running"
else
    print_error "❌ PM2 process is not running"
fi

print_status "Creating backup directory..."
mkdir -p /root/backups

print_status "Setting up log rotation..."
cat > /etc/logrotate.d/chicknneeds << EOF
/var/log/pm2/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

print_status "🎉 Deployment completed!"
print_warning "Don't forget to:"
print_warning "1. Update your .env file with actual database credentials"
print_warning "2. Import your database schema"
print_warning "3. Set up SSL certificate with: certbot --apache -d $DOMAIN"
print_warning "4. Test your website at https://$DOMAIN"

echo ""
print_status "Useful commands:"
echo "  pm2 status          - Check PM2 processes"
echo "  pm2 logs            - View application logs"
echo "  systemctl status apache2 - Check Apache status"
echo "  systemctl status mysql - Check MySQL status"
echo "  tail -f /var/log/apache2/chickenneeds.shop_error.log - View Apache errors"
