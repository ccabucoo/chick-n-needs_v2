# Chick'N Needs VPS Deployment Guide for Hostinger

## Overview
This guide will help you deploy your Chick'N Needs e-commerce website to your Hostinger VPS with domain `chicknneeds.shop` and IP `168.231.119.100`.

## Prerequisites
- Hostinger VPS access (SSH)
- Domain `chicknneeds.shop` pointing to your VPS IP `168.231.119.100`
- Your existing API keys (Brevo/Sendinblue)

## Step 1: Connect to Your VPS

### Using SSH (Windows PowerShell or Command Prompt)
```bash
ssh root@168.231.119.100
# or if you have a specific username:
ssh your_username@168.231.119.100
```

### Using Hostinger hPanel
1. Go to your Hostinger hPanel
2. Navigate to VPS section
3. Click "SSH Access" or "Terminal"

## Step 2: Update System and Install Dependencies

Run these commands on your VPS:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
node --version  # Should show v22.x.x
npm --version

# Install MySQL Server
sudo apt-get install -y mysql-server

# Install Nginx
sudo apt-get install -y nginx

# Install PM2 for process management
sudo npm install -g pm2

# Install Git (if not already installed)
sudo apt-get install -y git
```

## Step 3: Clone Your Repository

```bash
# Create application directory
sudo mkdir -p /var/www/chicknneeds
sudo chown -R $USER:$USER /var/www/chicknneeds
cd /var/www/chicknneeds

# Clone your repository
git clone https://github.com/ccabucoo/chick-n-needs_v2.git .

# Switch to Hostinger branch (if you've created it)
git checkout Hostinger
```

## Step 4: Setup MySQL Database

```bash
# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
```

In MySQL prompt, run:
```sql
CREATE DATABASE chicknneeds;
CREATE USER 'chicknneeds'@'localhost' IDENTIFIED BY 'your_secure_password_here';
GRANT ALL PRIVILEGES ON chicknneeds.* TO 'chicknneeds'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

```bash
# Import database schema
sudo mysql -u chicknneeds -p chicknneeds < database/schema.sql
```

## Step 5: Configure Environment Variables

### Server Environment
```bash
cd /var/www/chicknneeds/server
cp env.production .env
nano .env
```

Update the `.env` file with your actual values:
```env
# Server Configuration
PORT=4000
HOST=0.0.0.0
NODE_ENV=production

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=chicknneeds
MYSQL_PASSWORD=your_secure_password_here
MYSQL_DATABASE=chicknneeds

# Application URLs
PUBLIC_APP_URL=https://chicknneeds.shop
FRONTEND_URL=https://chicknneeds.shop

# Email Configuration (Keep your existing API key)
BREVO_API_KEY=your-existing-brevo-api-key

# Security
CSRF_SECRET=your-csrf-secret-key-change-this

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

### Client Environment
```bash
cd /var/www/chicknneeds/client
cp env.production .env
nano .env
```

Update the `.env` file:
```env
# Client Environment Variables
VITE_API_URL=https://chicknneeds.shop/api
VITE_PUBLIC_URL=https://chicknneeds.shop
```

## Step 6: Install Dependencies and Build

### Server Dependencies
```bash
cd /var/www/chicknneeds/server
npm install --production
```

### Client Dependencies and Build
```bash
cd /var/www/chicknneeds/client
npm install
npm run build
```

## Step 7: Setup Nginx Configuration

```bash
# Copy Nginx configuration
sudo cp /var/www/chicknneeds/nginx.conf /etc/nginx/sites-available/chicknneeds

# Enable the site
sudo ln -sf /etc/nginx/sites-available/chicknneeds /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Step 8: Setup PM2 Process Manager

```bash
cd /var/www/chicknneeds/server

# Create PM2 log directory
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# Start the application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
```

## Step 9: Setup SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d chicknneeds.shop -d www.chicknneeds.shop

# Test automatic renewal
sudo certbot renew --dry-run
```

## Step 10: Configure Firewall

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Allow MySQL (if needed from external)
sudo ufw allow 3306

# Check status
sudo ufw status
```

## Step 11: Copy Built Files to Web Root

```bash
# Copy built client files to web root
sudo cp -r /var/www/chicknneeds/client/dist/* /var/www/chicknneeds/

# Set proper permissions
sudo chown -R www-data:www-data /var/www/chicknneeds
sudo chmod -R 755 /var/www/chicknneeds
```

## Step 12: Test Your Deployment

### Check Services Status
```bash
# Check PM2 status
pm2 status

# Check Nginx status
sudo systemctl status nginx

# Check MySQL status
sudo systemctl status mysql

# Check PM2 logs
pm2 logs chicknneeds-api
```

### Test URLs
- Frontend: https://chicknneeds.shop
- API Health: https://chicknneeds.shop/api/health
- API Base: https://chicknneeds.shop/api

## Step 13: Domain Configuration

### DNS Settings (if not already done)
In your domain registrar's DNS settings, ensure:
- A record: `chicknneeds.shop` → `168.231.119.100`
- A record: `www.chicknneeds.shop` → `168.231.119.100`

## Step 14: Final Verification

### Test the Complete Flow
1. Visit https://chicknneeds.shop
2. Try user registration
3. Check email verification (if configured)
4. Test login
5. Browse products
6. Add items to cart
7. Test checkout process

### Monitor Application
```bash
# Monitor PM2 processes
pm2 monit

# View real-time logs
pm2 logs chicknneeds-api --lines 50

# Restart application if needed
pm2 restart chicknneeds-api
```

## Troubleshooting

### Common Issues

1. **Port 4000 not accessible**
   ```bash
   sudo ufw allow 4000
   ```

2. **Database connection issues**
   ```bash
   sudo systemctl restart mysql
   # Check MySQL logs
   sudo tail -f /var/log/mysql/error.log
   ```

3. **Nginx configuration errors**
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **PM2 process not starting**
   ```bash
   pm2 logs chicknneeds-api
   pm2 restart chicknneeds-api
   ```

### Useful Commands

```bash
# Restart all services
sudo systemctl restart nginx mysql
pm2 restart all

# Check disk space
df -h

# Check memory usage
free -h

# Check running processes
ps aux | grep node
```

## Maintenance

### Regular Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies
cd /var/www/chicknneeds/server && npm update
cd /var/www/chicknneeds/client && npm update

# Rebuild client
cd /var/www/chicknneeds/client && npm run build
sudo cp -r dist/* /var/www/chicknneeds/
```

### Backup Database
```bash
# Create database backup
mysqldump -u chicknneeds -p chicknneeds > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Security Notes

1. **Change default passwords** for MySQL and system users
2. **Keep system updated** regularly
3. **Monitor logs** for suspicious activity
4. **Use strong JWT secrets** and API keys
5. **Enable firewall** and configure properly
6. **Regular backups** of database and files

## Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs chicknneeds-api`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check MySQL logs: `sudo tail -f /var/log/mysql/error.log`
4. Verify all services are running: `sudo systemctl status nginx mysql`

Your Chick'N Needs website should now be live at https://chicknneeds.shop! 🎉
