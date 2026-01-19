# Hostinger VPS Operations — Examples

## Example 1: Fresh VPS Setup (Ubuntu 22.04)

### Initial Connection
```bash
# First login with password (from Hostinger email)
ssh root@123.45.67.89
# Enter password when prompted

# Update system
apt update && apt upgrade -y

# Check system info
hostnamectl
df -h
free -m
```

### Create Admin User
```bash
# Create new user
adduser adminuser
# Set password when prompted

# Add to sudo group
usermod -aG sudo adminuser

# Test sudo access
su - adminuser
sudo whoami
# Should output: root
```

### Setup SSH Keys
```bash
# On your LOCAL machine (not VPS):
ssh-keygen -t ed25519 -C "hostinger-production-20250131"
# Save to: /home/youruser/.ssh/hostinger_prod
# Enter passphrase (recommended)

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/hostinger_prod.pub adminuser@123.45.67.89

# Test key-based login
ssh -i ~/.ssh/hostinger_prod adminuser@123.45.67.89
# Should login without password
```

### SSH Hardening
```bash
# Backup SSH config
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d)

# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Make these changes:
# PasswordAuthentication no
# PubkeyAuthentication yes
# PermitRootLogin no
# Port 22  # Or change to custom port like 2222

# Test config
sudo sshd -t

# If test passes, restart SSH
# ⚠️ KEEP CURRENT SESSION OPEN!
sudo systemctl restart sshd

# In NEW terminal, test login
ssh -i ~/.ssh/hostinger_prod adminuser@123.45.67.89
```

### Firewall Setup
```bash
# Install ufw
sudo apt install -y ufw

# Set defaults
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (your port!)
sudo ufw allow 22/tcp

# Allow web traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

### Install Fail2Ban
```bash
# Install
sudo apt install -y fail2ban

# Create local config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit config
sudo nano /etc/fail2ban/jail.local

# Find [sshd] section and ensure:
# enabled = true
# maxretry = 3
# bantime = 3600

# Start fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Check status
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

---

## Example 2: WordPress Deployment (Secure)

### Install LEMP Stack
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Nginx
sudo apt install -y nginx

# Install MariaDB
sudo apt install -y mariadb-server

# Secure MariaDB
sudo mysql_secure_installation
# Answer: Y to all prompts
# Set strong root password

# Install PHP 8.2 and extensions
sudo apt install -y php8.2-fpm php8.2-mysql php8.2-curl php8.2-gd \
  php8.2-mbstring php8.2-xml php8.2-xmlrpc php8.2-zip php8.2-intl

# Verify PHP
php -v
```

### Create Database and User
```bash
# Login to MariaDB
sudo mysql -u root -p

# Create database
CREATE DATABASE wordpress_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user with strong password
CREATE USER 'wp_user'@'localhost' IDENTIFIED BY 'STRONG_RANDOM_PASSWORD_HERE';

# Grant privileges
GRANT ALL PRIVILEGES ON wordpress_db.* TO 'wp_user'@'localhost';

# Flush privileges
FLUSH PRIVILEGES;

# Exit
EXIT;
```

### Download and Setup WordPress
```bash
# Navigate to web root
cd /var/www

# Download WordPress
sudo wget https://wordpress.org/latest.tar.gz

# Extract
sudo tar -xzf latest.tar.gz

# Rename to domain
sudo mv wordpress example.com

# Set ownership
sudo chown -R www-data:www-data /var/www/example.com

# Set permissions
sudo find /var/www/example.com -type d -exec chmod 755 {} \;
sudo find /var/www/example.com -type f -exec chmod 644 {} \;

# Create wp-config
cd /var/www/example.com
sudo cp wp-config-sample.php wp-config.php

# Edit wp-config.php
sudo nano wp-config.php

# Update:
# DB_NAME: wordpress_db
# DB_USER: wp_user
# DB_PASSWORD: (your password)
# DB_HOST: localhost

# Get security keys from: https://api.wordpress.org/secret-key/1.1/salt/
# Replace the salt section

# Set secure permissions on wp-config.php
sudo chmod 440 wp-config.php
```

### Configure Nginx
```bash
# Create site config
sudo nano /etc/nginx/sites-available/example.com

# Add configuration:
server {
    listen 80;
    listen [::]:80;

    server_name example.com www.example.com;
    root /var/www/example.com;

    index index.php index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Hide Nginx version
    server_tokens off;

    # Max upload size
    client_max_body_size 64M;

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    # Block access to sensitive files
    location ~ /\. {
        deny all;
    }

    location ~* /(?:uploads|files)/.*\.php$ {
        deny all;
    }

    # Disable XML-RPC
    location = /xmlrpc.php {
        deny all;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/example.com /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### SSL with Let's Encrypt
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d example.com -d www.example.com

# Enter email when prompted
# Agree to ToS
# Choose: redirect HTTP to HTTPS (option 2)

# Test auto-renewal
sudo certbot renew --dry-run

# Certificate will auto-renew via cron
```

### WordPress Security Hardening
```bash
# 1. Disable file editing
sudo nano /var/www/example.com/wp-config.php
# Add before "That's all, stop editing!":
define('DISALLOW_FILE_EDIT', true);

# 2. Install WP-CLI
cd /tmp
curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
chmod +x wp-cli.phar
sudo mv wp-cli.phar /usr/local/bin/wp

# 3. Update WordPress
cd /var/www/example.com
sudo -u www-data wp core update

# 4. Install security plugins
sudo -u www-data wp plugin install wordfence --activate
sudo -u www-data wp plugin install updraftplus --activate

# 5. Enable auto-updates
sudo -u www-data wp plugin auto-updates enable --all

# 6. Remove unused themes
sudo -u www-data wp theme delete twentytwenty twentytwentyone

# 7. Create admin user with strong password
sudo -u www-data wp user create newadmin admin@example.com \
  --role=administrator --user_pass="STRONG_PASSWORD_HERE"

# 8. Delete default admin user (if exists)
sudo -u www-data wp user delete admin --yes
```

---

## Example 3: Cloudflare Setup

### Add Site to Cloudflare
1. Login to cloudflare.com
2. Click "Add a Site"
3. Enter: example.com
4. Choose Free plan
5. Cloudflare scans DNS records

### Update Nameservers
```bash
# Cloudflare provides nameservers like:
# NS1: alexa.ns.cloudflare.com
# NS2: tim.ns.cloudflare.com

# Login to your domain registrar (Namecheap, GoDaddy, etc.)
# Update nameservers to Cloudflare's

# Wait for DNS propagation (can take 24-48 hours)
# Check: dig example.com NS
```

### Configure Cloudflare

**SSL/TLS Settings**:
- SSL/TLS encryption mode: Full (strict)
- Edge Certificates: Automatic HTTPS Rewrites ON
- Minimum TLS Version: 1.2

**Firewall Rules**:
```
Rule 1: Block known bots
Expression: (cf.threat_score gt 14)
Action: Block

Rule 2: Rate limit login
Expression: (http.request.uri.path contains "/wp-login.php")
Action: Rate limit (10 requests per 10 seconds)

Rule 3: Block suspicious countries (optional)
Expression: (ip.geoip.country in {"CN" "RU"})
Action: Challenge
```

**Page Rules**:
```
Rule 1: example.com/*
- Cache Level: Standard
- Browser Cache TTL: 4 hours
- Always Online: ON

Rule 2: example.com/wp-admin/*
- Cache Level: Bypass
- Disable Performance
```

**Speed Settings**:
- Auto Minify: JavaScript, CSS, HTML
- Brotli: ON
- Early Hints: ON
- Rocket Loader: OFF (can break sites)

### Install Origin Certificate
```bash
# In Cloudflare: SSL/TLS > Origin Server > Create Certificate
# Keep defaults (15 years, RSA 2048)
# Copy certificate and private key

# On VPS:
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/cert.pem
# Paste certificate

sudo nano /etc/ssl/cloudflare/key.pem
# Paste private key

sudo chmod 644 /etc/ssl/cloudflare/cert.pem
sudo chmod 600 /etc/ssl/cloudflare/key.pem

# Update Nginx config
sudo nano /etc/nginx/sites-available/example.com

# In server block for port 443:
ssl_certificate /etc/ssl/cloudflare/cert.pem;
ssl_certificate_key /etc/ssl/cloudflare/key.pem;

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Example 4: Automated Backups

### Database Backup Script
```bash
# Create script
nano /home/adminuser/scripts/backup-database.sh

#!/bin/bash
# Database backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/adminuser/backups/database"
RETENTION_DAYS=7

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup all databases
mysqldump -u root -p'YOUR_PASSWORD' --all-databases \
  | gzip > $BACKUP_DIR/all_databases_$DATE.sql.gz

# Backup specific WordPress database
mysqldump -u root -p'YOUR_PASSWORD' wordpress_db \
  | gzip > $BACKUP_DIR/wordpress_$DATE.sql.gz

# Delete old backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Log completion
echo "$(date): Database backup completed" >> /var/log/backup.log

# Make executable
chmod +x /home/adminuser/scripts/backup-database.sh
```

### Files Backup Script
```bash
# Create script
nano /home/adminuser/scripts/backup-files.sh

#!/bin/bash
# Files backup script

DATE=$(date +%Y%m%d)
BACKUP_DIR="/home/adminuser/backups/files"
WEB_ROOT="/var/www/example.com"

mkdir -p $BACKUP_DIR

# Backup WordPress files (excluding cache and uploads)
tar -czf $BACKUP_DIR/wordpress_$DATE.tar.gz \
  --exclude='wp-content/cache/*' \
  --exclude='wp-content/uploads/*' \
  $WEB_ROOT

# Separate backup of uploads (can be large)
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz \
  $WEB_ROOT/wp-content/uploads

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "$(date): Files backup completed" >> /var/log/backup.log

chmod +x /home/adminuser/scripts/backup-files.sh
```

### Schedule with Cron
```bash
# Edit crontab
crontab -e

# Add backup jobs:
# Daily database backup at 2 AM
0 2 * * * /home/adminuser/scripts/backup-database.sh >> /var/log/backup.log 2>&1

# Weekly files backup every Sunday at 3 AM
0 3 * * 0 /home/adminuser/scripts/backup-files.sh >> /var/log/backup.log 2>&1

# Check logs
tail -f /var/log/backup.log
```

### Offsite Sync
```bash
# Create script to sync to remote server
nano /home/adminuser/scripts/sync-backups.sh

#!/bin/bash
# Sync backups to remote server

BACKUP_DIR="/home/adminuser/backups"
REMOTE_USER="backup-user"
REMOTE_HOST="backup-server.example.com"
REMOTE_DIR="/backups/hostinger-vps"

# Sync using rsync over SSH
rsync -avz --delete \
  -e "ssh -i /home/adminuser/.ssh/backup_key" \
  $BACKUP_DIR/ \
  $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/

echo "$(date): Offsite sync completed" >> /var/log/backup.log

chmod +x /home/adminuser/scripts/sync-backups.sh

# Schedule daily at 4 AM
# In crontab:
# 0 4 * * * /home/adminuser/scripts/sync-backups.sh >> /var/log/backup.log 2>&1
```

---

## Example 5: Malware Scan Response

### Scenario: Hostinger Sends Malware Alert

**Alert**: "Malware detected: /var/www/example.com/wp-content/uploads/2025/01/system.php"

### Step 1: Isolate (Optional)
```bash
# If severe, block outbound traffic
sudo ufw default deny outgoing
sudo ufw reload

# Stop web server
sudo systemctl stop nginx
```

### Step 2: Create Snapshot
```bash
# In Hostinger panel:
# VPS > Snapshots > Create Snapshot
# Name: "pre-cleanup-20250131"
```

### Step 3: Examine Suspicious File
```bash
# View file
cat /var/www/example.com/wp-content/uploads/2025/01/system.php

# Example output might show:
# <?php @eval(base64_decode($_POST['cmd'])); ?>
# This is a classic PHP web shell

# Check when file was created
stat /var/www/example.com/wp-content/uploads/2025/01/system.php

# Find similar files
find /var/www/example.com -name "*.php" -path "*/uploads/*" -ls

# Search for eval/base64 patterns
find /var/www/example.com -name "*.php" | xargs grep -l "eval(base64"
```

### Step 4: Remove Malware
```bash
# Delete malicious file
sudo rm /var/www/example.com/wp-content/uploads/2025/01/system.php

# If many files, remove entire compromised directory
sudo rm -rf /var/www/example.com/wp-content/uploads/2025/01/

# Restore clean files from backup
tar -xzf /home/adminuser/backups/files/uploads_20250125.tar.gz \
  -C /var/www/example.com/wp-content/
```

### Step 5: Find Entry Point
```bash
# Check access logs for file creation time
# File created: 2025-01-30 14:23:15

# Search nginx logs around that time
sudo grep -i "30/Jan/2025:14:[0-9][0-9]:" /var/log/nginx/access.log \
  | grep -i "POST"

# Example finding:
# 1.2.3.4 - - [30/Jan/2025:14:22:45] "POST /wp-content/plugins/vulnerable-form/upload.php"

# Identified: Vulnerable plugin "vulnerable-form"
```

### Step 6: Remove Vulnerability
```bash
# Deactivate and delete vulnerable plugin
cd /var/www/example.com
sudo -u www-data wp plugin deactivate vulnerable-form
sudo -u www-data wp plugin delete vulnerable-form

# Check for plugin updates
sudo -u www-data wp plugin update --all
```

### Step 7: Full System Scan
```bash
# Install ClamAV
sudo apt install -y clamav clamav-daemon

# Update virus definitions
sudo systemctl stop clamav-freshclam
sudo freshclam
sudo systemctl start clamav-freshclam

# Run full scan (takes time, use screen/tmux)
screen -S malware-scan
sudo clamscan -r -i --remove=no / > /tmp/clamscan_$(date +%Y%m%d).log 2>&1

# Detach: Ctrl+A then D
# Reattach: screen -r malware-scan

# Review results
grep "FOUND" /tmp/clamscan_*.log
```

### Step 8: Rotate Credentials
```bash
# Change admin password
sudo -u www-data wp user update admin --user_pass="NEW_STRONG_PASSWORD"

# Regenerate WordPress salts
# Visit: https://api.wordpress.org/secret-key/1.1/salt/
# Update wp-config.php

# Change database password
sudo mysql -u root -p

# In MySQL:
ALTER USER 'wp_user'@'localhost' IDENTIFIED BY 'NEW_DB_PASSWORD';
FLUSH PRIVILEGES;
EXIT;

# Update wp-config.php with new password
sudo nano /var/www/example.com/wp-config.php

# Force all users to re-login
sudo -u www-data wp user session destroy --all

# Change SSH keys
ssh-keygen -t ed25519 -C "new-key-post-incident"
ssh-copy-id -i ~/.ssh/id_ed25519.pub adminuser@123.45.67.89
```

### Step 9: Harden
```bash
# Block uploads directory from executing PHP
sudo nano /etc/nginx/sites-available/example.com

# Add to server block:
location ~* /wp-content/uploads/.*\.php$ {
    deny all;
}

# Reload Nginx
sudo nginx -t
sudo systemctl reload nginx

# Update all software
sudo apt update && sudo apt full-upgrade -y
cd /var/www/example.com
sudo -u www-data wp core update
sudo -u www-data wp plugin update --all
sudo -u www-data wp theme update --all

# Install security plugin if not present
sudo -u www-data wp plugin install wordfence --activate
```

### Step 10: Document and Report
```bash
# Create incident report
nano /home/adminuser/incident-reports/20250131-malware.md

# Include:
# - Timeline of events
# - Files affected
# - Entry point identified
# - Actions taken
# - Lessons learned

# Respond to Hostinger ticket with:
# - Malware removed
# - Vulnerability patched
# - System hardened
# - Request scan re-run
```

---

## Example 6: Monitoring Setup

### Install Monitoring Stack
```bash
# Install Netdata (real-time monitoring)
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# Access at: http://YOUR_IP:19999

# Secure with firewall
sudo ufw allow from YOUR_HOME_IP to any port 19999

# Or use nginx reverse proxy with auth
```

### Log Monitoring Script
```bash
# Create monitoring script
nano /home/adminuser/scripts/check-security.sh

#!/bin/bash
# Security monitoring script

LOG_FILE="/var/log/security-check.log"

echo "=== Security Check: $(date) ===" >> $LOG_FILE

# Check failed SSH logins
FAILED_SSH=$(grep "Failed password" /var/log/auth.log | tail -20 | wc -l)
echo "Failed SSH attempts (last 20): $FAILED_SSH" >> $LOG_FILE

# Check firewall status
UFW_STATUS=$(sudo ufw status | grep "Status: active" | wc -l)
echo "Firewall active: $UFW_STATUS" >> $LOG_FILE

# Check fail2ban
F2B_STATUS=$(sudo fail2ban-client status | grep "Number of jail" | awk '{print $NF}')
echo "Fail2ban jails active: $F2B_STATUS" >> $LOG_FILE

# Check disk usage
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}')
echo "Root disk usage: $DISK_USAGE" >> $LOG_FILE

# Check for suspicious files in uploads
SUSP_FILES=$(find /var/www/*/wp-content/uploads -name "*.php" 2>/dev/null | wc -l)
echo "PHP files in uploads: $SUSP_FILES" >> $LOG_FILE

echo "" >> $LOG_FILE

# Alert if issues found
if [ $SUSP_FILES -gt 0 ]; then
    echo "WARNING: PHP files found in uploads directory!" | mail -s "Security Alert" admin@example.com
fi

chmod +x /home/adminuser/scripts/check-security.sh

# Run daily
# In crontab:
# 0 8 * * * /home/adminuser/scripts/check-security.sh
```

---

These examples demonstrate real-world scenarios. Always adapt to your specific needs and test in staging first.
