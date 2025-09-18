# Chick'N Needs - Hostinger VPS Deployment Guide

## 🚀 Complete Step-by-Step Deployment Instructions

This guide will help you deploy your Chick'N Needs website to Hostinger VPS with domain `chicknneeds.shop` and IP `168.231.119.100`.

---

## 📋 Prerequisites

- Hostinger VPS access (IP: 168.231.119.100)
- Domain: chicknneeds.shop
- SSH access to your VPS
- Your local development environment ready

---

## 🔧 Step 1: Connect to Your VPS

### Connect via SSH:
```bash
ssh root@168.231.119.100
```

### Or if you have a specific user:
```bash
ssh your_username@168.231.119.100
```

---

## 🛠️ Step 2: Initial VPS Setup

### Update system packages:
```bash
apt update && apt upgrade -y
```

### Install essential packages:
```bash
apt install -y curl wget git nginx apache2 mysql-server nodejs npm certbot python3-certbot-nginx ufw
```

### Install Node.js 22.x (latest LTS):
```bash
curl -fsSL https://deb.nodesource.com/setup_22.18.0 | bash -
apt-get install -y nodejs
```

### Install PM2 globally:
```bash
npm install -g pm2
```

### Verify installations:
```bash
node --version  # Should show v22.x.x
npm --version   # Should show 10.x.x
mysql --version # Should show MySQL version
nginx -v        # Should show Nginx version
apache2 -v      # Should show Apache version
```

---

## 🗄️ Step 3: Database Setup

### Start and enable MySQL:
```bash
systemctl start mysql
systemctl enable mysql
```

### Secure MySQL installation:
```bash
mysql_secure_installation
```
**Follow the prompts:**
- Set root password: `your_secure_root_password`
- Remove anonymous users: `Y`
- Disallow root login remotely: `Y`
- Remove test database: `Y`
- Reload privilege tables: `Y`

### Create database and user:
```bash
mysql -u root -p
```

**Run these SQL commands:**
```sql
CREATE DATABASE chicknneeds CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'chicknneeds_user'@'localhost' IDENTIFIED BY 'your_mysql_password_here';
GRANT ALL PRIVILEGES ON chicknneeds.* TO 'chicknneeds_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 📁 Step 4: Application Setup

### Create application directory:
```bash
mkdir -p /var/www/chicknneeds
mkdir -p /var/www/chicknneeds/uploads
mkdir -p /var/www/chicknneeds/logs
```

### Clone your repository:
```bash
cd /var/www/chicknneeds
git clone https://github.com/ccabucoo/chick-n-needs_v2.git .
git checkout Hostinger
```

### Install dependencies:
```bash
# Install server dependencies
cd /var/www/chicknneeds/server
npm install

# Install client dependencies
cd /var/www/chicknneeds/client
npm install
```

---

## ⚙️ Step 5: Environment Configuration

### Create server environment file:
```bash
cd /var/www/chicknneeds/server
cp env.production .env
```

### Edit the .env file:
```bash
nano .env
```

**Update these values:**
```env
# Server Configuration
PORT=4000
HOST=0.0.0.0
NODE_ENV=production

# Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=chicknneeds
MYSQL_USER=chicknneeds_user
MYSQL_PASSWORD=your_mysql_password_here

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here_change_this_in_production

# Domain Configuration
PUBLIC_APP_URL=https://chicknneeds.shop
FRONTEND_URL=https://chicknneeds.shop

# Email Configuration (Brevo/Sendinblue)
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_EMAIL=noreply@chicknneeds.shop
BREVO_SENDER_NAME=Chick'N Needs

# Security Configuration
SESSION_SECRET=your_session_secret_here
CSRF_SECRET=your_csrf_secret_here
```

### Create client environment file:
```bash
cd /var/www/chicknneeds/client
cp env.production .env
```

**The client .env should contain:**
```env
VITE_API_URL=https://api.chicknneeds.shop
VITE_APP_NAME=Chick'N Needs
VITE_APP_VERSION=2.0.0
VITE_APP_DESCRIPTION=Poultry Supplies E-commerce Platform
VITE_DOMAIN=chicknneeds.shop
VITE_APP_URL=https://chicknneeds.shop
VITE_NODE_ENV=production
```

---

## 🗃️ Step 6: Database Import

### Import database schema:
```bash
mysql -u chicknneeds_user -p chicknneeds < /var/www/chicknneeds/database/schema.sql
```

### Import production data:
```bash
mysql -u chicknneeds_user -p chicknneeds < /var/www/chicknneeds/database/setup-production.sql
```

---

## 🏗️ Step 7: Build Client Application

### Build the React application:
```bash
cd /var/www/chicknneeds/client
npm run build
```

### Copy built files to web directory:
```bash
cp -r /var/www/chicknneeds/client/dist/* /var/www/chicknneeds/client/dist/
```

---

## 🌐 Step 8: Web Server Configuration

You can choose between **Nginx** or **Apache** as your web server. Both configurations are provided below.

### Option A: Nginx Configuration (Recommended)

### Create Nginx configuration for main site:
```bash
nano /etc/nginx/sites-available/chicknneeds.shop
```

**Add this configuration:**
```nginx
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
```

### Create Nginx configuration for API subdomain:
```bash
nano /etc/nginx/sites-available/api.chicknneeds.shop
```

**Add this configuration:**
```nginx
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
```

### Enable sites:
```bash
ln -sf /etc/nginx/sites-available/chicknneeds.shop /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/api.chicknneeds.shop /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
```

### Test Nginx configuration:
```bash
nginx -t
```

### Restart Nginx:
```bash
systemctl restart nginx
systemctl enable nginx
```

### Option B: Apache Configuration

### Enable required Apache modules:
```bash
a2enmod rewrite
a2enmod proxy
a2enmod proxy_http
a2enmod headers
a2enmod ssl
a2enmod deflate
```

### Create Apache virtual host for main site:
```bash
nano /etc/apache2/sites-available/chicknneeds.shop.conf
```

**Add this configuration:**
```apache
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
```

### Create Apache virtual host for API subdomain:
```bash
nano /etc/apache2/sites-available/api.chicknneeds.shop.conf
```

**Add this configuration:**
```apache
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
```

### Enable Apache sites:
```bash
a2ensite chicknneeds.shop.conf
a2ensite api.chicknneeds.shop.conf
a2dissite 000-default.conf
```

### Test Apache configuration:
```bash
apache2ctl configtest
```

### Restart Apache:
```bash
systemctl restart apache2
systemctl enable apache2
```

### Choose Your Web Server

**If using Nginx:**
```bash
systemctl stop apache2
systemctl disable apache2
systemctl start nginx
systemctl enable nginx
```

**If using Apache:**
```bash
systemctl stop nginx
systemctl disable nginx
systemctl start apache2
systemctl enable apache2
```

---

## 🔒 Step 9: SSL Certificate Setup

### Install SSL certificates:

**If using Nginx:**
```bash
certbot --nginx -d chicknneeds.shop -d www.chicknneeds.shop -d api.chicknneeds.shop --non-interactive --agree-tos --email admin@chicknneeds.shop
```

**If using Apache:**
```bash
certbot --apache -d chicknneeds.shop -d www.chicknneeds.shop -d api.chicknneeds.shop --non-interactive --agree-tos --email admin@chicknneeds.shop
```

### Set up automatic renewal:
```bash
crontab -e
```

**Add this line:**
```cron
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🔥 Step 10: Firewall Configuration

### Configure UFW firewall:
```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable
```

---

## 🚀 Step 11: Start Application with PM2

### Create PM2 ecosystem file:
```bash
cd /var/www/chicknneeds
nano ecosystem.config.js
```

**Add this configuration:**
```javascript
module.exports = {
  apps: [{
    name: 'chicknneeds-api',
    script: './server/src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
      HOST: '0.0.0.0'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

### Start the application:
```bash
pm2 start ecosystem.config.js
```

### Save PM2 configuration:
```bash
pm2 save
pm2 startup
```

### Check application status:
```bash
pm2 status
pm2 logs chicknneeds-api
```

---

## 🔧 Step 12: Set Proper Permissions

### Set ownership and permissions:
```bash
chown -R www-data:www-data /var/www/chicknneeds
chmod -R 755 /var/www/chicknneeds
chmod -R 777 /var/www/chicknneeds/uploads
chmod -R 777 /var/www/chicknneeds/logs
```

---

## ✅ Step 13: Final Testing

### Test API health:
```bash
curl https://api.chicknneeds.shop/api/health
```

### Test main website:
```bash
curl https://chicknneeds.shop
```

### Check all services:
```bash
# Choose your web server:
systemctl status nginx    # If using Nginx
# OR
systemctl status apache2  # If using Apache

systemctl status mysql
pm2 status
```

---

## 🎯 Step 14: Domain Configuration (Hostinger Panel)

### In your Hostinger control panel:

1. **Go to DNS Management**
2. **Add these DNS records:**
   ```
   Type: A
   Name: @
   Value: 168.231.119.100
   TTL: 14400

   Type: A
   Name: www
   Value: 168.231.119.100
   TTL: 14400

   Type: A
   Name: api
   Value: 168.231.119.100
   TTL: 14400
   ```

3. **Wait for DNS propagation (5-30 minutes)**

---

## 🔍 Step 15: Verification Commands

### Test your deployment:
```bash
# Test API
curl -I https://api.chicknneeds.shop/api/health

# Test main site
curl -I https://chicknneeds.shop

# Check SSL
openssl s_client -connect chicknneeds.shop:443 -servername chicknneeds.shop

# Check database connection
mysql -u chicknneeds_user -p -e "SELECT COUNT(*) FROM chicknneeds.products;"
```

---

## 🛠️ Maintenance Commands

### Update application:
```bash
cd /var/www/chicknneeds
git pull origin Hostinger
cd server && npm install
cd ../client && npm install && npm run build
pm2 restart chicknneeds-api
```

### View logs:
```bash
pm2 logs chicknneeds-api

# Choose your web server logs:
tail -f /var/log/nginx/access.log    # If using Nginx
tail -f /var/log/nginx/error.log     # If using Nginx
# OR
tail -f /var/log/apache2/access.log  # If using Apache
tail -f /var/log/apache2/error.log   # If using Apache
```

### Restart services:
```bash
pm2 restart chicknneeds-api
systemctl restart mysql

# Choose your web server:
systemctl restart nginx    # If using Nginx
# OR
systemctl restart apache2  # If using Apache
```

---

## 🚨 Troubleshooting

### Common issues and solutions:

1. **API not responding:**
   ```bash
   pm2 status
   pm2 logs chicknneeds-api
   ```

2. **Database connection issues:**
   ```bash
   mysql -u chicknneeds_user -p chicknneeds -e "SHOW TABLES;"
   ```

3. **Web server configuration errors:**
   
   **For Nginx:**
   ```bash
   nginx -t
   systemctl status nginx
   ```
   
   **For Apache:**
   ```bash
   apache2ctl configtest
   systemctl status apache2
   ```

4. **SSL certificate issues:**
   ```bash
   certbot certificates
   certbot renew --dry-run
   ```

5. **Permission issues:**
   ```bash
   chown -R www-data:www-data /var/www/chicknneeds
   chmod -R 755 /var/www/chicknneeds
   ```

---

## 📞 Support

If you encounter any issues:

1. Check the logs: `pm2 logs chicknneeds-api`
2. Verify all services are running: `systemctl status nginx mysql`
3. Test API health: `curl https://api.chicknneeds.shop/api/health`
4. Check database: `mysql -u chicknneeds_user -p chicknneeds`

---

## 🎉 Congratulations!

Your Chick'N Needs website should now be live at:
- **Main Site:** https://chicknneeds.shop
- **API:** https://api.chicknneeds.shop
- **Health Check:** https://api.chicknneeds.shop/api/health

The website is now fully deployed and ready for production use!
