# Hostinger VPS Operations — Deep Documentation

## Overview

Operating a Hostinger VPS safely requires balancing automation efficiency with hosting provider compliance. This guide provides comprehensive context for the [hostinger-vps-ops skill](../skill.md).

## Why This Matters

### The Compliance Landscape

Hosting providers like Hostinger maintain strict anti-abuse policies to:
- Protect their infrastructure and reputation
- Comply with legal requirements
- Prevent network abuse (spam, DDoS, phishing)
- Maintain service quality for all customers

**Consequences of non-compliance**:
1. First incident: Warning + mandatory cleanup
2. Second incident: Temporary suspension
3. Third incident: Potential permanent account termination

### Common Abuse Flags

Servers get flagged for:

**Malware-Related**:
- PHP web shells (c99, r57, WSO)
- Backdoor files in WordPress uploads
- Cryptominers
- Botnet command & control scripts
- Trojanized plugins/themes

**Security Issues**:
- Exposed admin panels (phpMyAdmin, cPanel, WordPress /wp-admin without protection)
- Default/weak credentials
- SSH with password auth enabled
- Unpatched software (WordPress, plugins, OS)
- Open proxies or relays

**Network Abuse**:
- Spam email sending (compromised contact forms, mail servers)
- Port scanning/brute force attacks
- DDoS participation

**Data Exposure**:
- Git repos with credentials (.env files in public HTML)
- Database dumps in web-accessible directories
- Leaked API keys in JavaScript files

## Defensive Security Mindset

### What This Skill IS
- ✅ Hardening against compromise
- ✅ Responding to legitimate security incidents
- ✅ Maintaining compliance with provider ToS
- ✅ Protecting your own servers and data
- ✅ Learning from security incidents to prevent recurrence

### What This Skill IS NOT
- ❌ Evading detection or hiding malicious activity
- ❌ Bypassing provider monitoring
- ❌ Enabling abuse or illegal activities
- ❌ Offensive security / penetration testing without authorization
- ❌ "How to avoid getting caught"

## SSH Hardening Deep Dive

### Why SSH Hardening Matters

SSH is the primary attack vector for VPS compromise:
- Bots constantly scan for port 22
- Brute force attacks against common usernames
- Dictionary attacks on weak passwords
- Exploitation of SSH vulnerabilities in old versions

### Key-Based Authentication

**Why**: Passwords can be brute forced. SSH keys use cryptographic key pairs.

**How**:
```bash
# On your local machine, generate key pair
ssh-keygen -t ed25519 -C "hostinger-vps-$(date +%Y%m%d)"
# Saved to: ~/.ssh/id_ed25519 (private) and ~/.ssh/id_ed25519.pub (public)

# Copy public key to server
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@IP_ADDRESS

# Test key login
ssh -i ~/.ssh/id_ed25519 user@IP_ADDRESS

# After confirming key works, disable password auth:
# Edit /etc/ssh/sshd_config:
# PasswordAuthentication no
# PubkeyAuthentication yes
```

**Risk**: If you lose your private key and haven't kept password auth as backup, you'll be locked out. Mitigation: Use Hostinger panel console access.

### Disabling Root Login

**Why**: Attackers always try username "root". Forcing non-standard usernames adds security layer.

**How**:
```bash
# 1. Create non-root sudo user first (critical!)
sudo adduser adminuser
sudo usermod -aG sudo adminuser

# 2. Test sudo access
su - adminuser
sudo whoami  # Should output: root

# 3. Setup SSH keys for new user
sudo mkdir -p /home/adminuser/.ssh
sudo cp ~/.ssh/authorized_keys /home/adminuser/.ssh/
sudo chown -R adminuser:adminuser /home/adminuser/.ssh
sudo chmod 700 /home/adminuser/.ssh
sudo chmod 600 /home/adminuser/.ssh/authorized_keys

# 4. Test login as new user
# (from another terminal)
ssh -i ~/.ssh/key adminuser@IP_ADDRESS

# 5. ONLY AFTER CONFIRMING new user works:
# Edit /etc/ssh/sshd_config:
# PermitRootLogin no

# 6. Restart SSH
sudo systemctl restart sshd
```

**Risk**: If you misconfigure and lock yourself out, use Hostinger panel VNC/console access to recover.

### Changing SSH Port (Optional)

**Pros**:
- Reduces automated scanner noise
- Most bots only scan port 22

**Cons**:
- Security through obscurity (not true security)
- You must remember the port
- Firewall rules must be updated

**How**:
```bash
# Edit /etc/ssh/sshd_config
# Port 2222

# Update firewall BEFORE restarting SSH
sudo ufw allow 2222/tcp
sudo ufw delete allow 22/tcp

# Test config
sudo sshd -t

# Restart SSH
sudo systemctl restart sshd

# Test new port (keep old session open!)
ssh -p 2222 user@IP_ADDRESS
```

## Firewall Strategy (ufw)

### Default Deny Approach

Start restrictive, open only what's needed:

```bash
# Default: block incoming, allow outgoing
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Explicitly allow services:
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3306/tcp from 10.0.0.0/8  # MySQL only from private network

# Enable
sudo ufw enable

# View rules
sudo ufw status numbered

# Delete rule by number
sudo ufw delete 4
```

### Application Profiles

```bash
# List available profiles
sudo ufw app list

# Allow by profile
sudo ufw allow 'Nginx Full'
sudo ufw allow 'OpenSSH'
```

### Rate Limiting

```bash
# Limit SSH connections (max 6 attempts in 30 seconds)
sudo ufw limit 22/tcp

# This creates iptables rules that rate-limit
```

## Fail2Ban Configuration

### How Fail2Ban Works

1. Monitors log files (e.g., `/var/log/auth.log`)
2. Detects patterns (failed login attempts)
3. Bans IPs using firewall (iptables/ufw)
4. Unbans after configurable time

### Configuration

```bash
# Main config: /etc/fail2ban/jail.conf (don't edit)
# Local overrides: /etc/fail2ban/jail.local (edit this)

# Example jail.local:
[DEFAULT]
bantime = 3600        # Ban for 1 hour
findtime = 600        # Window to find failures (10 min)
maxretry = 3          # Max failures before ban

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = 80,443
logpath = /var/log/nginx/error.log

# Restart after changes
sudo systemctl restart fail2ban

# Check banned IPs
sudo fail2ban-client status sshd

# Unban IP
sudo fail2ban-client set sshd unbanip 1.2.3.4
```

## WordPress Security in Depth

### Attack Vectors

1. **Vulnerable Plugins**: #1 compromise method
2. **Weak Admin Passwords**: Brute force attacks
3. **File Upload Vulnerabilities**: Web shells uploaded via forms
4. **SQL Injection**: Through vulnerable plugins/themes
5. **XML-RPC Attacks**: DDoS and brute force via XML-RPC
6. **Outdated Core**: Known exploits

### Hardening Checklist

```bash
# 1. File Permissions
find /var/www/html -type d -exec chmod 755 {} \;
find /var/www/html -type f -exec chmod 644 {} \;
chmod 440 /var/www/html/wp-config.php
chown -R www-data:www-data /var/www/html

# 2. Disable File Editing in Admin
# Add to wp-config.php:
define('DISALLOW_FILE_EDIT', true);

# 3. Security Keys
# Generate new keys: https://api.wordpress.org/secret-key/1.1/salt/
# Replace in wp-config.php

# 4. Database Prefix
# Change from wp_ to something random (wp_abc123_)
# Prevents automated SQL injection

# 5. Hide WordPress Version
# Add to functions.php:
remove_action('wp_head', 'wp_generator');

# 6. Disable XML-RPC (if not needed)
# Add to .htaccess or nginx config:
# <Files xmlrpc.php>
#   Order Deny,Allow
#   Deny from all
# </Files>

# 7. Limit Login Attempts
# Install plugin: Limit Login Attempts Reloaded

# 8. Enable 2FA
# Install plugin: Two-Factor (by Plugin Contributors)

# 9. Security Scanning
# Install: Wordfence or Sucuri Security

# 10. Regular Backups
# Install: UpdraftPlus
# Configure: Daily database, weekly files, offsite storage (Dropbox/Google Drive)
```

### Plugin Hygiene

**Rules**:
- Install only from WordPress.org or trusted sources
- Check "Last Updated" date (avoid abandoned plugins)
- Read reviews and support forum
- Never use nulled/pirated premium plugins (often backdoored)
- Delete unused plugins (don't just deactivate)
- Enable auto-updates for trusted plugins
- Review plugin permissions and access

## Cloudflare Integration

### Why Cloudflare

- Free tier includes DDoS protection and WAF
- Hides origin server IP
- Rate limiting and bot protection
- Caching reduces server load
- SSL/TLS termination

### Setup

1. **Add Site to Cloudflare**:
   - Sign up at cloudflare.com
   - Add your domain
   - Update nameservers at domain registrar

2. **Configure DNS**:
   - Add A record pointing to VPS IP
   - Enable "Proxy" (orange cloud icon)

3. **SSL/TLS Settings**:
   - SSL/TLS mode: "Full (strict)" (requires valid cert on origin)
   - Or "Full" if using self-signed

4. **Firewall Rules**:
   - Create rule to block known bad bots
   - Geographic restrictions if applicable
   - Rate limiting: 10 requests per 10 seconds per IP

5. **Page Rules**:
   - Cache everything: `/*`
   - Always Use HTTPS

6. **Security Settings**:
   - Security Level: Medium or High
   - Challenge Passage: 30 minutes
   - Browser Integrity Check: On

7. **Origin Server**:
   ```bash
   # Install origin certificate on VPS
   # Cloudflare > SSL/TLS > Origin Server > Create Certificate
   # Install cert and key on nginx/apache
   ```

## Monitoring & Logging

### Essential Logs

**Auth Logs** (`/var/log/auth.log`):
```bash
# Watch for SSH login attempts
sudo tail -f /var/log/auth.log | grep sshd

# Failed password attempts
sudo grep "Failed password" /var/log/auth.log | tail -20

# Successful logins
sudo grep "Accepted" /var/log/auth.log | tail -20
```

**Web Server Logs**:
```bash
# Nginx access log
sudo tail -f /var/log/nginx/access.log

# Filter for 4xx/5xx errors
sudo grep " 40[0-9] \| 50[0-9]" /var/log/nginx/access.log

# Top requesting IPs
sudo awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20
```

**System Logs** (`/var/log/syslog`):
```bash
# General system events
sudo tail -f /var/log/syslog

# Kernel messages
dmesg | tail -50
```

### Log Rotation

Ensure logs don't fill disk:
```bash
# Check logrotate config
cat /etc/logrotate.conf
ls /etc/logrotate.d/

# Manually trigger rotation
sudo logrotate -f /etc/logrotate.conf
```

### Automated Monitoring

**Email Alerts** (using logwatch):
```bash
sudo apt install logwatch

# Configure to send daily digest
sudo nano /etc/cron.daily/00logwatch
# Add:
# /usr/sbin/logwatch --output mail --mailto your@email.com --detail high
```

**Resource Monitoring**:
```bash
# CPU, memory, disk usage
htop
iotop   # Disk I/O
nethogs # Network usage by process

# Disk space alerts
df -h | grep -E "([8-9][0-9]|100)%"
```

## Backup Strategy

### The 3-2-1 Rule

- **3** copies of data
- **2** different storage types
- **1** offsite copy

### Implementation

**1. Database Backups**:
```bash
#!/bin/bash
# /home/adminuser/backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/adminuser/backups"
mkdir -p $BACKUP_DIR

# MySQL
mysqldump -u root -p'PASSWORD' --all-databases | gzip > $BACKUP_DIR/mysql_$DATE.sql.gz

# PostgreSQL
sudo -u postgres pg_dumpall | gzip > $BACKUP_DIR/postgres_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Database backup completed: $DATE"
```

**2. File Backups**:
```bash
#!/bin/bash
# Backup web files

DATE=$(date +%Y%m%d)
tar -czf /home/adminuser/backups/web_$DATE.tar.gz /var/www/html

# Sync to remote server or cloud storage
rsync -avz /home/adminuser/backups/ user@backup-server:/backups/hostinger-vps/
```

**3. Automated Scheduling**:
```bash
# Add to crontab
crontab -e

# Daily database backup at 2 AM
0 2 * * * /home/adminuser/backup-db.sh >> /var/log/backup.log 2>&1

# Weekly file backup on Sundays at 3 AM
0 3 * * 0 /home/adminuser/backup-files.sh >> /var/log/backup.log 2>&1
```

**4. Test Restores**:
```bash
# Monthly restore drill (mark calendar)
# Restore to test/staging environment
gunzip < mysql_20250131.sql.gz | mysql -u root -p

# Verify data integrity
```

## Incident Response

### Malware Detection

**Signs of Compromise**:
- Unexpected CPU/network usage
- Unknown processes running
- Modified system files
- Suspicious cron jobs
- Unexpected outbound connections
- Provider malware scan results

**Triage Steps**:

1. **Isolate** (if severe):
   ```bash
   # Block outbound traffic
   sudo ufw default deny outgoing
   sudo ufw reload
   ```

2. **Snapshot**:
   - Create snapshot via Hostinger panel
   - Preserves state for forensics

3. **Collect Evidence**:
   ```bash
   # Save logs
   sudo tar -czf /tmp/logs_$(date +%Y%m%d).tar.gz /var/log/

   # List recently modified files
   find / -type f -mtime -7 -ls > /tmp/recent_files.txt 2>/dev/null

   # Active connections
   sudo netstat -tulpn > /tmp/connections.txt
   ss -tulpn > /tmp/sockets.txt

   # Running processes
   ps auxf > /tmp/processes.txt

   # Cron jobs
   crontab -l > /tmp/crontab.txt
   sudo crontab -l >> /tmp/crontab.txt
   ```

4. **Scan**:
   ```bash
   # Install ClamAV
   sudo apt update
   sudo apt install -y clamav clamav-daemon

   # Update definitions
   sudo systemctl stop clamav-freshclam
   sudo freshclam
   sudo systemctl start clamav-freshclam

   # Scan (slow, run in screen/tmux)
   sudo clamscan -r -i --remove=no / > /tmp/clamscan_$(date +%Y%m%d).log 2>&1
   ```

5. **Analyze**:
   ```bash
   # Review scan results
   grep "FOUND" /tmp/clamscan_*.log

   # Check modified WordPress files
   cd /var/www/html
   wp core verify-checksums  # Requires WP-CLI

   # Check for common backdoors
   find . -name "*.php" -type f | xargs grep -l "eval(base64_decode" | head -20
   find . -name "*.php" -type f | xargs grep -l "system(\$_" | head -20
   ```

6. **Remediate**:
   ```bash
   # Remove identified malware
   sudo rm /path/to/malicious/file.php

   # Restore clean files from backup
   tar -xzf backup_clean.tar.gz -C /var/www/html --overwrite

   # Update all software
   sudo apt update && sudo apt upgrade -y
   cd /var/www/html && wp core update && wp plugin update --all
   ```

7. **Rotate Credentials**:
   ```bash
   # Change all passwords
   passwd adminuser

   # Regenerate SSH keys
   ssh-keygen -t ed25519 -C "new-key-$(date +%Y%m%d)"

   # Update database passwords
   # Update WordPress salts in wp-config.php
   # Invalidate all user sessions
   ```

8. **Identify Attack Vector**:
   - Review logs for initial compromise time
   - Check for vulnerable plugins in that timeframe
   - Review failed login attempts
   - Check for exposed files (git repos, backups)

9. **Harden**:
   - Apply all security measures from this guide
   - Fix the identified vulnerability
   - Implement additional monitoring

10. **Communicate**:
    - Respond to Hostinger support ticket
    - Document incident and resolution
    - Update runbooks with lessons learned

## See Also

- [Malware Response Playbook](/docs/ops/HOSTINGER_MALWARE_RESPONSE.md)
- [Security Baseline](/docs/ops/HOSTINGER_SECURITY_BASELINE_UBUNTU.md)
- [WordPress Hardening](/docs/ops/HOSTINGER_WORDPRESS_HARDENING.md)
- [AI Agent Safety](/docs/ops/HOSTINGER_AI_AGENT_SAFETY.md)

---

**Remember**: Defensive security only. Compliance first. Document everything.
