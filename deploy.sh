#!/bin/bash

# Chick'N Needs Deployment Script for Hostinger VPS
# This script automates the deployment process

set -e  # Exit on any error

echo "🚀 Starting Chick'N Needs Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="chicknneeds.shop"
API_DOMAIN="api.chicknneeds.shop"
VPS_IP="168.231.119.100"
APP_DIR="/var/www/chicknneeds"
NGINX_DIR="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"

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

print_status "Updating system packages..."
apt update && apt upgrade -y

print_status "Installing required packages..."
apt install -y curl wget git nginx mysql-server nodejs npm certbot python3-certbot-nginx

print_status "Installing Node.js 22.x..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

print_status "Installing PM2 globally..."
npm install -g pm2

print_status "Creating application directory..."
mkdir -p $APP_DIR
mkdir -p $APP_DIR/uploads
mkdir -p $APP_DIR/logs

print_status "Setting up MySQL..."
systemctl start mysql
systemctl enable mysql

# Create MySQL database and user
mysql -e "CREATE DATABASE IF NOT EXISTS chicknneeds;"
mysql -e "CREATE USER IF NOT EXISTS 'chicknneeds_user'@'localhost' IDENTIFIED BY 'your_mysql_password_here';"
mysql -e "GRANT ALL PRIVILEGES ON chicknneeds.* TO 'chicknneeds_user'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

print_status "Setting up Nginx configuration..."

# Create Nginx configuration for main site
cat > $NGINX_DIR/chicknneeds.shop << EOF
server {
    listen 80;
    server_name chicknneeds.shop www.chicknneeds.shop;
    
    root $APP_DIR/client/dist;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Handle client-side routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Create Nginx configuration for API subdomain
cat > $NGINX_DIR/api.chicknneeds.shop << EOF
server {
    listen 80;
    server_name api.chicknneeds.shop;
    
    # API proxy
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable sites
ln -sf $NGINX_DIR/chicknneeds.shop $NGINX_ENABLED/
ln -sf $NGINX_DIR/api.chicknneeds.shop $NGINX_ENABLED/

# Remove default site
rm -f $NGINX_ENABLED/default

print_status "Testing Nginx configuration..."
nginx -t

print_status "Restarting Nginx..."
systemctl restart nginx
systemctl enable nginx

print_status "Setting up SSL certificates..."
certbot --nginx -d chicknneeds.shop -d www.chicknneeds.shop -d api.chicknneeds.shop --non-interactive --agree-tos --email admin@chicknneeds.shop

print_status "Setting up firewall..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

print_status "Creating PM2 ecosystem file..."
cat > $APP_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'chicknneeds-api',
    script: './server/src/index.js',
    cwd: '$APP_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: '$APP_DIR/logs/err.log',
    out_file: '$APP_DIR/logs/out.log',
    log_file: '$APP_DIR/logs/combined.log',
    time: true
  }]
};
EOF

print_status "Setting proper permissions..."
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR

print_status "✅ Deployment setup completed!"
print_warning "Next steps:"
echo "1. Upload your application files to $APP_DIR"
echo "2. Copy env.production files to .env files"
echo "3. Run 'npm install' in both client and server directories"
echo "4. Build the client: 'npm run build'"
echo "5. Import database schema: 'mysql chicknneeds < database/schema.sql'"
echo "6. Start the API: 'pm2 start ecosystem.config.js'"
echo "7. Save PM2 configuration: 'pm2 save' and 'pm2 startup'"

print_status "🎉 Hostinger VPS is ready for your Chick'N Needs application!"
