# Hostinger VPS Compliance — Provider ToS & AI Agent Safety

## Purpose

This rule enforces compliance with Hostinger VPS Terms of Service and establishes safety protocols for AI-driven server operations. Applies to VPS/cloud operations generally but specifically addresses Hostinger's anti-abuse requirements.

## Core Compliance Principles

### 1. Zero Tolerance for Abuse

**Prohibited Activities**:
- ❌ Malware hosting or distribution
- ❌ Spam or mass unsolicited email
- ❌ Port scanning or network attacks
- ❌ Brute force attacks on any system
- ❌ Open proxies or relays (without authorization)
- ❌ Copyright infringement
- ❌ Cryptomining without explicit resource allocation
- ❌ DDoS attacks (outbound or participation)
- ❌ Phishing or fraudulent content

**Why This Matters**:
- First violation: Warning + required cleanup
- Second violation: Temporary suspension
- Third violation: May result in permanent account termination
- Provider scans regularly for malware and abuse patterns

### 2. Defensive Security Only

**Allowed**:
- ✅ Hardening your own VPS
- ✅ Configuring firewalls and access controls
- ✅ Installing security software (fail2ban, ClamAV)
- ✅ Monitoring your own logs and traffic
- ✅ Responding to security incidents on your systems
- ✅ Implementing backups and disaster recovery
- ✅ Compliance and auditing activities

**Not Allowed**:
- ❌ Offensive security tools (without authorization)
- ❌ "Testing" on systems you don't own
- ❌ Scanning ports outside your VPS
- ❌ Bypassing provider monitoring
- ❌ Techniques to evade detection
- ❌ Anything that violates provider ToS

### 3. Prompt Response to Notices

If Hostinger sends abuse/malware notification:

**Response Protocol** (within 24 hours):
1. **Acknowledge**: Reply to support ticket immediately
2. **Freeze**: Stop all deployments and changes
3. **Preserve**: Create snapshot, save logs
4. **Investigate**: Identify the issue
5. **Clean**: Remove malware/fix vulnerability
6. **Patch**: Update software, close security gaps
7. **Rotate**: Change all credentials
8. **Report**: Document actions taken, request rescan
9. **Monitor**: Watch closely for 48-72 hours
10. **Learn**: Update procedures to prevent recurrence

**Don't**:
- ❌ Ignore or delay response
- ❌ Argue without investigating first
- ❌ Delete evidence before understanding root cause
- ❌ Reinstall without fixing vulnerability
- ❌ Assume "false positive" without verification

## AI Agent Safety Gates

### Confirmation Required Before

AI agents (Claude, GPT, etc.) MUST ask human before:

**System Changes**:
- Disabling password authentication on SSH
- Disabling root login
- Changing SSH port
- Modifying firewall rules (especially default policies)
- Installing/removing kernel modules
- Rebooting production servers
- Changing DNS settings

**Data Operations**:
- Deleting databases or tables
- Truncating tables with data
- Dropping schemas
- Mass file deletion (`rm -rf`)
- Overwriting backups
- Reformatting disks

**Service Operations**:
- Stopping production services
- Restarting critical services during business hours
- Changing service configurations (nginx, php, mysql)
- Blocking IP addresses or ranges
- Modifying security software (disabling fail2ban, etc.)

**Package Management**:
- Removing packages (especially security or system packages)
- Major version upgrades (e.g., PHP 7.4 → 8.2)
- Kernel updates (require reboot)
- Upgrading database server versions

### No Questions Mode (When to Proceed Without Asking)

AI agents MAY proceed without confirmation for:

**Read Operations**:
- Viewing file contents
- Listing directories
- Checking service status
- Reading logs
- Running diagnostic commands
- Checking disk space, memory, CPU
- Viewing firewall rules (not modifying)

**Safe Changes**:
- Creating directories (not in system paths)
- Creating files (not overwriting)
- Copying files (not moving or deleting)
- Updating package lists (`apt update`)
- Installing NEW packages (not removing or upgrading)
- Adding firewall rules (not removing or changing defaults)

**Documentation**:
- Creating/updating documentation files
- Logging actions
- Creating backup scripts
- Writing monitoring scripts (that don't auto-execute)

### Documented Assumptions

When AI proceeds without asking, it MUST document:

```markdown
# Change Log Entry
Date: 2025-12-31
Action: Installed fail2ban package
Assumption: Security package, non-destructive, provider-recommended
Risk Level: Low
Rollback: apt remove fail2ban
```

## Common Violation Scenarios (What to Avoid)

### 1. Compromised WordPress

**Scenario**: Vulnerable plugin → malware uploaded → provider flags it

**Prevention**:
- Keep WordPress/plugins updated
- Use minimal, trusted plugins only
- Block PHP execution in uploads directory
- Regular malware scans

**If Flagged**:
1. Remove malware immediately
2. Update vulnerable plugin (or remove it)
3. Scan entire filesystem
4. Rotate credentials
5. Document which plugin was vulnerable

### 2. Exposed Admin Panels

**Scenario**: phpMyAdmin with default URL → brute forced → database compromised

**Prevention**:
- Move admin panels to non-default URLs
- Use IP whitelist
- Add authentication layer
- Use Cloudflare Access or VPN

**If Flagged**:
1. Block public access immediately
2. Review database for unauthorized changes
3. Change all database passwords
4. Implement IP whitelist

### 3. Compromised SSH

**Scenario**: Weak password → brute forced → malware installed

**Prevention**:
- SSH keys only (disable password auth)
- Fail2ban installed and active
- Non-standard SSH port (optional)
- Root login disabled

**If Flagged**:
1. Review auth.log for unauthorized access
2. Kill suspicious sessions
3. Regenerate SSH keys
4. Audit cron jobs and running processes
5. Scan for backdoors

### 4. Spam Origination

**Scenario**: Compromised contact form → sending spam → IP blacklisted

**Prevention**:
- Rate limit contact forms
- CAPTCHA on forms
- Monitor outbound email volume
- Use dedicated email service (SendGrid, etc.)

**If Flagged**:
1. Disable contact forms immediately
2. Check mail queue: `mailq`
3. Clear spam: `postsuper -d ALL`
4. Find compromised form and fix
5. Request IP delisting after cleanup

## Security Baseline Requirements

### SSH Configuration

```bash
# /etc/ssh/sshd_config (minimum secure configuration)
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin no
Protocol 2
X11Forwarding no
MaxAuthTries 3
```

### Firewall (ufw)

```bash
# Minimum configuration
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
```

### Fail2Ban

```bash
# Must be installed and active
sudo systemctl status fail2ban
# Should show: active (running)

# SSH jail must be enabled
sudo fail2ban-client status sshd
```

### Updates

```bash
# System must be up to date
# No packages with security updates pending
sudo apt update
sudo apt list --upgradable
# Output should be minimal (no critical packages)
```

### Web Applications

For WordPress specifically:
- Core updated to latest version
- All plugins updated
- Only essential plugins installed
- Security plugin active (Wordfence/Sucuri)
- File editing disabled in admin

For custom apps:
- Dependencies updated
- No known CVEs in stack
- Secrets not in code or web-accessible files
- Error logging (not error display)

## Monitoring Requirements

### Daily Checks

```bash
# Failed SSH attempts
grep "Failed password" /var/log/auth.log | tail -20

# Disk space
df -h | grep -E "([8-9][0-9]|100)%"

# Fail2ban status
sudo fail2ban-client status
```

### Weekly Checks

```bash
# Package updates
sudo apt update && apt list --upgradable

# WordPress updates (if applicable)
sudo -u www-data wp core check-update
sudo -u www-data wp plugin list --update=available

# Review logs
sudo grep -i "error\|warning" /var/log/syslog | tail -100
```

### Monthly Checks

```bash
# Full malware scan
sudo freshclam && sudo clamscan -r -i / > /tmp/scan.log

# Security audit
# See: /scripts/vps-security-audit.sh

# Backup test
# Restore from latest backup to test environment

# Certificate expiry
sudo certbot certificates
```

## Documentation Requirements

All changes to VPS configuration MUST be documented in:
`/home/user/docs/operations-log.md`

**Required information**:
- Date and time
- What was changed
- Why it was changed
- Who/what made the change
- How to rollback

**Example**:
```markdown
## 2025-12-31 14:30 UTC

### Change: Disabled SSH password authentication

- **File**: /etc/ssh/sshd_config
- **Changes**: PasswordAuthentication yes → no
- **Reason**: Security hardening, comply with best practices
- **Changed by**: Claude AI agent (authorized by admin)
- **Rollback**: Edit sshd_config, set PasswordAuthentication yes, restart sshd
- **Testing**: Verified key-based login works before applying
- **Impact**: Password authentication no longer works (by design)
```

## Integration with Other Rules

This rule works with:
- [Security & Secrets](./100-security-secrets.md) — Secret handling
- [Git Workflow](./090-git-workflow.md) — No secrets in commits
- [API Express](./050-api-express.md) — Input validation
- [Testing](./080-testing-e2e.md) — Test before deploying

## Related Skills and Docs

- [Hostinger VPS Operations](/skills/hostinger-vps-ops/skill.md)
- [Terminal & SSH VPS](/skills/terminal-ssh-vps/skill.md)
- [Terminal & SSH Policy](/docs/ops/TERMINAL_SSH_POLICY.md)
- [Hostinger VPS Runbook](/docs/ops/HOSTINGER_VPS_RUNBOOK.md)
- [Hostinger Malware Response](/docs/ops/HOSTINGER_MALWARE_RESPONSE.md)
- [Hostinger AI Agent Safety](/docs/ops/HOSTINGER_AI_AGENT_SAFETY.md)

## Checklist for AI Agents

Before ANY VPS operation:

- [ ] Operation is defensive/compliant (not offensive/abusive)
- [ ] Secrets will not be exposed or logged
- [ ] Destructive operations have confirmation
- [ ] Current state will be checked first
- [ ] Backup exists (for destructive changes)
- [ ] Changes will be documented
- [ ] Rollback plan is clear
- [ ] Testing will be done before applying to production

## Penalties for Violations

**Provider-Level** (Hostinger):
- Warning (first offense)
- Suspension (second offense)
- Termination (third offense or severe first offense)

**Legal** (depending on violation):
- CFAA violations (unauthorized access)
- CAN-SPAM violations (spam)
- DMCA violations (copyright)
- Criminal charges (severe cases)

**Don't risk it. Compliance first.**

---

**Last Updated**: 2025-12-31
**Applies to**: All VPS operations, especially Hostinger
**Enforcement**: Mandatory for all AI agents
