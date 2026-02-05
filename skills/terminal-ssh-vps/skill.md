# Terminal & SSH VPS Operations

## Purpose
Safely execute terminal commands and SSH operations on VPS servers (including Hostinger and other providers) using AI agents, with proper safety gates, anti-abuse guardrails, and compliance awareness.

## When to Use
- Deploying applications to VPS
- Server maintenance and updates
- Database operations
- File management on remote servers
- Troubleshooting and diagnostics
- Responding to security incidents

## Prerequisites
- SSH access to VPS (credentials or keys)
- Sudo/root access (when needed)
- Understanding of Linux commands
- Backup of current state

## Required Inputs
- **Server IP/Hostname**: Target server address
- **SSH Username**: User to connect as
- **SSH Key Path**: Location of private key (or password)
- **Command Context**: What you're trying to achieve
- **Risk Assessment**: Is this operation reversible?

## Core Safety Principles

### 1. Read Before Write
```bash
# ✅ Always check current state first
cat /etc/ssh/sshd_config  # Read current config
# Then make changes

# ❌ Don't blind-write
sed -i 's/old/new/' /etc/ssh/sshd_config  # What if file is different?
```

### 2. Backup Before Modify
```bash
# ✅ Create backup with timestamp
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d)

# Then modify
sudo nano /etc/nginx/nginx.conf
```

### 3. Test Before Apply
```bash
# ✅ Test configuration before restarting
sudo nginx -t              # Test nginx config
sudo sshd -t               # Test SSH config
sudo systemctl --dry-run reload nginx  # Dry run

# Then apply if test passes
sudo systemctl reload nginx
```

### 4. Confirmation Gates
⚠️ **ALWAYS ask human before**:
- Deleting files/directories (especially `rm -rf`)
- Stopping production services
- Modifying SSH config (could lock out)
- Changing firewall rules
- Dropping databases or tables
- Force operations (`--force`, `-f`)
- Irreversible actions

## Anti-Abuse Guardrails (Hosting Provider Compliance)

### Prohibited Actions

❌ **NEVER**:
- Port scan other servers: `nmap`, `masscan`
- Brute force attacks: `hydra`, `medusa`
- Send spam or mass email
- Run unknown scripts from internet without review
- Create open proxies or relays
- Deploy malware, cryptominers, or botnets
- DDoS or flood attacks
- Bypass provider monitoring or detection

### Compliance Requirements

Hosting providers (Hostinger, DigitalOcean, etc.) enforce strict policies:
- No network abuse
- No malicious software
- No copyright infringement
- No spam origination
- Prompt response to abuse complaints
- Resource usage within plan limits

**Suspension Risk**: Violations can result in:
1. Warning + mandatory cleanup
2. Temporary suspension
3. Permanent account termination

### Defensive Security Only

This skill teaches:
- ✅ Hardening your own servers
- ✅ Responding to security incidents
- ✅ Protecting against compromise
- ✅ Compliance with provider ToS

This skill does NOT teach:
- ❌ Evasion or hiding malicious activity
- ❌ Bypassing security controls
- ❌ Offensive security techniques
- ❌ Penetration testing without authorization

## Steps

### 1. Establish SSH Connection
```bash
# Connect with SSH key (recommended)
ssh -i ~/.ssh/your_key user@server_ip

# Or with password (will prompt)
ssh user@server_ip

# Verify connection
whoami
pwd
hostname
```

### 2. Assess Current State
```bash
# System info
uname -a
cat /etc/os-release
uptime

# Disk space
df -h

# Memory
free -m

# Running processes
ps auxf | head -30

# Listening ports
sudo netstat -tulpn
# or
sudo ss -tulpn

# Check who's logged in
who
w
last | head -20
```

### 3. Execute Command (with safety checks)

**For READ operations** (safe):
```bash
# View files
cat /path/to/file
less /path/to/file
head -20 /path/to/file

# List files
ls -la /path/

# Search
grep "pattern" /path/to/file
find /path -name "*.log"
```

**For WRITE operations** (require care):
```bash
# Create directory
mkdir -p /path/to/newdir

# Create file
touch /path/to/newfile

# Edit file (backup first!)
sudo cp /etc/config.conf /etc/config.conf.backup
sudo nano /etc/config.conf

# Copy files
cp source destination

# Move files (confirm important files first)
mv source destination
```

**For DESTRUCTIVE operations** (require confirmation):
```bash
# ⚠️ ASK BEFORE RUNNING

# Delete files
rm /path/to/file

# Delete directories
rm -r /path/to/directory

# Force delete (VERY DANGEROUS)
rm -rf /path/to/directory  # ⚠️⚠️⚠️ ALWAYS CONFIRM

# Stop services
sudo systemctl stop servicename

# Restart services
sudo systemctl restart servicename

# Database operations
DROP DATABASE dbname;        # ⚠️ CONFIRM
TRUNCATE TABLE tablename;    # ⚠️ CONFIRM
```

### 4. Validate Results
```bash
# After making changes, verify:

# Check service status
sudo systemctl status servicename

# Test configuration
sudo nginx -t
sudo sshd -t

# Check logs for errors
sudo tail -50 /var/log/syslog
sudo journalctl -xe

# Verify file changes
cat /path/to/modified/file | grep "expected_content"
```

### 5. Document Changes
```bash
# Log what was changed
echo "$(date): Modified /etc/nginx/nginx.conf - added rate limiting" \
  >> /home/user/changelog.txt

# Or use git for config tracking
cd /etc/nginx
sudo git add nginx.conf
sudo git commit -m "Add rate limiting to main config"
```

## Incident Response Mode

### When Provider Flags Malware or Abuse

**FREEZE all changes immediately**

1. **Assess Severity**
   ```bash
   # Check provider notice for:
   # - What was detected
   # - Where it's located
   # - Deadline for cleanup
   ```

2. **Preserve Evidence**
   ```bash
   # Create snapshot via provider panel
   # Take logs snapshot
   sudo tar -czf /tmp/logs_$(date +%Y%m%d).tar.gz /var/log/

   # List recently modified files
   find / -type f -mtime -7 -ls > /tmp/recent_files.txt 2>/dev/null
   ```

3. **Isolate (if needed)**
   ```bash
   # Only if actively compromised and spreading:
   # ⚠️ This blocks ALL outbound traffic - CONFIRM FIRST
   sudo ufw default deny outgoing
   sudo ufw reload
   ```

4. **Investigate**
   ```bash
   # View suspicious file (don't execute!)
   cat /path/to/suspicious/file.php

   # Check file metadata
   stat /path/to/suspicious/file.php

   # Find similar files
   find /var/www -name "*.php" | xargs grep -l "eval(base64"
   ```

5. **Clean**
   ```bash
   # Remove confirmed malware
   sudo rm /path/to/malicious/file

   # Restore clean files from backup
   tar -xzf backup.tar.gz -C /restore/path
   ```

6. **Patch Vulnerability**
   ```bash
   # Update all software
   sudo apt update && sudo apt upgrade -y

   # Update WordPress/apps
   sudo -u www-data wp core update
   sudo -u www-data wp plugin update --all
   ```

7. **Rotate Credentials**
   ```bash
   # Change all passwords
   passwd username

   # Regenerate SSH keys
   ssh-keygen -t ed25519 -C "new-key-$(date +%Y%m%d)"

   # Update database passwords
   # Update app config files
   ```

8. **Communicate with Provider**
   - Respond to support ticket promptly
   - Explain actions taken
   - Request rescan/verification
   - Provide timeline for full remediation

See: `/docs/ops/HOSTINGER_MALWARE_RESPONSE.md` for detailed playbook

## Command Safety Reference

### Always Safe (No Confirmation Needed)
```bash
ls, cat, less, head, tail, grep, find
pwd, whoami, hostname, date
ps, top, htop, df, free
git status, git log, git diff
systemctl status
```

### Usually Safe (Verify First)
```bash
mkdir, touch, cp
echo "text" > file.txt
apt update (just updates package list)
git add, git commit
```

### Requires Confirmation
```bash
rm, rm -r, rm -rf
mv (when overwriting)
sudo systemctl stop/restart
sudo systemctl reload (for critical services)
sudo ufw disable
apt upgrade, apt install
git push --force
DROP DATABASE, TRUNCATE TABLE
```

### Never Run Without Review
```bash
# Unknown scripts from internet
curl https://site.com/script.sh | bash  # ❌ NEVER

# Better:
curl https://site.com/script.sh > /tmp/script.sh
cat /tmp/script.sh  # Review first
# If safe:
bash /tmp/script.sh

# Commands with variables from untrusted sources
rm -rf $SOME_VAR  # What if $SOME_VAR is empty? → rm -rf /

# Mass operations without testing
find / -name "*.log" -delete  # Test with -ls first!
```

## Secret Handling

### Never Echo Secrets
```bash
# ❌ DON'T
echo "DATABASE_PASSWORD=secretpass"
cat .env
mysql -u root -p'secretpassword'  # Visible in process list

# ✅ DO
# Use environment variables
export DATABASE_PASSWORD="secretpass"
mysql -u root -p  # Will prompt for password

# Store in files with proper permissions
chmod 600 /path/to/.env
```

### Never Commit Secrets
```bash
# Check before committing
git diff

# Scan for secrets
git secrets --scan
git diff --cached | grep -i "password\|secret\|key"

# Use .gitignore
echo ".env" >> .gitignore
echo "config/secrets.php" >> .gitignore
```

## Logging Without Secrets

```bash
# ❌ DON'T log full commands with secrets
echo "Running: mysql -u root -p'secretpass'" >> /var/log/commands.log

# ✅ DO redact secrets
echo "Running: mysql -u root -p'[REDACTED]'" >> /var/log/commands.log

# ✅ DO log actions without exposing secrets
echo "$(date): Database backup completed" >> /var/log/backup.log
```

## Change Management

### Before Making Changes
1. Read current configuration
2. Understand impact of change
3. Create backup
4. Test in staging (if available)
5. Document planned change
6. Have rollback plan

### After Making Changes
1. Test the change
2. Verify service still works
3. Check error logs
4. Document what was changed
5. Commit to version control (if applicable)
6. Monitor for issues

## Expected Outputs
- [ ] Commands executed safely
- [ ] Changes validated
- [ ] Logs checked for errors
- [ ] Documentation updated
- [ ] No secrets exposed
- [ ] Service remains operational

## Validation Checklist
- [ ] Command executed successfully (check exit code: `echo $?`)
- [ ] Service still running: `systemctl status servicename`
- [ ] No errors in logs: `journalctl -xe | tail -50`
- [ ] Expected files created/modified
- [ ] Permissions correct: `ls -la /path`
- [ ] Backup created before destructive operations

## Links to Details
- [Deep Documentation](./details/README.md)
- [Examples](./details/examples.md)
- [Checklist](./details/checklist.md)
- [Anti-Patterns](./details/anti-patterns.md)

## Related Resources
- [Terminal & SSH Policy](/docs/ops/TERMINAL_SSH_POLICY.md)
- [Hostinger VPS Operations](/skills/hostinger-vps-ops/skill.md)
- [Hostinger Compliance Rule](../../.cursor/rules/110-hostinger-vps-compliance.md)
- [Security & Secrets Rule](../../.cursor/rules/100-security-secrets.md)
- [Hostinger AI Agent Safety](/docs/ops/HOSTINGER_AI_AGENT_SAFETY.md)

---
**Last Updated**: 2025-12-31
**⚠️ IMPORTANT**: This skill enforces defensive operations and provider compliance. No evasion or abuse-enabling content.
