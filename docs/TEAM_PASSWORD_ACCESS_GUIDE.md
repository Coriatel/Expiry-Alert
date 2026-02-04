# Team Password Access Guide

Last Updated: 2026-02-04 09:52 UTC

## Purpose
Guide for using the team password model in production:
- Owner/admin sets team password.
- Users join team with team name + password.
- Forgot-password sends reset link by email.

## Admin Flow
1. Open Settings -> Team Workspace.
2. Select current team.
3. In "Team password", set new password (min 6 chars).
4. Share team name + password securely with members.

## Member Flow
1. Open Settings -> Team Workspace.
2. Use "Join team with password".
3. Enter exact team name + password.
4. Team is added and switched as current workspace.

## Forgot Password Flow
1. Team member opens "Forgot team password".
2. Enters team name and requests reset email.
3. Owner/admin mailbox receives reset link.
4. Open link and set a new team password.

## Required Production Config (SMTP)
Set these in `apps/api/.env`:

```env
API_BASE_URL=https://expiryalert.coriathost.cloud
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=alerts@yourdomain.com
SMTP_PASS=your-smtp-password
SMTP_FROM=alerts@yourdomain.com
```

Then redeploy API:
```bash
docker compose -p expiry-alert -f /path/to/docker-compose.yml up -d --build expiryalert-api
```

## Validation Checklist
- Admin can save team password.
- Member can join with password.
- Wrong password is rejected.
- Forgot-password sends email.
- Reset link updates password.
- Old password no longer works; new password works.

## Troubleshooting
- "Failed to send reset email":
  - Check SMTP vars in `apps/api/.env`.
  - Check API logs: `docker logs --tail 100 expiry-alert-expiryalert-api-1`.
- Reset link opens wrong host:
  - Fix `API_BASE_URL` and redeploy.
- Join fails despite correct password:
  - Verify team name exact spelling.
  - Ensure password was saved by owner/admin.
