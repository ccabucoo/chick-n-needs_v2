# Chick'N Needs - Hostinger VPS Deployment Guide

## Overview
This guide will help you deploy your Chick'N Needs e-commerce website to Hostinger VPS with your domain `chicknneeds.shop` and IP `168.231.119.100`.

## Prerequisites
- Hostinger VPS with Ubuntu 20.04+ or CentOS 8+
- Domain: `chicknneeds.shop` 
- IP: `168.231.119.100`
- Node.js 22.0.18
- MySQL/MariaDB
- Apache or Nginx

## DNS Configuration ✅
Your DNS records are correctly configured:
- A record: `@` → `168.231.119.100`
- A record: `api` → `168.231.119.100`
- CNAME record: `www` → `chicknneeds.shop`

## Step-by-Step Deployment

### 1. Connect to Your VPS
```bash
ssh root@168.231.119.100
```

### 2. Update System and Install Dependencies
```bash
# Update system packages
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git nginx apache2 mysql-server nodejs npm certbot python3-certbot-nginx ufw

# Install Node.js 22.x (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Verify Node.js version
node --version  # Should show v22.0.18

# Install PM2 globally
npm install -g pm2
```

### 3. Setup MySQL Database
```bash
# Start and enable MySQL
systemctl start mysql
systemctl enable mysql

# Secure MySQL installation
mysql_secure_installation

# Create database and user
mysql -u root -p
```

In MySQL console:
```sql
CREATE DATABASE chicknneeds;
CREATE USER 'chicknneeds_user'@'localhost' IDENTIFIED BY 'Ch1ckitout@09999';
GRANT ALL PRIVILEGES ON chicknneeds.* TO 'chicknneeds_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Create Application Directory Structure
```bash
# Create main application directory
mkdir -p /var/www/chicknneeds
mkdir -p /var/www/chicknneeds/uploads
mkdir -p /var/www/chicknneeds/logs
mkdir -p /var/www/chicknneeds/assets

# Set proper permissions
chown -R www-data:www-data /var/www/chicknneeds
chmod -R 755 /var/www/chicknneeds
```

### 5. Upload Your Application Files

#### Option A: Using Git (Recommended)
```bash
cd /var/www/chicknneeds
git clone https://github.com/ccabucoo/chick-n-needs_v2.git .
git checkout Hostinger
```

#### Option B: Using SCP/SFTP
Upload your project files to `/var/www/chicknneeds/` maintaining the directory structure:
- `client/` → `/var/www/chicknneeds/client/`
- `server/` → `/var/www/chicknneeds/server/`
- `database/` → `/var/www/chicknneeds/database/`

### 6. Setup Environment Files
```bash
# Copy production environment files
cp /var/www/chicknneeds/server/env.production /var/www/chicknneeds/server/.env
cp /var/www/chicknneeds/client/env.production /var/www/chicknneeds/client/.env

# Verify environment files
cat /var/www/chicknneeds/server/.env
cat /var/www/chicknneeds/client/.env
```

### 7. Install Dependencies and Build
```bash
# Install server dependencies
cd /var/www/chicknneeds/server
npm install

# Install client dependencies
cd /var/www/chicknneeds/client
npm install

# Build client for production
npm run build
```

### 8. Setup Database
```bash
# Import database schema
mysql -u chicknneeds_user -p chicknneeds < /var/www/chicknneeds/database/schema.sql

# Verify database setup
mysql -u chicknneeds_user -p chicknneeds -e "SHOW TABLES;"
```

### 9. Copy Product Images
```bash
# Copy product images to assets directory
cp /var/www/chicknneeds/client/public/images/*.png /var/www/chicknneeds/assets/
cp /var/www/chicknneeds/client/public/images/*.jpg /var/www/chicknneeds/assets/
cp /var/www/chicknneeds/client/public/images/*.jpeg /var/www/chicknneeds/assets/

# Set proper permissions
chown -R www-data:www-data /var/www/chicknneeds/assets
chmod -R 644 /var/www/chicknneeds/assets/*
```

### 10. Configure Web Server

#### Option A: Nginx (Recommended)
```bash
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

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx
```

#### Option B: Apache
```bash
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

# Restart Apache
systemctl restart apache2
systemctl enable apache2
```

### 11. Setup SSL Certificates
```bash
# Install SSL certificates
certbot --nginx -d chicknneeds.shop -d www.chicknneeds.shop -d api.chicknneeds.shop --non-interactive --agree-tos --email admin@chicknneeds.shop

# Or for Apache
# certbot --apache -d chicknneeds.shop -d www.chicknneeds.shop -d api.chicknneeds.shop --non-interactive --agree-tos --email admin@chicknneeds.shop
```

### 12. Configure Firewall
```bash
# Configure UFW firewall
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# Check firewall status
ufw status
```

### 13. Setup PM2 for API
```bash
# Create PM2 ecosystem file
cat > /var/www/chicknneeds/ecosystem.config.js << 'EOF'
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

# Start the API with PM2
cd /var/www/chicknneeds
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above

# Check PM2 status
pm2 status
pm2 logs chicknneeds-api
```

### 14. Final Verification
```bash
# Check if all services are running
systemctl status nginx
systemctl status mysql
pm2 status

# Test API endpoint
curl http://localhost:4000/api/health

# Test website
curl -I http://chicknneeds.shop
curl -I https://chicknneeds.shop
```

## Testing Your Deployment

### 1. Test Main Website
- Visit: `https://chicknneeds.shop`
- Visit: `https://www.chicknneeds.shop`

### 2. Test API
- Visit: `https://api.chicknneeds.shop/api/health`
- Test API endpoints: `https://api.chicknneeds.shop/api/products`

### 3. Test Full Functionality
- Register a new user
- Verify email (check server logs if email fails)
- Login
- Browse products
- Add items to cart
- Test checkout process

## Troubleshooting

### Common Issues

1. **API not responding**
   ```bash
   pm2 logs chicknneeds-api
   pm2 restart chicknneeds-api
   ```

2. **Database connection issues**
   ```bash
   mysql -u chicknneeds_user -p chicknneeds
   ```

3. **Web server issues**
   ```bash
   # For Nginx
   nginx -t
   systemctl status nginx
   
   # For Apache
   apache2ctl configtest
   systemctl status apache2
   ```

4. **SSL certificate issues**
   ```bash
   certbot certificates
   certbot renew --dry-run
   ```

### Log Files
- API logs: `/var/www/chicknneeds/logs/`
- Nginx logs: `/var/log/nginx/`
- Apache logs: `/var/log/apache2/`
- MySQL logs: `/var/log/mysql/`

## Maintenance Commands

### Update Application
```bash
cd /var/www/chicknneeds
git pull origin Hostinger
cd server && npm install
cd ../client && npm install && npm run build
pm2 restart chicknneeds-api
```

### Backup Database
```bash
mysqldump -u chicknneeds_user -p chicknneeds > /var/www/chicknneeds/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Monitor System
```bash
pm2 monit
htop
df -h
free -h
```

## Security Checklist

- ✅ Firewall configured (UFW)
- ✅ SSL certificates installed
- ✅ Security headers configured
- ✅ Database user with limited privileges
- ✅ PM2 process management
- ✅ Regular backups scheduled

## Support

If you encounter any issues:
1. Check the log files mentioned above
2. Verify all services are running
3. Test each component individually
4. Check DNS propagation (can take up to 48 hours)

Your Chick'N Needs website should now be fully deployed and accessible at `https://chicknneeds.shop`!
