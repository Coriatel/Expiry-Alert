# Hostinger VPS Operations — Checklist

## Initial VPS Setup Checklist

### Pre-Deployment
- [ ] VPS provisioned via Hostinger panel
- [ ] Initial root password received
- [ ] Domain DNS pointed to VPS IP (if applicable)
- [ ] Backup strategy planned
- [ ] Monitoring strategy planned

### First Login & Updates
- [ ] SSH connection successful
- [ ] System info checked (`hostnamectl`, `df -h`, `free -m`)
- [ ] Package lists updated (`apt update`)
- [ ] System upgraded (`apt upgrade -y`)
- [ ] Reboot if kernel updated

### User Management
- [ ] Non-root admin user created
- [ ] Admin user added to sudo group
- [ ] Sudo access verified
- [ ] SSH keys generated (on local machine)
- [ ] SSH keys copied to VPS (`ssh-copy-id`)
- [ ] Key-based login tested

### SSH Hardening
- [ ] SSH config backed up (`/etc/ssh/sshd_config.backup`)
- [ ] Password authentication disabled (`PasswordAuthentication no`)
- [ ] Root login disabled (`PermitRootLogin no`)
- [ ] Public key authentication enabled (`PubkeyAuthentication yes`)
- [ ] SSH port changed (optional, documented if done)
- [ ] SSH config tested (`sudo sshd -t`)
- [ ] SSH service restarted
- [ ] New SSH connection tested (before closing old session)

### Firewall Configuration
- [ ] UFW installed
- [ ] Default policies set (deny incoming, allow outgoing)
- [ ] SSH port allowed
- [ ] HTTP (80) allowed
- [ ] HTTPS (443) allowed
- [ ] Application-specific ports allowed (if needed)
- [ ] Firewall enabled
- [ ] Firewall status verified (`sudo ufw status verbose`)

### Fail2Ban Setup
- [ ] Fail2ban installed
- [ ] Local config created (`jail.local`)
- [ ] SSH jail configured
- [ ] Ban time set (recommended: 3600 seconds)
- [ ] Max retry set (recommended: 3 attempts)
- [ ] Fail2ban started and enabled
- [ ] Fail2ban status checked

### System Security
- [ ] Unattended upgrades configured (optional)
- [ ] Automatic security updates enabled
- [ ] Time zone set correctly
- [ ] NTP time sync verified
- [ ] Unnecessary services disabled
- [ ] Root mail alias set (for system notifications)

---

## Web Application Deployment Checklist (WordPress Example)

### LEMP Stack Installation
- [ ] Nginx installed and running
- [ ] MariaDB/MySQL installed
- [ ] Database secured (`mysql_secure_installation`)
- [ ] PHP and required extensions installed
- [ ] PHP-FPM configured
- [ ] PHP version verified

### Database Setup
- [ ] Database created with UTF8MB4 charset
- [ ] Database user created with strong password
- [ ] Database privileges granted
- [ ] Database credentials tested
- [ ] Database password stored securely

### WordPress Installation
- [ ] Latest WordPress downloaded
- [ ] Files extracted to web root
- [ ] Ownership set to `www-data:www-data`
- [ ] Directory permissions set to 755
- [ ] File permissions set to 644
- [ ] `wp-config.php` created from sample
- [ ] Database credentials added to `wp-config.php`
- [ ] Security keys generated and added
- [ ] `wp-config.php` permissions set to 440 or 400
- [ ] Table prefix changed from `wp_` (security)

### Nginx Configuration
- [ ] Site config file created
- [ ] Server name set correctly
- [ ] Document root configured
- [ ] PHP-FPM configured
- [ ] Security headers added
- [ ] Server tokens hidden
- [ ] Sensitive files blocked (`.git`, `.env`, etc.)
- [ ] PHP execution blocked in uploads directory
- [ ] XML-RPC disabled (if not needed)
- [ ] Config syntax tested (`nginx -t`)
- [ ] Nginx reloaded

### SSL/TLS Setup
- [ ] Certbot installed
- [ ] SSL certificate obtained
- [ ] HTTPS redirect configured
- [ ] Certificate auto-renewal tested
- [ ] Strong SSL configuration (TLS 1.2+)
- [ ] HSTS header added (after testing)

### WordPress Hardening
- [ ] File editing disabled in admin (`DISALLOW_FILE_EDIT`)
- [ ] Default admin username changed
- [ ] Strong admin password set
- [ ] 2FA plugin installed (Two-Factor)
- [ ] Security plugin installed (Wordfence/Sucuri)
- [ ] Backup plugin installed (UpdraftPlus)
- [ ] Auto-updates enabled for core and plugins
- [ ] Unused themes deleted
- [ ] Unused plugins deleted
- [ ] Only essential, trusted plugins installed
- [ ] All plugins updated to latest versions
- [ ] WordPress core updated to latest version

---

## Cloudflare Integration Checklist

### Cloudflare Account Setup
- [ ] Account created at cloudflare.com
- [ ] Site added to Cloudflare
- [ ] DNS records scanned and verified
- [ ] Nameservers updated at domain registrar
- [ ] DNS propagation confirmed

### Cloudflare Configuration
- [ ] Proxy enabled for main domain (orange cloud)
- [ ] SSL/TLS mode set to "Full (strict)"
- [ ] Automatic HTTPS Rewrites enabled
- [ ] Minimum TLS version set to 1.2
- [ ] Edge certificates active
- [ ] Origin certificate created
- [ ] Origin certificate installed on VPS
- [ ] SSL verification successful

### Security Settings
- [ ] Security level set (Medium or High)
- [ ] Bot Fight Mode enabled
- [ ] Browser Integrity Check enabled
- [ ] Challenge passage configured
- [ ] Firewall rules created (rate limiting, geo-blocking)
- [ ] Page rules configured
- [ ] WAF rules reviewed

### Performance Settings
- [ ] Auto Minify enabled (CSS, JS, HTML)
- [ ] Brotli compression enabled
- [ ] Caching level configured
- [ ] Browser cache TTL set
- [ ] Always Online enabled

---

## Security Hardening Checklist

### File System Security
- [ ] Web files owned by `www-data` (or appropriate user)
- [ ] Directories: 755 permissions
- [ ] Files: 644 permissions
- [ ] Sensitive config files: 440 or 400
- [ ] No world-writable directories (except temp, with sticky bit)
- [ ] `.git` directories removed from web root
- [ ] Backup files not in web-accessible locations

### Application Security
- [ ] All software up to date (OS, web server, app, plugins)
- [ ] Debug mode disabled in production
- [ ] Error display disabled (log instead)
- [ ] Sensitive files not web-accessible
- [ ] Admin panels protected (IP whitelist, auth, etc.)
- [ ] CSRF protection enabled
- [ ] XSS protection headers set
- [ ] Content Security Policy configured
- [ ] Rate limiting implemented

### Network Security
- [ ] Only required ports open
- [ ] Database not exposed to internet (bind to 127.0.0.1)
- [ ] Redis/Memcached not exposed (if used)
- [ ] Reverse proxy/WAF in place (Cloudflare)
- [ ] DDoS protection active
- [ ] Geolocation blocking configured (if applicable)

### Monitoring & Logging
- [ ] Auth logs monitored (`/var/log/auth.log`)
- [ ] Web server logs monitored
- [ ] Fail2ban logs reviewed
- [ ] Disk space monitored
- [ ] CPU/memory usage monitored
- [ ] Uptime monitoring configured (external)
- [ ] Log rotation configured
- [ ] Security scan scheduled (ClamAV or similar)

---

## Backup & Disaster Recovery Checklist

### Backup Strategy
- [ ] Backup frequency defined (daily DB, weekly files)
- [ ] Backup retention policy set
- [ ] Database backup script created
- [ ] Files backup script created
- [ ] Backup scripts tested manually
- [ ] Cron jobs scheduled for automated backups
- [ ] Offsite backup configured (remote server or cloud)
- [ ] Backup encryption considered (for sensitive data)

### Backup Verification
- [ ] Backup completion logged
- [ ] Backup size monitored (sudden changes indicate issues)
- [ ] Sample restore tested monthly
- [ ] Restore procedures documented
- [ ] Recovery time objective (RTO) defined
- [ ] Recovery point objective (RPO) defined

### Disaster Recovery
- [ ] VPS snapshot created via Hostinger panel
- [ ] Snapshot schedule configured
- [ ] DR runbook created
- [ ] DR plan tested
- [ ] Critical services identified
- [ ] Service recovery priorities defined

---

## Ongoing Maintenance Checklist

### Daily
- [ ] Check Fail2ban status and bans
- [ ] Review auth.log for suspicious activity
- [ ] Monitor disk space usage
- [ ] Check web server error logs
- [ ] Verify backups completed successfully

### Weekly
- [ ] Review Fail2ban banned IPs and unban false positives
- [ ] Check for WordPress updates (core, plugins, themes)
- [ ] Review system logs for anomalies
- [ ] Check uptime and performance metrics
- [ ] Verify SSL certificate expiry date
- [ ] Test website functionality
- [ ] Review Cloudflare analytics and security events

### Monthly
- [ ] Full system package update (`apt update && apt upgrade`)
- [ ] Review and audit user accounts
- [ ] Audit sudo access logs
- [ ] Test backup restore procedure
- [ ] Review firewall rules
- [ ] Scan for malware (ClamAV)
- [ ] Review and rotate logs
- [ ] Check for abandoned plugins/themes
- [ ] Security audit using automated tools
- [ ] Review and update documentation

### Quarterly
- [ ] Full security audit
- [ ] Password rotation (DB, admin accounts)
- [ ] SSH key rotation (optional but recommended)
- [ ] Review and update security policies
- [ ] Disaster recovery drill
- [ ] Performance optimization review
- [ ] Cost optimization review
- [ ] Capacity planning review

---

## Incident Response Checklist

### When Malware Detected
- [ ] Freeze all changes (stop deployments)
- [ ] Isolate VPS (optional: deny outbound traffic)
- [ ] Create snapshot via Hostinger panel
- [ ] Collect logs (`/var/log/auth.log`, nginx logs, etc.)
- [ ] Save recently modified files list
- [ ] Run malware scan (ClamAV)
- [ ] Identify malicious files
- [ ] Determine entry vector
- [ ] Remove malware
- [ ] Patch vulnerability
- [ ] Rotate all credentials
- [ ] Force user re-authentication
- [ ] Restore clean files from backup (if needed)
- [ ] Apply additional hardening
- [ ] Monitor for reinfection (24-48 hours)
- [ ] Document incident in runbook
- [ ] Respond to Hostinger support ticket
- [ ] Request rescan from provider

### When Performance Degraded
- [ ] Check disk space (`df -h`)
- [ ] Check memory usage (`free -m`)
- [ ] Check CPU usage (`top`, `htop`)
- [ ] Check running processes (`ps auxf`)
- [ ] Check network connections (`netstat -tulpn`)
- [ ] Review web server error logs
- [ ] Review application error logs
- [ ] Check for database slow queries
- [ ] Check for DDoS (Cloudflare analytics)
- [ ] Clear caches if applicable
- [ ] Restart services if needed
- [ ] Scale resources if necessary

### When Locked Out (SSH)
- [ ] Use Hostinger panel VNC/console access
- [ ] Review `/etc/ssh/sshd_config` for errors
- [ ] Check SSH service status
- [ ] Review firewall rules
- [ ] Check fail2ban bans (unban own IP if needed)
- [ ] Verify SSH keys exist and are correct
- [ ] Check disk space (full disk can prevent login)
- [ ] Restore from snapshot if configuration corrupted

---

## Compliance Checklist

### Hostinger ToS Compliance
- [ ] No malware or malicious code hosted
- [ ] No spam or mass email sending
- [ ] No open proxies or relays
- [ ] No port scanning or network attacks
- [ ] No copyright infringement
- [ ] No illegal content
- [ ] Resources used within plan limits
- [ ] Provider notices responded to promptly

### Security Compliance
- [ ] Secrets not exposed in web-accessible files
- [ ] Credentials not committed to public repositories
- [ ] PII/sensitive data encrypted or protected
- [ ] Data retention policies followed
- [ ] Access controls implemented
- [ ] Audit trail maintained
- [ ] Incident response plan in place

---

## Definition of Done

A Hostinger VPS is considered **properly secured** when:

✅ SSH is hardened (keys only, no root, firewall, fail2ban)
✅ All software is up to date
✅ Firewall is configured and active
✅ Web application is hardened (WordPress or equivalent)
✅ SSL/TLS is properly configured
✅ Cloudflare (or equivalent WAF) is active
✅ Backups are automated and tested
✅ Monitoring is in place
✅ Documentation is complete
✅ Incident response procedures are defined
✅ No malware detected
✅ No ToS violations present
✅ Regular maintenance schedule established

---

**Use this checklist for every VPS setup and review it regularly to maintain security posture.**
