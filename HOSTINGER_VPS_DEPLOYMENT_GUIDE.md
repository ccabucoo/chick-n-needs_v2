# 🚀 Chick'N Needs - Hostinger VPS Deployment Guide

## 📋 Prerequisites
- Hostinger VPS with Ubuntu 20.04+ 
- Root access to your VPS
- Domain: `chicknneeds.shop` (IP: 168.231.119.100)
- Node.js 22.0.18
- MySQL Database
- Nginx Web Server

## 🌐 DNS Configuration Status
✅ **Your DNS is correctly configured:**
- `A` record: `@` → `168.231.119.100`
- `A` record: `api` → `168.231.119.100`
- `CNAME` record: `www` → `chicknneeds.shop`
- CAA records for SSL certificates

## 🚀 Quick Start (Automated Setup)

### Step 1: Connect to Your VPS
```bash
ssh root@168.231.119.100
```

### Step 2: Download and Run Setup Script
```bash
# Download the setup script
wget https://raw.githubusercontent.com/ccabucoo/chick-n-needs_v2/Hostinger/vps-setup.sh

# Make it executable
chmod +x vps-setup.sh

# Run the setup
./vps-setup.sh
```

## 🔧 Manual Setup (Step by Step)

### Step 1: System Update and Dependencies
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
apt-get install -y nodejs

# Install MySQL
apt install mysql-server -y

# Install Nginx
apt install nginx -y

# Install PM2
npm install -g pm2

# Install additional tools
apt install git curl wget unzip -y
```

### Step 2: Database Setup
```bash
# Secure MySQL
mysql_secure_installation

# Create database and user
mysql -u root -p
```

**In MySQL console:**
```sql
CREATE DATABASE chicknneeds;
CREATE USER 'chicknneeds_user'@'localhost' IDENTIFIED BY 'Ch1ckitout@09999';
GRANT ALL PRIVILEGES ON chicknneeds.* TO 'chicknneeds_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 3: Application Setup
```bash
# Create directory
mkdir -p /var/www/chicknneeds
cd /var/www/chicknneeds

# Clone repository
git clone https://github.com/ccabucoo/chick-n-needs_v2.git .
git checkout Hostinger

# Import database schema
mysql -u chicknneeds_user -p chicknneeds < database/schema.sql

# Install dependencies
cd server
npm install

cd ../client
npm install
npm run build
```

### Step 4: Directory Setup
```bash
# Create required directories
mkdir -p /var/www/chicknneeds/uploads
mkdir -p /var/www/chicknneeds/images
mkdir -p /var/log/chicknneeds

# Copy images
cp -r /var/www/chicknneeds/client/src/assets/* /var/www/chicknneeds/images/

# Set permissions
chown -R www-data:www-data /var/www/chicknneeds
chmod -R 755 /var/www/chicknneeds
```

### Step 5: Nginx Configuration
```bash
# Copy Nginx config
cp /var/www/chicknneeds/nginx.conf /etc/nginx/sites-available/chicknneeds.shop

# Enable site
ln -s /etc/nginx/sites-available/chicknneeds.shop /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart
nginx -t
systemctl restart nginx
systemctl enable nginx
```

### Step 6: SSL Certificate
```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d chicknneeds.shop -d www.chicknneeds.shop -d api.chicknneeds.shop

# Test auto-renewal
certbot renew --dry-run
```

### Step 7: PM2 Process Management
```bash
# Start application
cd /var/www/chicknneeds
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 8: Firewall Configuration
```bash
# Configure UFW
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

## 📁 File Structure After Setup
```
/var/www/chicknneeds/
├── client/
│   ├── dist/                 # Built React app
│   └── src/
├── server/
│   ├── src/
│   └── .env                 # Production environment
├── database/
│   └── schema.sql
├── images/                  # Static images
├── uploads/                 # User uploads
├── ecosystem.config.js      # PM2 configuration
├── deploy.sh               # Full deployment script
└── quick-deploy.sh         # Quick update script
```

## 🔄 Deployment Commands

### Full Deployment
```bash
cd /var/www/chicknneeds
./deploy.sh
```

### Quick Update
```bash
cd /var/www/chicknneeds
./quick-deploy.sh
```

### Manual Commands
```bash
# Pull latest changes
git pull origin Hostinger

# Build client
cd client && npm run build

# Restart API
pm2 restart chicknneeds-api

# Restart Nginx
systemctl restart nginx
```

## 🔍 Monitoring and Maintenance

### Check Service Status
```bash
# Check all services
systemctl status nginx mysql
pm2 status

# Check logs
pm2 logs chicknneeds-api
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Health Checks
```bash
# API health check
curl https://api.chicknneeds.shop/api/health

# Website check
curl -I https://chicknneeds.shop
```

### System Monitoring
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check running processes
htop
```

## 🌐 Your Website URLs
- **Main Website:** https://chicknneeds.shop
- **API Endpoint:** https://api.chicknneeds.shop
- **Health Check:** https://api.chicknneeds.shop/api/health

## 🔧 Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   ```bash
   # Check if API is running
   pm2 status
   pm2 restart chicknneeds-api
   ```

2. **Database Connection Error**
   ```bash
   # Check MySQL status
   systemctl status mysql
   systemctl restart mysql
   ```

3. **SSL Certificate Issues**
   ```bash
   # Renew certificate
   certbot renew
   systemctl reload nginx
   ```

4. **Permission Issues**
   ```bash
   # Fix permissions
   chown -R www-data:www-data /var/www/chicknneeds
   chmod -R 755 /var/www/chicknneeds
   ```

## 📊 Performance Optimization

### Nginx Optimization
- Gzip compression enabled
- Static file caching (1 year)
- HTTP/2 support
- Security headers

### PM2 Configuration
- Auto-restart on crash
- Memory limit (1GB)
- Log rotation
- Process monitoring

### Database Optimization
- Proper indexing
- Connection pooling
- Query optimization

## 🔒 Security Features

- SSL/TLS encryption
- Security headers
- Rate limiting
- Input sanitization
- CORS protection
- Firewall configuration

## 📝 Log Files
- **Application logs:** `/var/log/chicknneeds/`
- **Nginx logs:** `/var/log/nginx/`
- **System logs:** `/var/log/syslog`

## 🚀 Success Checklist

- [ ] VPS connected and accessible
- [ ] All dependencies installed
- [ ] Database created and configured
- [ ] Application cloned and built
- [ ] Nginx configured and running
- [ ] SSL certificates installed
- [ ] PM2 process running
- [ ] Firewall configured
- [ ] Website accessible via HTTPS
- [ ] API responding correctly
- [ ] All features working

## 📞 Support

If you encounter any issues:
1. Check the logs first
2. Verify all services are running
3. Check firewall and DNS settings
4. Ensure all files have correct permissions

Your Chick'N Needs website should now be fully operational on Hostinger VPS! 🎉