# n8n Automation — Patterns and Guidance

## Overview
Use this as a reference when designing or reviewing n8n workflows. Focus: safe credentials, predictable triggers, idempotency, and observable failure paths.

## Triggers and Entry Patterns
- Webhook: prefer POST, require auth (API key header or signature), respond fast with `Respond to Webhook`, offload long work to async branch.
- Schedule/Cron: keep frequency minimal; guard with time window checks to avoid duplicate runs after downtime.
- Polling/API trigger: store `lastProcessed` state to avoid reprocessing; rate-limit requests.
- Queue/Event (e.g., Kafka, SQS): propagate message ID as correlation ID and idempotency key.

## Credential and Secret Handling
- All secrets live in n8n credentials; repo only holds credential names and env var keys.
- Use separate credentials per system/role (read-only vs read/write). Rotate tokens often; document owners.
- Never log tokens or full payloads with secrets; scrub sensitive fields before alerts/logs.

## Validation and Contracts
- Define expected input schema (fields, types, required/optional). Reject early with clear HTTP codes/messages.
- Normalize/trim user input; enforce enums; parse dates/numbers explicitly.
- For outbound contracts, document the shape sent to downstream systems and include examples.

## Idempotency and Ordering
- Use a unique key per request/message (request ID, message ID, hash of significant fields).
- Check for prior completion before executing side effects (e.g., query by idempotency key).
- Avoid non-deterministic steps before idempotency checks (e.g., random values).

## Retries and Backoff
- Retry only transient failures (>=500, network, timeouts). Do not retry on 4xx except 429 with backoff.
- Use exponential backoff with jitter; cap attempts. After max, alert with context.
- Avoid retry storms: add rate limits and circuit breakers when downstream is unhealthy.

## Error Handling and Alerting
- Add error branches or global error trigger. Include correlation ID, trigger info, node name, status code, and trimmed payload snippet in alerts.
- Prefer chat/incident channels already used by the team (e.g., Slack webhook). Avoid email floods.
- Categorize errors: validation, downstream 4xx, downstream 5xx/timeout, internal (Function errors).

## Transformations and Functions
- Keep Function nodes small and deterministic; avoid mixing business logic and HTTP calls in one node.
- Use `Set`/`Rename Keys` for mapping fields; document mapping in notes.
- Handle dates/time zones explicitly (ISO strings, UTC). Avoid locale-dependent parsing.

## Logging and Observability
- Generate a correlation ID at entry; attach to logs/alerts and downstream calls.
- Log summaries, not full payloads. Redact PII/secrets. Include timing information for slow steps.
- Track success/failure counts per run; consider emitting metrics if supported by the deployment.

## Testing
- Create table of test cases with input payload, expected outcome, and notes; store in `{slug}.md`.
- Exercise: happy path, missing/invalid fields, downstream 4xx, downstream 5xx/timeout, duplicate/idempotent request, oversized payload.
- For webhooks, test with `curl` including auth header; verify status code and body.
- For schedules, run once manually to validate before enabling cron.

## Deployment and Environments
- Keep per-environment credentials and endpoints; avoid encoding env-specific values in the JSON export.
- Document which environment the export targets; prefer one export per workflow that is environment-agnostic.
- After import, rebind credentials by name and re-run tests in the target environment.

## Performance and Limits
- Mind provider rate limits; add throttling when looping over lists.
- Use pagination when fetching large datasets; stream or chunk to avoid memory blowups.
- Offload heavy work to queues or background branches; respond early for webhooks.

## Security and Compliance
- Enforce auth on all public webhooks; rotate keys regularly.
- Do not store customer data unnecessarily; minimize payload logging.
- If hosted on Hostinger or similar, comply with `.cursor/rules/110-hostinger-vps-compliance.md` and avoid prohibited tooling.

## Documentation Expectations
- Every workflow must have: goal, trigger, inputs/outputs, credential names, idempotency key, retry policy, alerting channel, owners, and dated test log in `{slug}.md`.
- Update docs when triggers, credentials, or downstream contracts change.
