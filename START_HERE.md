# Expiry Alert - Start Here

Last Updated: 2026-02-04 09:52 UTC
Status: Live in production, hardening in progress

## Read Order
1. `PRODUCTION_STATUS.md` - Current live state and blockers
2. `COMPLETION_PLAN.md` - Stage, progress, and next actions
3. `docs/TEAM_PASSWORD_ACCESS_GUIDE.md` - Admin/user flow and SMTP setup
4. `docs/GOOGLE_OAUTH_PRODUCTION_PREP.md` - OAuth review checklist

## Current Priority
- Finish SMTP setup so team-password reset emails work.
- Complete final production-hardening checklist.

## Quick Operational Checks
```bash
# Branch status
git -C /root/expiry-alert rev-parse --abbrev-ref HEAD
git -C /root/expiry-alert ls-remote --heads origin claude/production-code-review-mSwML

# Runtime status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | rg expiry-alert

# Health checks
curl -i http://127.0.0.1:3011/api/health
curl -i https://expiryalert.coriathost.cloud/api/health
```

## Open Production Tasks
- [ ] Set SMTP env vars in `apps/api/.env`
- [ ] Set `API_BASE_URL` in `apps/api/.env`
- [ ] Redeploy API service
- [ ] Validate password-reset email flow end-to-end
- [ ] Replace session MemoryStore with Redis store

## Notes
- Team password features are live in code and deployed.
- Reset email feature is blocked until SMTP values are configured.
