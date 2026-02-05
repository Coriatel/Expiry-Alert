# Hostinger VPS Operations — Anti-Patterns

## ❌ Security Anti-Patterns

### Weak SSH Configuration

❌ **DON'T**: Leave password authentication enabled
```bash
# /etc/ssh/sshd_config
PasswordAuthentication yes  # ❌ Vulnerable to brute force
```

✅ **DO**: Use SSH keys only
```bash
# /etc/ssh/sshd_config
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin no
```

---

❌ **DON'T**: Use weak or default passwords
```bash
# Common weak passwords:
# password123
# admin
# root
# hostname
# company name
```

✅ **DO**: Use strong, unique passwords
```bash
# Generate strong password:
openssl rand -base64 32

# Or use password manager
# Minimum: 16 characters, mixed case, numbers, symbols
```

---

❌ **DON'T**: Disable firewall "temporarily"
```bash
sudo ufw disable  # ❌ Then forget to re-enable
```

✅ **DO**: Add specific rules, keep firewall enabled
```bash
# If you need to allow something:
sudo ufw allow 8080/tcp  # ✅ Specific rule
# Firewall stays enabled
```

---

### Exposed Services

❌ **DON'T**: Bind database to all interfaces
```bash
# /etc/mysql/my.cnf
bind-address = 0.0.0.0  # ❌ Exposed to internet
```

✅ **DO**: Bind to localhost only
```bash
# /etc/mysql/my.cnf
bind-address = 127.0.0.1  # ✅ Local only
```

---

❌ **DON'T**: Leave default admin panels exposed
```
https://yoursite.com/phpmyadmin  # ❌ No protection
https://yoursite.com/wp-admin    # ❌ No rate limiting
```

✅ **DO**: Protect admin access
```nginx
# Nginx config for phpMyAdmin
location /phpmyadmin {
    allow 1.2.3.4;  # Your IP
    deny all;
    # ... rest of config
}

# Or use Cloudflare Access / VPN
```

---

❌ **DON'T**: Run services as root
```bash
# Running nginx as root
User root  # ❌ Security risk
```

✅ **DO**: Use dedicated service users
```bash
# Running nginx as www-data
User www-data  # ✅ Least privilege
```

---

## ❌ WordPress Anti-Patterns

### Plugin Mismanagement

❌ **DON'T**: Install every plugin you find
```bash
# 50+ plugins installed
# Many unused, outdated, or abandoned
```

✅ **DO**: Minimal, essential plugins only
```bash
# Core plugins only:
# - Security (Wordfence)
# - Backups (UpdraftPlus)
# - Caching (if not using Cloudflare)
# - SEO (if needed)
# Total: < 10 plugins ideally
```

---

❌ **DON'T**: Use nulled/pirated plugins
```bash
# Downloaded from:
# - warez-plugins.com
# - cracked-themes.net
# ❌ Almost always contain backdoors
```

✅ **DO**: Use official sources only
```bash
# Download from:
# - wordpress.org ✅
# - Official developer site ✅
# - Paid: envato, codecanyon (with care) ✅
```

---

❌ **DON'T**: Ignore update notifications
```
WordPress 6.0 available → ignored for months
Plugin updates available (27) → ignored
```

✅ **DO**: Update regularly
```bash
# Check for updates weekly
sudo -u www-data wp core update
sudo -u www-data wp plugin update --all
sudo -u www-data wp theme update --all
```

---

❌ **DON'T**: Allow file uploads to execute PHP
```nginx
# No protection in uploads directory
# Attacker uploads shell.php → can execute
```

✅ **DO**: Block PHP execution in uploads
```nginx
location ~* /wp-content/uploads/.*\.php$ {
    deny all;
}
```

---

### Weak Access Controls

❌ **DON'T**: Use "admin" username
```bash
# Username: admin ❌ First thing attackers try
```

✅ **DO**: Use unique username
```bash
# Create new admin:
sudo -u www-data wp user create secureadmin admin@example.com \
  --role=administrator --user_pass="strong_password"

# Delete default admin:
sudo -u www-data wp user delete admin --yes
```

---

❌ **DON'T**: Disable important security features
```php
// wp-config.php
define('DISALLOW_FILE_MODS', false); // ❌ Allows file editing
```

✅ **DO**: Lock down file modifications
```php
// wp-config.php
define('DISALLOW_FILE_EDIT', true);  // ✅ Disable file editing
define('DISALLOW_FILE_MODS', true);  // ✅ Disable all file mods
```

---

## ❌ Backup Anti-Patterns

### Inadequate Backups

❌ **DON'T**: Store backups only on same server
```bash
# Backups in /var/backups on same VPS
# If server compromised/dies → all backups lost
```

✅ **DO**: Offsite backups required
```bash
# 3-2-1 backup rule:
# - 3 copies of data
# - 2 different media types
# - 1 offsite copy

# Sync to:
# - Remote server (rsync)
# - Cloud storage (S3, Google Drive)
# - Local machine (automated download)
```

---

❌ **DON'T**: Never test restores
```bash
# Backups running for 6 months
# Never tested a restore
# When disaster strikes → backups are corrupt ❌
```

✅ **DO**: Test restores monthly
```bash
# Monthly drill:
# 1. Create test environment
# 2. Restore from latest backup
# 3. Verify data integrity
# 4. Document process and time taken
```

---

❌ **DON'T**: Backup files without database (or vice versa)
```bash
# Only backing up files
# Database changes daily but not backed up ❌
```

✅ **DO**: Backup both files and database
```bash
# Backup frequency:
# Database: Daily (small, changes frequently)
# Files: Weekly (large, changes less)
# Both: Before major changes
```

---

## ❌ Monitoring Anti-Patterns

### No Monitoring

❌ **DON'T**: "Set it and forget it"
```bash
# VPS set up in January
# Never checked again
# Compromised in March, not noticed until June ❌
```

✅ **DO**: Active monitoring
```bash
# Monitor:
# - Failed SSH attempts (daily)
# - Disk space (daily)
# - Web server errors (daily)
# - Uptime (external service)
# - SSL expiry (monthly)
# - Security scans (weekly)
```

---

❌ **DON'T**: Ignore log files
```bash
# Logs never reviewed
# /var/log/auth.log shows 10,000 failed SSH attempts ❌
```

✅ **DO**: Review logs regularly
```bash
# Daily quick checks:
sudo tail -100 /var/log/auth.log | grep "Failed password"
sudo tail -100 /var/log/nginx/error.log

# Weekly deep review:
sudo fail2ban-client status sshd
sudo grep -i "error\|warning" /var/log/syslog | tail -50
```

---

## ❌ Update Anti-Patterns

### Postponing Updates

❌ **DON'T**: "If it ain't broke, don't fix it"
```bash
# Running Ubuntu 18.04 in 2025 ❌
# WordPress 5.0 because "newer versions might break it" ❌
# Plugins from 2019 still running ❌
```

✅ **DO**: Stay current with patches
```bash
# Monthly update schedule:
sudo apt update && sudo apt upgrade -y

# Test updates in staging first (if critical site)
# But don't delay security patches
```

---

❌ **DON'T**: Automatic updates without monitoring
```bash
# Enabled unattended-upgrades
# Never checks what was updated
# One day site breaks, no idea why ❌
```

✅ **DO**: Monitor automatic updates
```bash
# Check what was updated:
cat /var/log/unattended-upgrades/unattended-upgrades.log

# Set up email notifications:
# In /etc/apt/apt.conf.d/50unattended-upgrades:
# Unattended-Upgrade::Mail "admin@example.com";
```

---

## ❌ Incident Response Anti-Patterns

### Panic and Delete

❌ **DON'T**: Immediately delete everything
```bash
# Hostinger: "Malware detected"
# You: sudo rm -rf /var/www/* ❌
# Problem: Don't know HOW malware got there
# Result: Reinfection in 2 days
```

✅ **DO**: Investigate, then clean
```bash
# 1. Create snapshot (preserve evidence)
# 2. Collect logs
# 3. Identify entry point
# 4. Remove malware
# 5. Patch vulnerability
# 6. Monitor for recurrence
```

---

❌ **DON'T**: Ignore provider warnings
```bash
# Email from Hostinger: "Malware detected, action required"
# You: "Probably false positive" → ignored
# Result: Suspended ❌
```

✅ **DO**: Respond promptly
```bash
# 1. Acknowledge receipt (reply to ticket)
# 2. Begin investigation immediately
# 3. Provide status updates
# 4. Complete cleanup
# 5. Request rescan
# 6. Document for next time
```

---

❌ **DON'T**: Reinstall without finding root cause
```bash
# Server compromised
# "Let's just reinstall and restore from backup"
# Backup contains compromised plugin
# Reinfected immediately ❌
```

✅ **DO**: Identify vulnerability first
```bash
# 1. Find how attacker got in
# 2. Fix that vulnerability
# 3. THEN restore clean backup
# 4. Apply hardening
# 5. Monitor closely
```

---

## ❌ Credential Management Anti-Patterns

### Reusing Passwords

❌ **DON'T**: Use same password everywhere
```bash
# SSH password: MyPassword123
# MySQL root: MyPassword123
# WordPress admin: MyPassword123
# One breach → total compromise ❌
```

✅ **DO**: Unique passwords for everything
```bash
# Use password manager:
# - SSH: unique key pair
# - MySQL: unique 32-char password
# - WordPress: unique 32-char password
# - Hostinger panel: unique password + 2FA
```

---

❌ **DON'T**: Store credentials in code
```javascript
// config.js (in git repo) ❌
const DB_PASSWORD = 'secretpassword123';
const API_KEY = 'sk_live_abc123xyz';
```

✅ **DO**: Use environment variables
```javascript
// config.js
const DB_PASSWORD = process.env.DB_PASSWORD;
const API_KEY = process.env.API_KEY;

// .env file (not in git)
DB_PASSWORD=actual_password_here
API_KEY=actual_key_here

// .gitignore
.env
```

---

❌ **DON'T**: Commit secrets to Git
```bash
# .env file committed to public GitHub repo
# Within hours: cryptominers running on your VPS ❌
```

✅ **DO**: Use .gitignore and scan commits
```bash
# .gitignore
.env
.env.*
config/secrets.php
wp-config.php

# Scan for secrets before committing:
git secrets --scan
# Or use pre-commit hooks
```

---

## ❌ Resource Management Anti-Patterns

### Ignoring Resource Limits

❌ **DON'T**: Ignore disk space warnings
```bash
# Disk at 95% → ignored
# Logs fill remaining 5%
# Server crashes, can't even SSH in ❌
```

✅ **DO**: Proactive space management
```bash
# Monitor:
df -h | grep -E "([8-9][0-9]|100)%"

# Clean old logs:
sudo journalctl --vacuum-time=7d

# Rotate logs properly:
# Check /etc/logrotate.d/

# Set up alerts:
# Alert when disk > 80%
```

---

❌ **DON'T**: Run resource-intensive tasks without limits
```bash
# Running ClamAV full scan during peak hours
# Server becomes unresponsive
# Customers complain ❌
```

✅ **DO**: Schedule heavy tasks in off-hours
```bash
# Crontab:
# Run malware scan at 3 AM
0 3 * * 0 /usr/bin/clamscan -r / > /var/log/clamscan.log 2>&1

# Use nice/ionice to limit impact:
nice -n 19 ionice -c3 clamscan -r /
```

---

## ❌ Documentation Anti-Patterns

### No Documentation

❌ **DON'T**: Keep everything in your head
```bash
# No documentation of:
# - SSH port (if changed)
# - Firewall rules
# - Database passwords
# - Backup procedures
# - Incident response steps
# You get sick → team can't manage server ❌
```

✅ **DO**: Document everything
```bash
# Create runbook:
# /home/adminuser/docs/runbook.md

# Include:
# - All configuration changes
# - Access credentials (encrypted)
# - Procedures for common tasks
# - Incident response playbook
# - Escalation contacts
```

---

❌ **DON'T**: Make changes without logging
```bash
# Changed nginx config last month
# Now site is broken
# No record of what was changed ❌
```

✅ **DO**: Log all changes
```bash
# Keep change log:
echo "$(date): Modified nginx config - added rate limiting" >> /home/adminuser/changelog.txt

# Or use version control:
cd /etc/nginx
sudo git add .
sudo git commit -m "Add rate limiting to site config"
```

---

## ❌ Compliance Anti-Patterns

### Ignoring ToS

❌ **DON'T**: "They won't notice"
```bash
# Running open proxy on VPS
# "Just for personal use, won't get caught"
# Suspended ❌
```

✅ **DO**: Follow provider ToS strictly
```bash
# Read and understand ToS
# Prohibited on Hostinger:
# - Malware
# - Spam
# - Open proxies/VPNs (without authorization)
# - Port scanning
# - Resource abuse
# When in doubt, ask support
```

---

❌ **DON'T**: Delay security fixes
```bash
# Hostinger: "Fix this vulnerability within 24 hours"
# You: "I'll get to it next week"
# Result: Suspended ❌
```

✅ **DO**: Prioritize security compliance
```bash
# Provider notice → drop everything
# Fix within deadline
# Document fix
# Request verification
# Update procedures to prevent recurrence
```

---

## Remember: Defense in Depth

No single security measure is perfect. Layer multiple defenses:

1. ✅ SSH keys (not passwords)
2. ✅ Firewall (ufw)
3. ✅ Fail2ban (intrusion prevention)
4. ✅ Updates (patch vulnerabilities)
5. ✅ Cloudflare (WAF/DDoS protection)
6. ✅ Hardening (minimal attack surface)
7. ✅ Monitoring (detect issues early)
8. ✅ Backups (recover from disaster)
9. ✅ Documentation (consistency and knowledge transfer)
10. ✅ Compliance (avoid suspension)

**Skipping even one layer significantly increases risk.**
