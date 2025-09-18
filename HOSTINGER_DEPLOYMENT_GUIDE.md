# Chick'N Needs - Hostinger VPS Deployment Guide

## Prerequisites
- Hostinger VPS with Ubuntu 20.04+ or CentOS 7+
- Domain: chicknneeds.shop
- IP: 168.231.119.100
- Node.js 22.0.18
- MySQL
- Apache/Nginx

## Step-by-Step Deployment

### 1. Connect to Your VPS
```bash
ssh root@168.231.119.100
# or
ssh your-username@168.231.119.100
```

### 2. Run the Deployment Script
```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

### 3. Configure MySQL Database
```bash
# Secure MySQL installation
sudo mysql_secure_installation

# Login to MySQL
sudo mysql -u root -p

# Create database and user
CREATE DATABASE chicknneeds;
CREATE USER 'chicknneeds_user'@'localhost' IDENTIFIED BY 'your-secure-password';
GRANT ALL PRIVILEGES ON chicknneeds.* TO 'chicknneeds_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import database schema
mysql -u chicknneeds_user -p chicknneeds < /var/www/chicknneeds/chick-n-needs_v2/database/schema.sql
```

### 4. Configure Environment Variables
```bash
# Edit server environment file
nano /var/www/chicknneeds/chick-n-needs_v2/server/.env

# Update these values:
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=chicknneeds_user
MYSQL_PASSWORD=your-mysql-password
MYSQL_DATABASE=chicknneeds
PUBLIC_APP_URL=https://chicknneeds.shop
FRONTEND_URL=https://chicknneeds.shop
BREVO_API_KEY=your-brevo-api-key-here
BCRYPT_ROUNDS=12

# Edit client environment file
nano /var/www/chicknneeds/chick-n-needs_v2/client/.env

# Update this value:
VITE_API_URL=https://chicknneeds.shop/api
```

### 5. Install and Configure Nginx
```bash
# Install Nginx
sudo apt install nginx -y

# Copy the nginx configuration
sudo cp /var/www/chicknneeds/chick-n-needs_v2/nginx.conf /etc/nginx/sites-available/chicknneeds.shop

# Enable the site
sudo ln -s /etc/nginx/sites-available/chicknneeds.shop /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 6. Start the Application with PM2
```bash
# Navigate to server directory
cd /var/www/chicknneeds/chick-n-needs_v2/server

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### 7. Configure Firewall
```bash
# Allow SSH, HTTP, HTTPS, and Node.js port
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 4000
sudo ufw --force enable
```

### 8. Setup SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d chicknneeds.shop -d www.chicknneeds.shop

# Test automatic renewal
sudo certbot renew --dry-run
```

### 9. Test the Deployment
```bash
# Check if the API is running
curl http://localhost:4000/api/health

# Check if the frontend is accessible
curl http://localhost

# Check PM2 status
pm2 status

# Check nginx status
sudo systemctl status nginx

# Check MySQL status
sudo systemctl status mysql
```

### 10. Domain Configuration
Make sure your domain chicknneeds.shop points to IP 168.231.119.100:
- A record: chicknneeds.shop → 168.231.119.100
- A record: www.chicknneeds.shop → 168.231.119.100

## Useful Commands

### PM2 Commands
```bash
pm2 status                    # Check status
pm2 logs chicknneeds-api      # View logs
pm2 restart chicknneeds-api   # Restart app
pm2 stop chicknneeds-api      # Stop app
pm2 delete chicknneeds-api    # Delete app
```

### Nginx Commands
```bash
sudo nginx -t                 # Test configuration
sudo systemctl reload nginx   # Reload configuration
sudo systemctl restart nginx  # Restart nginx
sudo systemctl status nginx  # Check status
```

### MySQL Commands
```bash
sudo systemctl status mysql   # Check status
sudo systemctl restart mysql  # Restart MySQL
mysql -u chicknneeds_user -p chicknneeds  # Connect to database
```

## Troubleshooting

### Check Logs
```bash
# Application logs
pm2 logs chicknneeds-api

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# System logs
sudo journalctl -u nginx
sudo journalctl -u mysql
```

### Common Issues
1. **Port 4000 not accessible**: Check firewall settings
2. **Database connection failed**: Verify MySQL credentials in .env
3. **SSL certificate issues**: Ensure domain points to correct IP
4. **CORS errors**: Check FRONTEND_URL and PUBLIC_APP_URL in .env

## Security Checklist
- [ ] Change default MySQL root password
- [ ] Use strong JWT secret
- [ ] Enable firewall
- [ ] Setup SSL certificate
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity

## Backup Strategy
```bash
# Database backup
mysqldump -u chicknneeds_user -p chicknneeds > backup_$(date +%Y%m%d_%H%M%S).sql

# Application backup
tar -czf chicknneeds_backup_$(date +%Y%m%d_%H%M%S).tar.gz /var/www/chicknneeds/
```

Your Chick'N Needs website should now be live at https://chicknneeds.shop!
