# Terminal & SSH Policy — Safe Automation

## Purpose

This document defines safe operating procedures for terminal commands, SSH operations, and VPS management when working autonomously or with AI assistants.

## Execution Policy

**Run commands without asking for confirmation** except for:
- Commands that delete data permanently (rm -rf, DROP DATABASE, TRUNCATE)
- Commands that modify critical system files (/etc/passwd, /etc/shadow, /etc/sudoers)
- Commands that could cause service outages in production
- Commands that expose sensitive credentials
- Irreversible operations (force push, database drops, hard resets)
- System modifications (reboot, shutdown, ufw disable)

For all other commands: **Execute immediately without prompting**.

## Safe Operations (No Confirmation Needed)

### Read Operations
```bash
ls, cat, head, tail, less, pwd, whoami
df -h, free -m, ps aux, top, htop
git status, git log, git diff
docker ps, docker images, docker logs
systemctl status <service>
npm list, npm outdated
```

### Safe Write Operations
```bash
mkdir, touch, cp <file> <backup>
git add, git commit, git push (to feature branches)
npm install (local packages)
```

## Prohibited Without Confirmation

### Destructive Operations
- `rm -rf`, `rm -r`, `rmdir` (recursive/bulk)
- `DROP DATABASE`, `DROP TABLE`, `TRUNCATE`
- `docker system prune`, `docker volume prune`
- `git push --force`, `git reset --hard`

### System Changes
- `sudo` commands that modify system config
- `chmod`, `chown` on system files
- `systemctl stop/restart <production-service>`
- `reboot`, `shutdown`, `ufw disable`

## SSH Usage Guidelines

### Connection
```bash
# ✅ DO: Use SSH keys (not passwords when possible)
ssh -i ~/.ssh/id_rsa user@host

# ✅ DO: Verify host fingerprint on first connection
# (System will prompt - user should confirm)

# ❌ DON'T: Accept unknown hosts blindly in scripts
# StrictHostKeyChecking=no  # Avoid in production
```

### File Transfer
```bash
# ✅ DO: Use scp or rsync for file transfer
scp file.txt user@host:/path/to/destination
rsync -avz local/ user@host:/remote/

# ✅ DO: Verify paths before transfer
ls -la /path/to/source
ssh user@host "ls -la /path/to/destination"
```

### Remote Commands
```bash
# ✅ DO: Use quotes for remote commands
ssh user@host "systemctl status nginx"

# ✅ DO: Check before executing destructive commands
ssh user@host "ls -la /path/to/delete"  # Verify first
# Then ask for confirmation before:
ssh user@host "rm -rf /path/to/delete"
```

## Environment Variables

### Loading Secrets
```bash
# ✅ DO: Load from .env file
source .env
# or
export $(cat .env | xargs)

# ✅ DO: Verify variables are set (without printing)
if [ -z "$API_KEY" ]; then
  echo "ERROR: API_KEY not set"
  exit 1
fi

# ❌ DON'T: Print environment variables
env | grep API  # NO! May expose secrets
```

### Passing to Commands
```bash
# ✅ DO: Use environment variables
DATABASE_URL=$DATABASE_URL npm run migrate

# ❌ DON'T: Hardcode
DATABASE_URL="postgresql://user:pass@host/db" npm run migrate
```

## Git Operations

### Safe Operations
```bash
git clone <repo>
git pull
git fetch
git status
git log
git diff
git add <files>
git commit -m "message"
git push  # to feature branch
```

### Requires Confirmation
```bash
git push --force
git push -f
git reset --hard
git clean -fd
git push origin --delete <branch>
```

### Secrets in Git
```bash
# ✅ DO: Check .gitignore before committing
cat .gitignore | grep .env

# ✅ DO: Verify no secrets before pushing
git diff --cached  # Review staged changes

# ❌ DON'T: Commit .env files
git add .env  # NO!
```

## Package Management

### Installing Dependencies
```bash
# ✅ DO: Install from package.json
npm install
npm ci  # Clean install (preferred in CI)

# ✅ DO: Install specific package
npm install express

# ⚠️ CAUTION: Global installs (may require sudo)
npm install -g <package>  # Ask before global install
```

### Updating Dependencies
```bash
# ✅ DO: Check outdated packages first
npm outdated

# ⚠️ CAUTION: Major updates
npm update  # Ask before updating all
npm install <package>@latest  # Ask for major versions
```

## Docker Operations

### Safe Operations
```bash
docker ps
docker images
docker logs <container>
docker inspect <container>
docker-compose up -d  # Start services
docker-compose logs
```

### Requires Confirmation
```bash
docker stop <container>
docker rm <container>
docker rmi <image>
docker system prune  # Deletes unused data
docker volume prune  # Deletes unused volumes
docker-compose down  # Stops and removes containers
docker-compose down -v  # Also removes volumes
```

## Database Operations

### Safe Operations
```bash
# View schema
psql -d dbname -c "\dt"
psql -d dbname -c "SELECT * FROM users LIMIT 10;"

# Backups
pg_dump dbname > backup.sql
mysqldump dbname > backup.sql
```

### Requires Confirmation
```bash
# Destructive operations
DROP DATABASE
DROP TABLE
TRUNCATE TABLE
DELETE FROM users;  # Without WHERE clause!

# Restore (overwrites data)
psql -d dbname < backup.sql

# Migrations (schema changes)
npx prisma migrate deploy  # In production
```

## Logging Policy

### What to Log
```bash
# ✅ DO: Log command execution (redacted)
echo "Executing: npm install"
echo "Connecting to: user@example.com (SSH)"
echo "Running migration: 20240115_add_users_table"
```

### What NOT to Log
```bash
# ❌ DON'T: Log passwords, tokens, keys
echo "Password: $DB_PASSWORD"  # NO!
echo "API Key: $API_KEY"  # NO!
echo "JWT Token: $TOKEN"  # NO!
```

### Redaction
```bash
# ✅ DO: Redact sensitive parts
CMD="mysql -u admin -p'${DB_PASSWORD}'"
echo "Running: mysql -u admin -p'[REDACTED]'"
```

## Checklist Before Execution

### For Any Command
- [ ] Is this command reversible?
- [ ] Does it modify production?
- [ ] Does it involve secrets?
- [ ] Have I verified paths/names?
- [ ] Is there a backup if needed?

### For SSH Operations
- [ ] Correct host?
- [ ] Correct user?
- [ ] Verified path on remote?
- [ ] Tested with dry-run if available?

### For Database Operations
- [ ] Backup created?
- [ ] Tested on dev/staging first?
- [ ] WHERE clause included (for UPDATE/DELETE)?
- [ ] LIMIT clause included (for testing)?

## Emergency Procedures

### If Secrets Are Exposed
1. **Immediately revoke** the exposed credential
2. **Generate new** secret/key
3. **Update** .env files and services
4. **Audit** logs for unauthorized access
5. **Document** the incident

### If Data Is Accidentally Deleted
1. **Stop** all operations immediately
2. **Assess** scope of deletion
3. **Restore** from most recent backup
4. **Verify** restored data integrity
5. **Document** for post-mortem

## Best Practices Summary

### ✅ DO
- Verify before executing
- Use backups before destructive operations
- Keep secrets in .env files
- Use SSH keys instead of passwords
- Test on dev/staging first
- Log operations (without secrets)
- Ask for confirmation when unsure

### ❌ DON'T
- Echo secrets to console
- Skip confirmation for destructive operations
- Commit secrets to git
- Use `rm -rf` without verification
- Force push to main/master
- Run production commands without testing
- Trust user input blindly

## Hosting Provider Compliance (Hostinger-Oriented)

### The Suspension Risk Model

Hosting providers like Hostinger enforce strict anti-abuse policies to protect their infrastructure and comply with legal requirements. Understanding the risk model helps prevent account suspension:

**Common Violation Triggers**:
- Malware files detected on server
- Spam email origination
- Open proxies or relays
- Port scanning or brute force attacks from your IP
- Exposed/compromised admin panels
- Resource abuse (excessive CPU, bandwidth)
- DMCA/copyright complaints
- Illegal content

**Progressive Enforcement** (paraphrased from typical hosting ToS):
1. **First Incident**: Warning email + required cleanup within 24-48 hours
2. **Second Incident**: Temporary suspension + mandatory remediation
3. **Third Incident**: May result in permanent account termination

**Key Insight**: The third strike can be permanent. Take compliance seriously from day one.

### When Provider Flags Your Server

**IMMEDIATE ACTIONS** (freeze all normal work):

1. **Acknowledge Promptly**
   - Reply to support ticket within hours (not days)
   - Confirm you received the notice
   - Provide initial assessment timeline

2. **Preserve Evidence**
   - Create VPS snapshot via provider panel
   - Backup all logs:
     ```bash
     sudo tar -czf /tmp/logs_$(date +%Y%m%d_%H%M%S).tar.gz /var/log/
     ```
   - List recently modified files:
     ```bash
     find / -type f -mtime -7 -ls > /tmp/recent_files_$(date +%Y%m%d).txt 2>/dev/null
     ```
   - Document current running processes:
     ```bash
     ps auxf > /tmp/processes_$(date +%Y%m%d).txt
     ```

3. **Investigate Thoroughly**
   - Read the provider's specific findings (file paths, IP addresses, timestamps)
   - Examine flagged files (don't execute, use `cat` or `less`)
   - Check auth logs for unauthorized access
   - Review web server logs for suspicious requests
   - Scan with ClamAV or similar:
     ```bash
     sudo apt install -y clamav clamav-daemon
     sudo freshclam
     sudo clamscan -r -i --log=/tmp/clamscan_$(date +%Y%m%d).log /
     ```

4. **Clean Decisively**
   - Remove confirmed malware/abuse-related files
   - Patch the vulnerability that allowed compromise
   - Update all software (OS, web apps, plugins)
   - Rotate ALL credentials (passwords, API keys, SSH keys, database passwords)
   - Force user session invalidation (WordPress, app sessions)

5. **Document Actions**
   - Create incident report: what happened, how it happened, what you fixed
   - Save in `/home/user/incidents/YYYYMMDD-incident.md`
   - Include timeline, affected files, root cause, remediation steps

6. **Communicate with Provider**
   - Reply to ticket with detailed report:
     - Acknowledge the issue
     - Explain what was found
     - List actions taken
     - Confirm vulnerability patched
     - Request rescan or verification
   - Be specific, not vague ("removed malware" vs "removed /var/www/html/uploads/shell.php backdoor")

7. **Monitor Intensively**
   - Watch logs for 48-72 hours for reinfection signs
   - Check for new suspicious files daily
   - Monitor outbound connections
   - Review fail2ban logs

8. **Prevent Recurrence**
   - Update runbooks with lessons learned
   - Implement additional hardening (e.g., block PHP in uploads dir)
   - Schedule regular malware scans
   - Consider Cloudflare WAF or similar

### Provider-Specific Compliance Requirements

**Hostinger** (and similar providers) prohibit:
- ❌ Malware, viruses, trojans, backdoors
- ❌ Spam or mass unsolicited email
- ❌ Port scanning or network attacks
- ❌ Brute force attempts (even against your own servers elsewhere)
- ❌ Open proxies or open relays
- ❌ Copyright infringement / pirated content
- ❌ DDoS attacks or participation in botnets
- ❌ Phishing sites or fraudulent content
- ❌ Adult content (on some plans, check ToS)
- ❌ Resource abuse beyond plan limits

**Allowed** (defensive security):
- ✅ Installing fail2ban, ClamAV, security plugins
- ✅ Configuring firewalls on your own VPS
- ✅ Hardening SSH, web servers, applications
- ✅ Monitoring your own logs and traffic
- ✅ Running malware scans on your own server
- ✅ Implementing backups and DR plans
- ✅ Responding to security incidents on your property

**Gray Area** (ask provider first):
- ⚠️ Running Tor nodes or VPN services
- ⚠️ High-bandwidth applications (video streaming, CDN)
- ⚠️ Cryptocurrency mining (usually prohibited unless dedicated resources)
- ⚠️ Penetration testing tools (even on your own infrastructure)

### AI Agent Safety in Provider Context

When AI operates your VPS:

**MUST NOT**:
- Run port scanners (nmap, masscan) against external IPs
- Execute brute force tools (hydra, john) against any target
- Download/execute unknown scripts without review
- Install offensive security tools without explicit authorization
- Modify logs to hide activity
- Bypass or disable provider monitoring
- Run commands that generate suspicious outbound traffic

**MUST**:
- Follow "confirmation gates" for all destructive operations
- Document all changes with timestamps and reasoning
- Maintain audit trail of all commands executed
- Respect provider ToS at all times
- Report potential compliance issues to human operator
- Implement defense-in-depth security posture

### Proactive Compliance Checklist

**Weekly**:
- [ ] Review auth.log for failed login attempts
- [ ] Check disk space (malware often fills disk)
- [ ] Verify fail2ban is active and banning appropriately
- [ ] Scan for PHP files in upload directories

**Monthly**:
- [ ] Run full ClamAV malware scan
- [ ] Update all software (apt upgrade, wp core update, etc.)
- [ ] Review user accounts and access levels
- [ ] Test backups (restore to staging)
- [ ] Rotate non-critical passwords

**Quarterly**:
- [ ] Full security audit
- [ ] Review and update firewall rules
- [ ] Disaster recovery drill
- [ ] Documentation update
- [ ] Credential rotation (all SSH keys, DB passwords, etc.)

### Red Flags That Trigger Provider Scans

Avoid these patterns that commonly trigger automated detection:

**File-based**:
- Files with names like: c99.php, r57.php, shell.php, backdoor.php
- PHP files in upload directories
- Eval/base64 patterns in PHP: `eval(base64_decode($_POST['cmd']))`
- Known malware signatures (provider updates these regularly)

**Network-based**:
- High volume outbound SMTP (spam)
- Port scanning from your IP
- Participation in DDoS (high PPS or bandwidth)
- Connections to known C&C servers
- Tor exit node traffic (if not disclosed)

**Behavior-based**:
- Sudden CPU spike from cryptominer
- Excessive failed SSH attempts (if fail2ban not working)
- Serving many large files (possible piracy)
- Rapid creation of many email accounts (spam setup)

### Emergency Contact Info

Keep readily accessible:
- Hostinger support ticket system URL
- Your account email and customer ID
- VPS IP address and hostname
- Emergency contact (if team environment)
- Backup access method (in case SSH locked)

**Provider Support Channels**:
- Support ticket system (primary)
- Live chat (for urgent issues)
- Phone (for critical account issues)

**Never**:
- Ignore provider emails (check spam folder too)
- Assume "false positive" without investigating
- Wait until deadline to respond
- Be adversarial with support (they're trying to help)

---

**Related**:
- [Security & Secrets Rule](../../.cursor/rules/100-security-secrets.md)
- [Terminal/SSH Skill](/skills/terminal-ssh-vps/skill.md)
- [Hostinger VPS Skill](/skills/hostinger-vps-ops/skill.md)
- [Hostinger Compliance Rule](../../.cursor/rules/110-hostinger-vps-compliance.md)
- [Git Workflow Rule](../../.cursor/rules/090-git-workflow.md)
- [Hostinger Malware Response](/docs/ops/HOSTINGER_MALWARE_RESPONSE.md)

**Last Updated**: 2025-12-31
