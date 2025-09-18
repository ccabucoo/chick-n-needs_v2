# Complete Hostinger VPS Deployment Guide for Chick'N Needs Website

## Overview
This guide will help you deploy your Chick'N Needs website to Hostinger VPS with the following setup:
- **Domain**: chickenneeds.shop
- **IP**: 168.231.119.100
- **Frontend**: React (Vite) served by Apache
- **Backend**: Node.js API with PM2 process manager
- **Database**: MySQL
- **SSL**: Let's Encrypt certificates

## Prerequisites
- Hostinger VPS access (SSH)
- Domain pointed to your VPS IP
- Basic Linux command line knowledge

---

## Step 1: Initial VPS Setup

### 1.1 Connect to your VPS
```bash
ssh root@168.231.119.100
# or
ssh root@chickenneeds.shop
```

### 1.2 Update system packages
```bash
apt update && apt upgrade -y
```

### 1.3 Install required software
```bash
# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
apt-get install -y nodejs

# Install MySQL
apt install mysql-server -y

# Install Apache
apt install apache2 -y

# Install PM2 globally
npm install -g pm2

# Install additional tools
apt install git curl wget unzip -y
```

### 1.4 Verify installations
```bash
node --version  # Should show v22.0.18
npm --version
mysql --version
apache2 -v
pm2 --version
```

---

## Step 2: Database Setup

### 2.1 Secure MySQL installation
```bash
mysql_secure_installation
```
Follow the prompts to:
- Set root password
- Remove anonymous users
- Disallow root login remotely
- Remove test database
- Reload privilege tables

### 2.2 Create database and user
```bash
mysql -u root -p
```

In MySQL prompt:
```sql
CREATE DATABASE chicknneeds;
CREATE USER 'chicknneeds_user'@'localhost' IDENTIFIED BY 'Ch1ckitout@0999';
GRANT ALL PRIVILEGES ON chicknneeds.* TO 'chicknneeds_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2.3 Import database schema
```bash
mysql -u chicknneeds_user -p chicknneeds < /root/schema.sql
```

---

## Step 3: Upload Your Website Files

### 3.1 Create website directory
```bash
mkdir -p /var/www/chickenneeds.shop
cd /var/www/chickenneeds.shop
```

### 3.2 Upload files using SCP (from your local machine)
```bash
# From your local machine, run:
scp -r ./client/dist root@chickenneeds.shop:/var/www/chickenneeds.shop/client/
scp -r ./server root@chickenneeds.shop:/var/www/chickenneeds.shop/
scp -r ./client/public/images root@chickenneeds.shop:/var/www/chickenneeds.shop/server/images/
```

### 3.3 Alternative: Clone from Git (if you have a repository)
```bash
cd /var/www/chickenneeds.shop
git clone https://github.com/yourusername/chicknneeds.git .
```

---

## Step 4: Backend Configuration

### 4.1 Install server dependencies
```bash
cd /var/www/chickenneeds.shop/server
npm install --production
```

### 4.2 Create production environment file
```bash
cp production.env .env
nano .env
```

Update the `.env` file with your actual values:
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=chicknneeds
MYSQL_USER=chicknneeds_user
MYSQL_PASSWORD=Ch1ckitout@0999

PORT=4000
NODE_ENV=production
HOST=0.0.0.0

JWT_SECRET=your_very_strong_jwt_secret_key_here
FRONTEND_URL=https://chickenneeds.shop
PUBLIC_APP_URL=https://chickenneeds.shop

SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=noreply@chickenneeds.shop
```

### 4.3 Set up PM2 process manager
```bash
# Start the application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
```

### 4.4 Test the API
```bash
curl http://localhost:4000/api/health
```

---

## Step 5: Apache Configuration

### 5.1 Enable required Apache modules
```bash
a2enmod rewrite
a2enmod ssl
a2enmod headers
a2enmod proxy
a2enmod proxy_http
systemctl restart apache2
```

### 5.2 Create Apache virtual host
```bash
nano /etc/apache2/sites-available/chickenneeds.shop.conf
```

Copy the content from `apache-config.conf` file I created earlier.

### 5.3 Enable the site
```bash
a2ensite chickenneeds.shop.conf
a2dissite 000-default
systemctl reload apache2
```

---

## Step 6: SSL Certificate Setup

### 6.1 Install Certbot
```bash
apt install certbot python3-certbot-apache -y
```

### 6.2 Obtain SSL certificate
```bash
certbot --apache -d chickenneeds.shop -d www.chickenneeds.shop
```

Follow the prompts to:
- Enter your email
- Agree to terms
- Choose redirect option (recommended: redirect HTTP to HTTPS)

### 6.3 Test automatic renewal
```bash
certbot renew --dry-run
```

---

## Step 7: File Permissions and Security

### 7.1 Set proper file permissions
```bash
chown -R www-data:www-data /var/www/chickenneeds.shop/client/dist
chown -R root:root /var/www/chickenneeds.shop/server
chmod -R 755 /var/www/chickenneeds.shop/client/dist
chmod -R 700 /var/www/chickenneeds.shop/server
```

### 7.2 Configure firewall
```bash
ufw allow ssh
ufw allow 'Apache Full'
ufw allow 4000
ufw enable
```

---

## Step 8: Final Testing and Verification

### 8.1 Test all components
```bash
# Test Apache
systemctl status apache2

# Test MySQL
systemctl status mysql

# Test PM2
pm2 status

# Test API
curl https://chickenneeds.shop/api/health

# Test frontend
curl https://chickenneeds.shop
```

### 8.2 Check logs
```bash
# Apache logs
tail -f /var/log/apache2/chickenneeds.shop_error.log
tail -f /var/log/apache2/chickenneeds.shop_access.log

# PM2 logs
pm2 logs chicknneeds-api

# MySQL logs
tail -f /var/log/mysql/error.log
```

---

## Step 9: Monitoring and Maintenance

### 9.1 Set up monitoring
```bash
# Install htop for system monitoring
apt install htop -y

# Monitor PM2 processes
pm2 monit
```

### 9.2 Create backup script
```bash
nano /root/backup.sh
```

Add this content:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u chicknneeds_user -pCh1ckitout@0999 chicknneeds > /root/backups/chicknneeds_$DATE.sql
tar -czf /root/backups/website_$DATE.tar.gz /var/www/chickenneeds.shop
find /root/backups -name "*.sql" -mtime +7 -delete
find /root/backups -name "*.tar.gz" -mtime +7 -delete
```

Make it executable:
```bash
chmod +x /root/backup.sh
mkdir -p /root/backups
```

### 9.3 Set up cron job for backups
```bash
crontab -e
```

Add this line for daily backups at 2 AM:
```
0 2 * * * /root/backup.sh
```

---

## Step 10: Troubleshooting Common Issues

### 10.1 If API is not responding
```bash
# Check PM2 status
pm2 status

# Restart PM2
pm2 restart chicknneeds-api

# Check logs
pm2 logs chicknneeds-api --lines 50
```

### 10.2 If frontend is not loading
```bash
# Check Apache status
systemctl status apache2

# Check Apache configuration
apache2ctl configtest

# Restart Apache
systemctl restart apache2
```

### 10.3 If database connection fails
```bash
# Test MySQL connection
mysql -u chicknneeds_user -pCh1ckitout@0999 chicknneeds

# Check MySQL status
systemctl status mysql

# Restart MySQL
systemctl restart mysql
```

### 10.4 If SSL certificate issues
```bash
# Check certificate status
certbot certificates

# Renew certificate manually
certbot renew
```

---

## Step 11: Performance Optimization

### 11.1 Enable Apache compression
```bash
a2enmod deflate
nano /etc/apache2/mods-available/deflate.conf
```

Add this configuration:
```apache
<Location />
    SetOutputFilter DEFLATE
    SetEnvIfNoCase Request_URI \
        \.(?:gif|jpe?g|png)$ no-gzip dont-vary
    SetEnvIfNoCase Request_URI \
        \.(?:exe|t?gz|zip|bz2|sit|rar)$ no-gzip dont-vary
</Location>
```

### 11.2 Configure MySQL for better performance
```bash
nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Add these optimizations:
```ini
[mysqld]
innodb_buffer_pool_size = 256M
innodb_log_file_size = 64M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT
query_cache_size = 32M
query_cache_type = 1
max_connections = 100
```

Restart MySQL:
```bash
systemctl restart mysql
```

---

## Step 12: Final Checklist

- [ ] Domain points to VPS IP
- [ ] SSL certificate is active
- [ ] Frontend loads correctly
- [ ] API endpoints respond
- [ ] Database connection works
- [ ] User registration/login works
- [ ] Product images load
- [ ] Cart functionality works
- [ ] Email notifications work (if configured)
- [ ] Backup system is set up
- [ ] Monitoring is in place

---

## Important Notes

1. **Security**: Always use strong passwords and keep your system updated
2. **Backups**: Regular backups are crucial for production
3. **Monitoring**: Monitor your server resources and application logs
4. **Updates**: Keep all software updated for security patches
5. **SSL**: Ensure SSL certificates are renewed automatically

## Support Commands

```bash
# Restart all services
systemctl restart apache2 mysql
pm2 restart all

# Check system resources
htop
df -h
free -h

# View all running services
systemctl list-units --type=service --state=running
```

Your Chick'N Needs website should now be fully deployed and accessible at https://chickenneeds.shop!
