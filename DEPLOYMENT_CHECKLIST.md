# Pre-Deployment Checklist for Hostinger VPS

## Before You Start

### ✅ Domain Configuration
- [ ] Domain `chickenneeds.shop` is pointed to IP `168.231.119.100`
- [ ] DNS propagation is complete (check with `nslookup chickenneeds.shop`)

### ✅ VPS Access
- [ ] You have SSH access to your Hostinger VPS
- [ ] You have root or sudo privileges
- [ ] You know your VPS root password or have SSH key set up

### ✅ Files Ready
- [ ] Frontend built (`client/dist` folder exists)
- [ ] Server files uploaded
- [ ] Database schema ready (`database/schema.sql`)
- [ ] Environment files configured

---

## Files You Need to Upload

### 1. Frontend Files
```
client/dist/                    → /var/www/chickenneeds.shop/client/dist/
client/public/images/          → /var/www/chickenneeds.shop/server/images/
```

### 2. Backend Files
```
server/                        → /var/www/chickenneeds.shop/server/
server/production.env          → /var/www/chickenneeds.shop/server/.env
server/ecosystem.config.js     → /var/www/chickenneeds.shop/server/ecosystem.config.js
```

### 3. Configuration Files
```
apache-config.conf             → /etc/apache2/sites-available/chickenneeds.shop.conf
deploy.sh                      → /root/deploy.sh (optional)
database/schema.sql            → /root/schema.sql
```

---

## Environment Variables to Update

### Server (.env file)
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=chicknneeds
MYSQL_USER=chicknneeds_user
MYSQL_PASSWORD=YOUR_ACTUAL_PASSWORD_HERE

PORT=4000
NODE_ENV=production
HOST=0.0.0.0

JWT_SECRET=YOUR_STRONG_JWT_SECRET_HERE
FRONTEND_URL=https://chickenneeds.shop
PUBLIC_APP_URL=https://chickenneeds.shop

SENDGRID_API_KEY=YOUR_SENDGRID_KEY_HERE
FROM_EMAIL=noreply@chickenneeds.shop
```

### Client (production.env)
```env
VITE_API_URL=https://chickenneeds.shop/api
VITE_APP_NAME=Chick'N Needs
VITE_APP_VERSION=1.0.0
```

---

## Database Setup Requirements

### MySQL User Creation
```sql
CREATE DATABASE chicknneeds;
CREATE USER 'chicknneeds_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON chicknneeds.* TO 'chicknneeds_user'@'localhost';
FLUSH PRIVILEGES;
```

### Required Tables
- [ ] users
- [ ] products
- [ ] categories
- [ ] product_images
- [ ] cart_items
- [ ] orders
- [ ] order_items
- [ ] addresses
- [ ] reviews
- [ ] wishlists
- [ ] notifications
- [ ] email_tokens
- [ ] contact_messages

---

## Security Checklist

### ✅ Passwords
- [ ] Strong MySQL password (at least 12 characters)
- [ ] Strong JWT secret (at least 32 characters)
- [ ] Strong session secret
- [ ] All default passwords changed

### ✅ File Permissions
- [ ] Web files owned by www-data
- [ ] Server files owned by root
- [ ] Sensitive files not world-readable
- [ ] .env file protected (600 permissions)

### ✅ Firewall
- [ ] SSH access allowed
- [ ] HTTP/HTTPS ports open
- [ ] Unnecessary ports closed
- [ ] Fail2ban configured (optional)

---

## Testing Checklist

### ✅ After Deployment
- [ ] Website loads at https://chickenneeds.shop
- [ ] API responds at https://chickenneeds.shop/api/health
- [ ] User registration works
- [ ] User login works
- [ ] Product images load
- [ ] Cart functionality works
- [ ] Database operations work
- [ ] SSL certificate is valid
- [ ] No console errors in browser

---

## Monitoring Setup

### ✅ Log Files
- [ ] Apache error logs accessible
- [ ] Apache access logs accessible
- [ ] PM2 logs configured
- [ ] MySQL error logs accessible

### ✅ Process Management
- [ ] PM2 processes running
- [ ] Apache service running
- [ ] MySQL service running
- [ ] Auto-restart configured

---

## Backup Strategy

### ✅ Backup Plan
- [ ] Database backup script created
- [ ] File backup script created
- [ ] Cron job for daily backups
- [ ] Backup retention policy set
- [ ] Test restore procedure

---

## Performance Optimization

### ✅ Apache Configuration
- [ ] Gzip compression enabled
- [ ] Browser caching configured
- [ ] Static file serving optimized
- [ ] Proxy configuration correct

### ✅ MySQL Configuration
- [ ] Buffer pool size optimized
- [ ] Query cache enabled
- [ ] Connection limits set
- [ ] Slow query log enabled

---

## Post-Deployment Tasks

### ✅ SSL Certificate
- [ ] Let's Encrypt certificate obtained
- [ ] Auto-renewal configured
- [ ] HTTP to HTTPS redirect working

### ✅ Domain Configuration
- [ ] www subdomain redirects to main domain
- [ ] DNS records properly configured
- [ ] Email records set up (if needed)

---

## Troubleshooting Resources

### Common Issues
1. **502 Bad Gateway**: Check if PM2 process is running
2. **Database Connection Error**: Verify MySQL credentials and service
3. **SSL Certificate Issues**: Check domain DNS and certificate status
4. **Permission Denied**: Check file ownership and permissions
5. **Images Not Loading**: Verify image paths and Apache proxy config

### Useful Commands
```bash
# Check services
systemctl status apache2 mysql
pm2 status

# View logs
pm2 logs
tail -f /var/log/apache2/chickenneeds.shop_error.log

# Test API
curl https://chickenneeds.shop/api/health

# Check SSL
openssl s_client -connect chickenneeds.shop:443
```

---

## Contact Information

If you encounter issues during deployment:
1. Check the deployment guide first
2. Review error logs
3. Verify all checklist items
4. Test each component individually

Remember: Take your time with each step and test thoroughly before moving to the next step!
