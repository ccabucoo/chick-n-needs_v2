#!/bin/bash

# Chick'N Needs Deployment Script for Hostinger VPS
# Domain: chicknneeds.shop
# IP: 168.231.119.100

set -e

echo "🚀 Starting Chick'N Needs deployment to Hostinger VPS..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="chicknneeds.shop"
VPS_IP="168.231.119.100"
VPS_USER="root"  # Change this to your VPS username
PROJECT_DIR="/var/www/chicknneeds.shop"
SERVER_DIR="$PROJECT_DIR/server"
CLIENT_DIR="$PROJECT_DIR/public_html"

echo -e "${YELLOW}📋 Deployment Configuration:${NC}"
echo "Domain: $DOMAIN"
echo "VPS IP: $VPS_IP"
echo "Project Directory: $PROJECT_DIR"
echo ""

# Function to run commands on VPS
run_on_vps() {
    echo -e "${YELLOW}🔧 Running on VPS: $1${NC}"
    ssh $VPS_USER@$VPS_IP "$1"
}

# Function to copy files to VPS
copy_to_vps() {
    echo -e "${YELLOW}📁 Copying to VPS: $1 -> $2${NC}"
    scp -r "$1" $VPS_USER@$VPS_IP:"$2"
}

echo -e "${GREEN}✅ Deployment script created successfully!${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Make the script executable: chmod +x deploy.sh"
echo "2. Update VPS_USER variable in this script with your actual VPS username"
echo "3. Ensure you have SSH access to your VPS"
echo "4. Run the deployment: ./deploy.sh"
echo ""
echo -e "${RED}⚠️  Important:${NC}"
echo "- Make sure to update your environment variables on the VPS"
echo "- Configure SSL certificates for HTTPS"
echo "- Set up your database credentials"
echo "- Update API keys in the environment files"