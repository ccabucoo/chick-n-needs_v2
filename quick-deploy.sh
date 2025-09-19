#!/bin/bash

# Quick Deployment Script for Chick'N Needs on Hostinger VPS
# Run this script on your VPS after uploading your files

set -e  # Exit on any error

echo "🚀 Starting Chick'N Needs Quick Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="chicknneeds.shop"
API_DOMAIN="api.chicknneeds.shop"
APP_DIR="/var/www/chicknneeds"

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

print_status "Setting up application directory..."
mkdir -p $APP_DIR/uploads
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/assets

print_status "Setting up environment files..."
if [ -f "$APP_DIR/server/env.production" ]; then
    cp $APP_DIR/server/env.production $APP_DIR/server/.env
    print_status "Server environment file created"
else
    print_error "Server env.production file not found!"
    exit 1
fi

if [ -f "$APP_DIR/client/env.production" ]; then
    cp $APP_DIR/client/env.production $APP_DIR/client/.env
    print_status "Client environment file created"
else
    print_error "Client env.production file not found!"
    exit 1
fi

print_status "Installing dependencies..."
cd $APP_DIR/server
npm install

cd $APP_DIR/client
npm install

print_status "Building client for production..."
npm run build

print_status "Setting up database..."
if [ -f "$APP_DIR/database/schema.sql" ]; then
    mysql -u chicknneeds_user -p chicknneeds < $APP_DIR/database/schema.sql
    print_status "Database schema imported"
else
    print_error "Database schema file not found!"
    exit 1
fi

print_status "Copying product images..."
if [ -d "$APP_DIR/client/public/images" ]; then
    cp $APP_DIR/client/public/images/*.png $APP_DIR/assets/ 2>/dev/null || true
    cp $APP_DIR/client/public/images/*.jpg $APP_DIR/assets/ 2>/dev/null || true
    cp $APP_DIR/client/public/images/*.jpeg $APP_DIR/assets/ 2>/dev/null || true
    print_status "Product images copied"
fi

print_status "Setting proper permissions..."
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR
chmod -R 644 $APP_DIR/assets/* 2>/dev/null || true

print_status "Setting up PM2..."
cat > $APP_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'chicknneeds-api',
    script: './server/src/index.js',
    cwd: '/var/www/chicknneeds',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
      HOST: '0.0.0.0'
    },
    error_file: '/var/www/chicknneeds/logs/err.log',
    out_file: '/var/www/chicknneeds/logs/out.log',
    log_file: '/var/www/chicknneeds/logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

print_status "Starting API with PM2..."
cd $APP_DIR
pm2 start ecosystem.config.js
pm2 save

print_status "Setting up web server configuration..."

# Ask user to choose web server
echo "Choose your web server:"
echo "1) Nginx (Recommended)"
echo "2) Apache"
read -p "Enter your choice (1 or 2): " webserver_choice

if [ "$webserver_choice" = "2" ]; then
    print_status "Setting up Apache configuration..."
    
    # Enable required Apache modules
    a2enmod rewrite
    a2enmod proxy
    a2enmod proxy_http
    a2enmod headers
    a2enmod ssl
    a2enmod deflate
    
    # Create Apache virtual host for main site
    cat > /etc/apache2/sites-available/chicknneeds.shop.conf << 'EOF'
<VirtualHost *:80>
    ServerName chicknneeds.shop
    ServerAlias www.chicknneeds.shop
    DocumentRoot /var/www/chicknneeds/client/dist
    
    # Enable compression
    LoadModule deflate_module modules/mod_deflate.so
    <Location />
        SetOutputFilter DEFLATE
        SetEnvIfNoCase Request_URI \
            \.(?:gif|jpe?g|png)$ no-gzip dont-vary
        SetEnvIfNoCase Request_URI \
            \.(?:exe|t?gz|zip|bz2|sit|rar)$ no-gzip dont-vary
    </Location>
    
    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "no-referrer-when-downgrade"
    
    # Handle client-side routing
    <Directory /var/www/chicknneeds/client/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # Fallback to index.html for client-side routing
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # Cache static assets
    <LocationMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg)$">
        ExpiresActive On
        ExpiresDefault "access plus 1 year"
        Header append Cache-Control "public, immutable"
    </LocationMatch>
    
    # API proxy
    ProxyPreserveHost On
    ProxyPass /api/ http://localhost:4000/api/
    ProxyPassReverse /api/ http://localhost:4000/api/
    
    # Logging
    ErrorLog ${APACHE_LOG_DIR}/chicknneeds_error.log
    CustomLog ${APACHE_LOG_DIR}/chicknneeds_access.log combined
</VirtualHost>
EOF

    # Create Apache virtual host for API subdomain
    cat > /etc/apache2/sites-available/api.chicknneeds.shop.conf << 'EOF'
<VirtualHost *:80>
    ServerName api.chicknneeds.shop
    DocumentRoot /var/www/chicknneeds
    
    # API proxy
    ProxyPreserveHost On
    ProxyPass / http://localhost:4000/
    ProxyPassReverse / http://localhost:4000/
    
    # Logging
    ErrorLog ${APACHE_LOG_DIR}/api_chicknneeds_error.log
    CustomLog ${APACHE_LOG_DIR}/api_chicknneeds_access.log combined
</VirtualHost>
EOF

    # Enable Apache sites
    a2ensite chicknneeds.shop.conf
    a2ensite api.chicknneeds.shop.conf
    a2dissite 000-default.conf
    
    # Test Apache configuration
    apache2ctl configtest
    
    # Stop Nginx and start Apache
    systemctl stop nginx 2>/dev/null || true
    systemctl disable nginx 2>/dev/null || true
    systemctl restart apache2
    systemctl enable apache2
    
    print_status "Apache configuration completed!"
    
else
    print_status "Setting up Nginx configuration..."

    # Create Nginx configuration for main site
    cat > /etc/nginx/sites-available/chicknneeds.shop << 'EOF'
server {
    listen 80;
    server_name chicknneeds.shop www.chicknneeds.shop;
    
    root /var/www/chicknneeds/client/dist;
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
        try_files $uri $uri/ /index.html;
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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

    # Create Nginx configuration for API subdomain
    cat > /etc/nginx/sites-available/api.chicknneeds.shop << 'EOF'
server {
    listen 80;
    server_name api.chicknneeds.shop;
    
    # API proxy
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

    # Enable sites
    ln -sf /etc/nginx/sites-available/chicknneeds.shop /etc/nginx/sites-enabled/
    ln -sf /etc/nginx/sites-available/api.chicknneeds.shop /etc/nginx/sites-enabled/

    # Remove default site
    rm -f /etc/nginx/sites-enabled/default

    print_status "Testing Nginx configuration..."
    nginx -t

    print_status "Restarting Nginx..."
    systemctl restart nginx
    systemctl enable nginx
    
    # Stop Apache if it's running
    systemctl stop apache2 2>/dev/null || true
    systemctl disable apache2 2>/dev/null || true
    
    print_status "Nginx configuration completed!"
fi

print_status "Setting up SSL certificates..."
if [ "$webserver_choice" = "2" ]; then
    certbot --apache -d chicknneeds.shop -d www.chicknneeds.shop -d api.chicknneeds.shop --non-interactive --agree-tos --email admin@chicknneeds.shop
else
    certbot --nginx -d chicknneeds.shop -d www.chicknneeds.shop -d api.chicknneeds.shop --non-interactive --agree-tos --email admin@chicknneeds.shop
fi

print_status "Setting up firewall..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

print_status "✅ Quick deployment completed!"
print_warning "Next steps:"
echo "1. Test your website: https://chicknneeds.shop"
echo "2. Test your API: https://api.chicknneeds.shop/api/health"
echo "3. Check PM2 status: pm2 status"
echo "4. View logs: pm2 logs chicknneeds-api"

print_status "🎉 Your Chick'N Needs website is now deployed!"
