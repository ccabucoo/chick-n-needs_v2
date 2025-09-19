# Chick'N Needs - Hostinger VPS Deployment Guide

## 🎯 Overview
This guide will help you deploy your Chick'N Needs e-commerce website to Hostinger VPS with the following specifications:
- **Domain**: chicknneeds.shop
- **IP Address**: 168.231.119.100
- **Node.js Version**: 22.0.18
- **Database**: MySQL
- **Web Server**: Apache/Nginx

## 📋 Prerequisites
- Hostinger VPS access
- SSH client (PuTTY, Terminal, etc.)
- Domain pointed to your VPS IP
- Basic Linux command line knowledge

## 🚀 Step-by-Step Deployment

### Step 1: Connect to Your VPS
```bash
ssh root@168.231.119.100
# or if you have a different username:
ssh your_username@168.231.119.100
```

### Step 2: Update System and Install Dependencies
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL Server
sudo apt install mysql-server -y

# Install Nginx
sudo apt install nginx -y

# Install PM2 globally
sudo npm install -g pm2

# Install Git
sudo apt install git -y

# Install build tools
sudo apt install build-essential -y
```

### Step 3: Configure MySQL Database
```bash
# Secure MySQL installation
sudo mysql_secure_installation

# Login to MySQL
sudo mysql -u root -p

# Create database and user
CREATE DATABASE chicknneeds;
CREATE USER 'chicknneeds_user'@'localhost' IDENTIFIED BY 'Ch1ckitout@0999';
GRANT ALL PRIVILEGES ON chicknneeds.* TO 'chicknneeds_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 4: Create Project Directory Structure
```bash
# Create main project directory
sudo mkdir -p /var/www/chicknneeds.shop
sudo chown -R $USER:$USER /var/www/chicknneeds.shop

# Create subdirectories
mkdir -p /var/www/chicknneeds.shop/server
mkdir -p /var/www/chicknneeds.shop/public_html
mkdir -p /var/www/chicknneeds.shop/server/images
```

### Step 5: Clone and Setup Repository
```bash
# Navigate to project directory
cd /var/www/chicknneeds.shop

# Clone your repository (replace with your actual repo URL)
git clone https://github.com/ccabucoo/chick-n-needs_v2.git .

# Switch to Hostinger branch
git checkout Hostinger

# Or if you're uploading files manually, create the structure:
# Upload your project files to the appropriate directories
```

### Step 6: Setup Backend (Server)
```bash
# Navigate to server directory
cd /var/www/chicknneeds.shop/server

# Install dependencies
npm install

# Copy environment file
cp env.production .env

# Edit environment variables (IMPORTANT!)
nano .env
```

**Update the .env file with your actual values:**
```env
# Production Environment Configuration for Hostinger VPS
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=chicknneeds
MYSQL_USER=chicknneeds_user
MYSQL_PASSWORD=Ch1ckitout@0999

PORT=4000
NODE_ENV=production
HOST=0.0.0.0

# IMPORTANT: Generate a strong JWT secret
JWT_SECRET=your_very_strong_jwt_secret_key_here_change_this_in_production

FRONTEND_URL=https://chicknneeds.shop
PUBLIC_APP_URL=https://chicknneeds.shop

# Update with your actual Brevo API key
BREVO_API_KEY=your_brevo_api_key_here
FROM_EMAIL=noreply@chicknneeds.shop

BCRYPT_ROUNDS=12
SESSION_SECRET=your_session_secret_here

MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/www/chicknneeds.shop/uploads
```

### Step 7: Setup Database
```bash
# Import database schema
mysql -u chicknneeds_user -p chicknneeds < /var/www/chicknneeds.shop/database/schema.sql

# Verify database setup
mysql -u chicknneeds_user -p chicknneeds -e "SHOW TABLES;"
```

### Step 8: Setup Frontend (Client)
```bash
# Navigate to client directory
cd /var/www/chicknneeds.shop/client

# Install dependencies
npm install

# Copy environment file
cp env.production .env

# Build for production
npm run build

# Copy built files to public_html
cp -r dist/* /var/www/chicknneeds.shop/public_html/
```

### Step 9: Copy Product Images
```bash
# Copy product images to server images directory
cp -r /var/www/chicknneeds.shop/client/public/images/* /var/www/chicknneeds.shop/server/images/
```

### Step 10: Configure Nginx
```bash
# Copy nginx configuration
sudo cp /var/www/chicknneeds.shop/nginx.conf /etc/nginx/sites-available/chicknneeds.shop

# Create symbolic link
sudo ln -s /etc/nginx/sites-available/chicknneeds.shop /etc/nginx/sites-enabled/

# Remove default nginx site
sudo rm /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Step 11: Setup PM2 for Process Management
```bash
# Navigate to server directory
cd /var/www/chicknneeds.shop/server

# Start application with PM2
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

### Step 12: Configure SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d chicknneeds.shop -d www.chicknneeds.shop

# Test automatic renewal
sudo certbot renew --dry-run
```

### Step 13: Configure Firewall
```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Allow Node.js port (if needed for direct access)
sudo ufw allow 4000

# Check firewall status
sudo ufw status
```

### Step 14: Test Your Deployment
```bash
# Test API health endpoint
curl http://localhost:4000/api/health

# Test website
curl -I https://chicknneeds.shop

# Check PM2 logs
pm2 logs chicknneeds-api --lines 50
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. API Not Responding
```bash
# Check PM2 status
pm2 status

# Restart application
pm2 restart chicknneeds-api

# Check logs
pm2 logs chicknneeds-api
```

#### 2. Database Connection Issues
```bash
# Test database connection
mysql -u chicknneeds_user -p chicknneeds -e "SELECT 1;"

# Check MySQL service
sudo systemctl status mysql
```

#### 3. Nginx Issues
```bash
# Test nginx configuration
sudo nginx -t

# Check nginx status
sudo systemctl status nginx

# View nginx error logs
sudo tail -f /var/log/nginx/error.log
```

#### 4. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew
```

## 📁 File Structure After Deployment
```
/var/www/chicknneeds.shop/
├── server/                 # Node.js backend
│   ├── src/               # Source code
│   ├── node_modules/      # Dependencies
│   ├── .env              # Environment variables
│   ├── ecosystem.config.js # PM2 configuration
│   └── images/           # Product images
├── public_html/          # Frontend build files
│   ├── index.html
│   ├── assets/
│   └── images/
├── database/             # Database schema
└── nginx.conf           # Nginx configuration
```

## 🔄 Updating Your Application

### To update your application:
```bash
# Navigate to project directory
cd /var/www/chicknneeds.shop

# Pull latest changes
git pull origin Hostinger

# Update server dependencies
cd server
npm install

# Restart PM2 process
pm2 restart chicknneeds-api

# Update frontend
cd ../client
npm install
npm run build
cp -r dist/* ../public_html/
```

## 📊 Monitoring and Maintenance

### Daily Commands:
```bash
# Check application status
pm2 status

# Check system resources
htop

# Check disk space
df -h

# Check nginx logs
sudo tail -f /var/log/nginx/access.log
```

### Weekly Commands:
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Check SSL certificate expiry
sudo certbot certificates

# Backup database
mysqldump -u chicknneeds_user -p chicknneeds > backup_$(date +%Y%m%d).sql
```

## 🚨 Security Checklist

- [ ] Change default MySQL root password
- [ ] Use strong JWT secret
- [ ] Configure firewall properly
- [ ] Enable SSL/HTTPS
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Backup database regularly

## 📞 Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs chicknneeds-api`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check system logs: `sudo journalctl -u nginx`
4. Verify environment variables are set correctly
5. Ensure all services are running: `sudo systemctl status nginx mysql`

## 🎉 Success!

Once everything is set up, your website should be accessible at:
- **Main Site**: https://chicknneeds.shop
- **API Health**: https://chicknneeds.shop/api/health

Your Chick'N Needs e-commerce website is now live on Hostinger VPS! 🐔🛒