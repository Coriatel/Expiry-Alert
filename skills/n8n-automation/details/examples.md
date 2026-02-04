# Examples

## 1) Webhook → Validate → Upstream API → Slack Alert
- Trigger: Webhook POST `/hooks/orders`
- Nodes: Webhook (auth header), Function (validate + add correlationId), HTTP Request (POST to CRM), IF (status >=400), Slack (alert on error), Respond to Webhook (200/400)
- Notes: Respond immediately with 202 and correlationId; run async branch for CRM call and error alerting.

## 2) Scheduled Sync → Paginate → Upsert DB
- Trigger: Cron every 15 minutes
- Nodes: HTTP Request (GET /items?page=1), Loop over pagination with offset param, Function (normalize fields), PostgreSQL (upsert with ON CONFLICT using item_id), Slack (summary counts)
- Notes: Track `lastSyncedAt` in a static data node or external store to reduce load.

## 3) Queue Message → Idempotent Side Effect → Alert on Failures
- Trigger: Kafka/SQS (message contains eventId)
- Nodes: Function (extract eventId, correlationId), PostgreSQL (check eventId processed), IF (already processed -> exit), HTTP Request (call downstream), IF (error), Slack (alert with payload snippet and IDs)
- Notes: Retry HTTP on 5xx/timeouts with backoff; do not retry on 4xx; store processed marker after success.

## 4) Form Submission → Enrich → Email
- Trigger: Webhook from form provider (signed payload)
- Nodes: Webhook (verify signature), Function (validate/enrich), HTTP Request (geo/IP enrichment), Email (send templated email), Respond to Webhook (200/400)
- Notes: Strip PII before logging; enforce signature and timestamp freshness.

## 5) Incident Escalation → On-Call Rotation
- Trigger: Incoming webhook from monitoring tool
- Nodes: Webhook, Function (map severity to on-call target), HTTP Request (PagerDuty/Slack DM), IF (delivery failed), Retry + Alert
- Notes: Include correlationId and monitoring incident ID in all messages.
