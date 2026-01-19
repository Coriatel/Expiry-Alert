# n8n Automation — Checklist

## Definition of Done
- [ ] Purpose, trigger, inputs/outputs, credential names documented in `automations/n8n/{slug}.md`
- [ ] Webhook auth or schedule guard in place; paths/methods documented
- [ ] Validation rejects bad input with clear status/message
- [ ] Idempotency key chosen and enforced before side effects
- [ ] Retries/backoff only for transient errors; alerts wired for failures
- [ ] Correlation ID added and passed through downstream calls
- [ ] Secrets absent from repo/export; credential names only
- [ ] Export saved to `automations/n8n/{slug}.json`; tests logged in `{slug}.md`
- [ ] Live test run in target environment after import
- [ ] Owners/alerts channel recorded and notified of changes
