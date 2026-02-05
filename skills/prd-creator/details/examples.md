# PRD Creation  -  Examples

## Example 1: Password Reset Improvements

### Summary
Users fail to reset passwords because the email is delayed or blocked. Add a secure, reliable reset flow with clear status messaging.

### Goals
- Increase successful password resets from 62 percent to 85 percent.
- Reduce support tickets related to login issues by 30 percent.

### Non-Goals
- No MFA changes in this release.
- No changes to login UI beyond reset flow.

### User Stories
- As a user, I want a reliable password reset link, so that I can regain access quickly.

### Workflows
1. Reset request -> Email sent -> Link opened -> Password updated.

### Architecture
- Auth service issues tokens and stores reset state.
- Email provider sends the reset link.

### Requirements (Functional)
- Must: Send reset email within 60 seconds for 95 percent of requests.
- Must: Prevent user enumeration in responses.
- Should: Provide a fallback SMS reset option if email is unavailable.

### Requirements (Non-Functional)
- Security: Tokens expire after 15 minutes.
- Reliability: Retry email send up to 3 times with backoff.

### Test Strategy
- Unit: token generation and validation.
- Integration: email provider response handling.
- E2E: full reset flow.

### Production Requirements
- Feature flag for gradual rollout.
- Rollback: disable reset emails and revert to legacy flow.

### Success Metrics
- Reset completion rate
- Ticket volume tagged "password reset"

### Path
- `docs/prd/2025-01-01-password-reset-improvements.md`

### TODOs
- [ ] Finalize SMS provider decision

---

## Example 2: Admin Bulk User Import

### Summary
Admins need to import users in bulk with role assignment. Provide CSV upload with validation and error reporting.

### Goals
- Reduce manual user creation time by 80 percent.
- Enable importing up to 5,000 users per file.

### Non-Goals
- No automatic email invitations in this release.

### User Journey
1. Admin downloads a CSV template.
2. Admin uploads completed CSV.
3. System validates and shows errors.
4. Admin confirms import.

### User Stories
- As an admin, I want to import users in bulk, so that onboarding is faster.

### Workflows
1. Upload CSV -> Validate -> Confirm -> Import -> Summary report.

### Architecture
- Upload service stores file, import worker processes rows.

### Requirements (Functional)
- Must: Validate required fields and role values.
- Must: Show per-row errors with line numbers.
- Should: Allow partial import when non-critical rows fail.

### Requirements (Non-Functional)
- Performance: Process 5,000 rows under 2 minutes.
- Security: Only admins can access the import endpoint.

### Rollout Plan
- Feature flag for admins only.
- Initial rollout to internal admins for 1 week.

### Test Strategy
- Unit: CSV parser and role validation.
- Integration: import worker and database writes.
- E2E: admin upload and confirmation flow.

### Production Requirements
- Rate limits on upload endpoint.
- Alerting on failed imports.

### Path
- `docs/prd/2025-01-01-admin-bulk-import.md`

### TODOs
- [ ] Decide if partial imports require user confirmation
