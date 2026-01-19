# n8n Automation Build

## Purpose
Create or update n8n workflows that connect services, transform data, and run reliably (webhooks, schedulers, queues) with safe credential handling and validation.

## When to Use This Skill
- Building new automations in n8n (webhook, cron, polling, queue triggers)
- Extending an existing n8n workflow with new steps or error handling
- Migrating manual/API glue logic into n8n
- Investigating and fixing failing n8n jobs

Do NOT use when:
- Building one-off scripts without n8n (write direct code instead)
- Performing offensive security or unsupported provider actions

## Required Inputs
1. **Workflow goal**: What business outcome? (inputs → outputs)
2. **Trigger type**: Webhook, schedule, event/polling, manual
3. **Systems & creds**: APIs/DBs/queues involved and credential names (no secrets in repo)
4. **Data contract**: Expected schema for inbound/outbound payloads
5. **Reliability/SLO**: Expected frequency, max latency, retry policy, alerting channel

Defaults:
- Repository artifacts: `automations/n8n/{workflow-slug}.json` (export) and optional `automations/n8n/{workflow-slug}.md` (notes/tests)
- Secrets live in n8n credentials; repo only stores credential names and env var keys
- Host security policies apply: `.cursor/rules/100-security-secrets.md`, add `.cursor/rules/110-hostinger-vps-compliance.md` if on Hostinger

## Steps

### 1) Prep and policies
- Read `.cursor/rules/000-overview.md`, `100-security-secrets.md`, `090-git-workflow.md`; include `110-hostinger-vps-compliance.md` if the instance runs on Hostinger.
- Confirm trigger, payload schema, systems, and success criteria with the requester.

### 2) Define the workflow spec
- Write a short spec in `automations/n8n/{workflow-slug}.md` (or update existing): goal, trigger, inputs/outputs, systems/credential names, idempotency key, retry/backoff, alerting target, owner.
- Enumerate test cases: happy path, bad payload, downstream 4xx, downstream 5xx, timeout.

### 3) Prepare repo artifacts
- Ensure `automations/n8n/` exists; keep exports and notes there.
- If modifying an existing export, open its JSON to understand node IDs/names before editing.

### 4) Credential strategy
- List credential names to use (e.g., `crm-api`, `slack-bot`, `pg-readwrite`). Do NOT store secrets in repo.
- Prefer environment-backed credentials in n8n; never hardcode tokens in nodes. For webhooks, enforce auth (API key header, signature, or basic auth) and document the header name in the spec.

### 5) Build or edit the workflow in n8n
- Create/modify nodes using descriptive names (Verb - Target), keep flows left→right, group with labels.
- Webhooks: set path, HTTP method, and auth guard; respond quickly (use `Respond to Webhook` early, then async branch if needed).
- Validation: parse/validate input (Set + IF/Function) against the schema; reject clearly with HTTP status/message.
- Transform: keep transformations in `Function`/`Set` nodes; avoid embedding secrets or large logic in expressions when a Function node is clearer.
- External calls: use `HTTP Request`/`Database`/`Queue` nodes with proper timeouts; capture response codes and bodies for branching.

### 6) Reliability and error handling
- Add a global error trigger or per-branch error handling; route failures to alerting (e.g., Slack/Email) with context (payload snippet, error, correlation ID).
- Implement retries with backoff for transient errors; avoid retrying on 4xx. Add circuit-break style guard for repeated failures.
- Ensure idempotency: use unique keys (request ID/message ID) to prevent duplicate side effects.

### 7) Logging and observability
- Add a correlation ID at entry and pass it through nodes; log it in alerts.
- Emit structured logs (e.g., to Slack/HTTP) for success/failure summary; keep PII out of logs.

### 8) Test
- Use sample payloads in the UI; run each test case. For webhooks, exercise with `curl` including auth header.
- Confirm branch coverage: happy path, validation fail, downstream 4xx, downstream 5xx/timeout.
- Record results in `automations/n8n/{workflow-slug}.md` under a Tests section.

### 9) Export and commit artifacts
- Export the workflow JSON from n8n (removing execution history). Save to `automations/n8n/{workflow-slug}.json`.
- Verify the export contains credential references (names) only and no secrets. Redact any accidental tokens.
- Update notes/tests in `automations/n8n/{workflow-slug}.md` (inputs, outputs, alerting details, owners).

### 10) Deploy
- Import the JSON into the target n8n environment; bind credentials by name.
- Configure environment-specific URLs, secrets, and schedules in the instance (not in the JSON file).
- Enable the workflow and run a live test with production-like payloads.

### 11) Validation checklist
- Webhook auth enforced (or schedule protected) and documented
- Validation rejects bad input with clear status/message
- Retries/backoff only on transient errors; alerts fire on failure
- No secrets in repo; credential names documented; correlation ID present
- Export saved to `automations/n8n/` and tests documented

## Expected Outputs
- `automations/n8n/{workflow-slug}.json` — exported workflow without secrets
- `automations/n8n/{workflow-slug}.md` — spec, test notes, alerting, owners
- Updated n8n instance with enabled workflow and bound credentials

## See Also
- Security/secrets: `.cursor/rules/100-security-secrets.md`
- Git/process: `.cursor/rules/090-git-workflow.md`
- Hostinger compliance (if applicable): `.cursor/rules/110-hostinger-vps-compliance.md`
- Details pack: `./details/README.md`, `./details/examples.md`, `./details/checklist.md`, `./details/anti-patterns.md`
