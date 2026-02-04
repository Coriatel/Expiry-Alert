# Expiry Alert - Completion Plan

Last Updated: 2026-02-04 09:52 UTC
Current Stage: Production hardening and operational readiness

## Progress Snapshot
- Overall progress: 90%
- Production state: Live
- Remaining work: SMTP wiring, final hardening, release verification

## Phase Status

### Phase 1 - Core Platform (Done)
- API + web PWA in production.
- Directus migration completed.
- Team/workspace model active.

### Phase 2 - Collaboration Features (Done)
- Multi-user shared data via team scoping.
- Team switch/create/invite flows in UI.
- Polling sync enabled for near real-time updates.
- Print-optimized dashboard output.

### Phase 3 - Team Password Access (Done, with one dependency)
- Team password set/join/reset feature shipped.
- Dependency still pending: SMTP config for reset-email delivery.

### Phase 4 - Production Hardening (In Progress)
- [ ] Configure SMTP + `API_BASE_URL` in `apps/api/.env`
- [ ] Verify forgot-password email delivery in production
- [ ] Replace MemoryStore sessions with Redis session store
- [ ] Final release QA sweep and sign-off

## Immediate Action Plan
1. Set SMTP variables in `apps/api/.env`.
2. Redeploy `expiryalert-api`.
3. Execute runbook tests in `docs/TEAM_PASSWORD_ACCESS_GUIDE.md`.
4. Implement Redis session store.
5. Re-run smoke tests and close phase.

## Definition of Done (Production-Ready)
- Password reset email works reliably.
- Team password join/reset flow passes end-to-end tests.
- Sessions survive process restart (Redis-backed store).
- Health checks green and no critical errors in logs.
- Docs reflect final architecture and operations.

## Quick Commands
```bash
# API health
curl -i https://expiryalert.coriathost.cloud/api/health

# Local API health
curl -i http://127.0.0.1:3011/api/health

# API logs
docker logs --tail 100 expiry-alert-expiryalert-api-1
```

## Related Docs
- `PRODUCTION_STATUS.md`
- `START_HERE.md`
- `docs/TEAM_PASSWORD_ACCESS_GUIDE.md`
