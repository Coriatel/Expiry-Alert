# Hostinger VPS Operations

## Purpose
Safely operate and maintain a Hostinger VPS using AI agents while ensuring compliance with hosting provider Terms of Service, preventing abuse flags, and maintaining security best practices.

## When to Use
- Initial VPS setup and hardening
- Deploying applications to Hostinger VPS
- Responding to malware/abuse flags
- Regular maintenance and updates
- WordPress deployments on Hostinger

## Prerequisites
- Hostinger VPS access (SSH credentials)
- Sudo/root access
- Understanding of Ubuntu/Linux basics
- Hostinger panel access

## Required Inputs
- **VPS IP Address**: Server IP
- **SSH Username**: Non-root user (recommended)
- **SSH Key Path**: Private key location (or password if keys not yet configured)
- **Domain Name**: If applicable
- **Application Type**: WordPress, Node.js, etc.

## Core Principles

### 1. ToS Compliance First
Hostinger enforces strict anti-abuse policies:
- ❌ NO malware distribution
- ❌ NO spam/mass emailing
- ❌ NO open proxies/relays
- ❌ NO brute force/scanning
- ❌ NO compromised/insecure services

**Risk Model**: Servers get flagged for:
- Malware files (backdoors, shells, trojans)
- Exposed admin panels without protection
- Insecure SSH (password auth, root login)
- Vulnerable WordPress plugins
- Leaked credentials/keys in public repos
- Outbound spam/scanning traffic

**Suspension Policy** (paraphrased from provider):
- First offense: Warning + required cleanup
- Second offense: Temporary suspension
- Third offense: May result in permanent termination

### 2. Agent Workflow Safety
When AI operates VPS:
1. **Read before write** - Check current state
2. **Dry-run when possible** - Test commands
3. **Backup before changes** - Create snapshots
4. **Confirmation gates** - Ask human for destructive ops
5. **Document everything** - Log all changes
6. **Audit trail** - Track who/what/when

## Steps

### 1. Initial Connection & Audit
```bash
# Connect with SSH key (recommended)
ssh -i ~/.ssh/hostinger_vps user@IP_ADDRESS

# Or with password (to be disabled later)
ssh user@IP_ADDRESS

# Check system info
uname -a
cat /etc/os-release
df -h
free -m

# Check current users
who
last | head -20

# Check listening services
sudo netstat -tulpn
sudo ss -tulpn
```

### 2. Create Non-Root User (if using root)
⚠️ **CONFIRMATION REQUIRED** if disabling root login

```bash
# Create admin user
sudo adduser adminuser
sudo usermod -aG sudo adminuser

# Setup SSH keys for new user
sudo mkdir -p /home/adminuser/.ssh
sudo cp ~/.ssh/authorized_keys /home/adminuser/.ssh/
sudo chown -R adminuser:adminuser /home/adminuser/.ssh
sudo chmod 700 /home/adminuser/.ssh
sudo chmod 600 /home/adminuser/.ssh/authorized_keys

# Test login as new user before disabling root
ssh -i ~/.ssh/key adminuser@IP_ADDRESS
```

### 3. SSH Hardening
⚠️ **CONFIRMATION REQUIRED** before applying

```bash
# Backup original config
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Recommended changes (ask before applying):
# - Disable password authentication: PasswordAuthentication no
# - Disable root login: PermitRootLogin no
# - Change port (optional): Port 2222
# - Enable key auth only: PubkeyAuthentication yes

# After human confirms, edit:
sudo nano /etc/ssh/sshd_config

# Test config before restarting
sudo sshd -t

# Restart SSH (ensure you have alternate access first!)
sudo systemctl restart sshd
```

### 4. Firewall Setup (ufw)
```bash
# Install ufw if not present
sudo apt update
sudo apt install -y ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (use your port!)
sudo ufw allow 22/tcp
# Or if changed: sudo ufw allow 2222/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable (CONFIRM you have SSH allowed first!)
sudo ufw --force enable

# Check status
sudo ufw status verbose
```

### 5. Fail2Ban Setup
```bash
# Install fail2ban
sudo apt install -y fail2ban

# Create local config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit jail.local
sudo nano /etc/fail2ban/jail.local

# Configure SSH jail:
# [sshd]
# enabled = true
# port = 22
# filter = sshd
# logpath = /var/log/auth.log
# maxretry = 3
# bantime = 3600

# Start and enable
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Check status
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

### 6. System Updates
```bash
# Update package lists
sudo apt update

# Upgrade packages
sudo apt upgrade -y

# Remove unused packages
sudo apt autoremove -y

# Setup unattended upgrades (optional, ask first)
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### 7. Web Stack Security (if applicable)

#### Nginx/Apache
```bash
# Install nginx
sudo apt install -y nginx

# Basic hardening:
# - Hide version numbers
# - Add security headers
# - Rate limiting

# Example nginx config additions:
server_tokens off;
add_header X-Frame-Options "SAMEORIGIN";
add_header X-Content-Type-Options "nosniff";
add_header X-XSS-Protection "1; mode=block";
```

#### Cloudflare (Recommended)
- Setup Cloudflare as reverse proxy/WAF
- Enable "Under Attack" mode if targeted
- Use Cloudflare SSL (Full or Strict)
- Enable rate limiting rules
- Configure firewall rules

### 8. WordPress Security (if applicable)
See `/docs/ops/HOSTINGER_WORDPRESS_HARDENING.md` for full details.

Quick checklist:
- [ ] Use latest WordPress version
- [ ] Minimal, trusted plugins only
- [ ] Auto-updates enabled for core + plugins
- [ ] Strong admin password + 2FA
- [ ] wp-config.php permissions: 440 or 400
- [ ] Disable file editing in admin
- [ ] Regular database backups
- [ ] Security plugin (Wordfence/Sucuri)

### 9. Monitoring Setup
```bash
# Install basic monitoring tools
sudo apt install -y htop iotop nethogs

# Check auth logs regularly
sudo tail -f /var/log/auth.log

# Monitor nginx/apache logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Setup logwatch (optional)
sudo apt install -y logwatch
```

### 10. Backup Strategy
```bash
# Database backup (if using MySQL/PostgreSQL)
# MySQL:
mysqldump -u root -p database_name > backup_$(date +%Y%m%d).sql

# PostgreSQL:
pg_dump -U postgres database_name > backup_$(date +%Y%m%d).sql

# File backup (application files)
tar -czf backup_files_$(date +%Y%m%d).tar.gz /var/www/html

# Download backups offsite
scp backup_*.sql user@backup-server:/backups/
# Or use Hostinger backup panel
```

## Expected Outputs
- [ ] Hardened VPS with SSH keys only
- [ ] Firewall configured and active
- [ ] Fail2ban protecting SSH
- [ ] System fully updated
- [ ] Monitoring tools installed
- [ ] Backup strategy implemented
- [ ] Documentation of changes in `/docs/ops/`

## Validation
```bash
# SSH hardening check
sudo sshd -t
grep -E "PasswordAuthentication|PermitRootLogin" /etc/ssh/sshd_config

# Firewall check
sudo ufw status verbose

# Fail2ban check
sudo fail2ban-client status

# Updates check
sudo apt update && apt list --upgradable

# Services check
sudo systemctl status nginx
sudo systemctl status fail2ban
sudo systemctl status ufw

# Security scan (read-only)
# See /scripts/vps-security-audit.sh
```

## Malware Response (If Flagged)

If Hostinger flags malware:

1. **FREEZE** - Stop making changes
2. **ISOLATE** - Disconnect from network if needed: `sudo ufw deny out`
3. **SNAPSHOT** - Create backup/snapshot via Hostinger panel
4. **COLLECT LOGS**
   ```bash
   sudo tar -czf logs_$(date +%Y%m%d).tar.gz /var/log/
   ```
5. **SCAN**
   ```bash
   # Install ClamAV
   sudo apt install -y clamav clamav-daemon
   sudo freshclam

   # Scan (this takes time)
   sudo clamscan -r --infected --remove=no / > scan_results.txt
   ```
6. **ANALYZE** - Review scan results, check modified files
7. **CLEAN** - Remove malicious files, restore from clean backup
8. **ROTATE CREDENTIALS** - Change all passwords, regenerate SSH keys
9. **IDENTIFY VECTOR** - How did malware get in? Plugin? Weak password?
10. **REDEPLOY** - If severe, consider clean reinstall

See `/docs/ops/HOSTINGER_MALWARE_RESPONSE.md` for detailed playbook.

## What Requires Human Confirmation

⚠️ **ALWAYS ASK** before:
- Disabling password authentication
- Disabling root login
- Changing SSH port
- Modifying firewall rules that might lock you out
- Removing packages
- Wiping/reformatting disk
- Restoring from snapshots
- Blocking entire IP ranges
- Changing DNS settings
- Installing kernel updates (may require reboot)

## Anti-Patterns to Avoid

❌ **DON'T**:
- Run unknown scripts from internet without review
- Disable firewall "temporarily" and forget
- Use weak passwords or shared credentials
- Expose database to internet (bind to 0.0.0.0)
- Run services as root
- Ignore security updates
- Skip backups "just this once"
- Install every plugin/package "just to try"
- Store secrets in public repos
- Assume "it won't happen to me"

✅ **DO**:
- Review scripts before running
- Use SSH keys instead of passwords
- Follow principle of least privilege
- Keep software updated
- Maintain offsite backups
- Document all changes
- Monitor logs regularly
- Test backups (restore drills)
- Use Cloudflare or similar WAF
- Respond quickly to provider notices

## Links to Details
- [Deep Documentation](./details/README.md)
- [Examples](./details/examples.md)
- [Checklist](./details/checklist.md)
- [Anti-Patterns](./details/anti-patterns.md)
- [Hostinger VPS Runbook](/docs/ops/HOSTINGER_VPS_RUNBOOK.md)
- [Security Baseline](/docs/ops/HOSTINGER_SECURITY_BASELINE_UBUNTU.md)
- [Malware Response](/docs/ops/HOSTINGER_MALWARE_RESPONSE.md)
- [WordPress Hardening](/docs/ops/HOSTINGER_WORDPRESS_HARDENING.md)
- [AI Agent Safety](/docs/ops/HOSTINGER_AI_AGENT_SAFETY.md)

## Related Resources
- [Terminal & SSH Policy](/docs/ops/TERMINAL_SSH_POLICY.md)
- [Security & Secrets Rule](../../.cursor/rules/100-security-secrets.md)
- [Hostinger VPS Compliance Rule](../../.cursor/rules/110-hostinger-vps-compliance.md)

---
**Last Updated**: 2025-12-31
**⚠️ IMPORTANT**: This skill enforces defensive security and provider compliance only. No evasion techniques or abuse-enabling content.
