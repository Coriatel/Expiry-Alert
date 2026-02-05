# Expiry Alert - Production Status

Last Updated: 2026-02-04 09:52 UTC
Owner: Codex (GPT-5)

## Current Stage
- Stage: Production hardening
- State: Live in production
- Progress: 90% complete

## Deployed Baseline
- App URL: `https://expiryalert.coriathost.cloud`
- API health: `https://expiryalert.coriathost.cloud/api/health` -> `200`
- Local API health: `http://127.0.0.1:3011/api/health` -> `200`
- Production branch head: `3e52eaede2f38ff233a2cc0116e6069551ad642e`

## Completed in Current Release
- Team collaboration with polling sync (15s refresh) on dashboard/archive.
- Team workspace management in Settings (switch team, create team, invite members).
- Preferred team restore on login.
- Browser print support with paper-friendly styles.
- Team password workflow:
  - Owner/admin can set team password.
  - Users can join by team name + password.
  - Forgot-password flow sends reset email link to team owner/admin mailbox.
  - Password reset endpoint/page implemented.

## Current Gaps (Blocking Full Production Readiness)
- SMTP is not configured in `apps/api/.env`:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
  - `API_BASE_URL` also required for correct reset-link host.
- Session store still uses MemoryStore (works, not ideal for scale/restarts).

## Next Required Actions
1. Configure SMTP + `API_BASE_URL` in `apps/api/.env`.
2. Redeploy/restart `expiryalert-api`.
3. Run reset-email test end-to-end.
4. Move sessions to Redis-backed store.

## Quick Validation Checklist
- Login with Google.
- Switch teams and confirm persisted preferred team on re-login.
- Admin sets team password.
- Second user joins team via password.
- Request team password reset and confirm email arrives.
- Open reset link, set new password, re-join with new password.
- Browser print preview on A4/Letter looks clean.

## Related Docs
- Plan and progress: `COMPLETION_PLAN.md`
- Entry guide: `START_HERE.md`
- Team password runbook: `docs/TEAM_PASSWORD_ACCESS_GUIDE.md`
- Google OAuth checklist: `docs/GOOGLE_OAUTH_PRODUCTION_PREP.md`
