# n8n Automation — Anti-Patterns

## Anti-Pattern 1: Webhook Without Auth
### ❌ DON'T
- Public webhook with no auth, returning full errors to callers
### ✅ DO
- Require API key/signature header; respond with minimal message; log details privately

## Anti-Pattern 2: No Idempotency
### ❌ DON'T
- Perform side effects (DB insert, external POST) without checking duplicates
### ✅ DO
- Use request/message ID as idempotency key and short-circuit if already processed

## Anti-Pattern 3: Retrying All Errors
### ❌ DON'T
- Retry 4xx responses and amplify bad requests
### ✅ DO
- Retry only transient errors (5xx/timeouts/429 with backoff); alert on persistent 4xx

## Anti-Pattern 4: Secrets in Expressions
### ❌ DON'T
- Paste API tokens or passwords into node parameters or Function code
### ✅ DO
- Use n8n credentials by name; keep only credential names in repo; rotate tokens regularly

## Anti-Pattern 5: Silent Failures
### ❌ DON'T
- Let error branches die quietly with no alerting or correlation info
### ✅ DO
- Route errors to a notification channel with correlation ID, payload snippet, node name, and status
