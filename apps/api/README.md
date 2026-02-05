# Expiry Alert API

## Environment
Copy `.env.example` to `.env` and fill in values.

Key variables:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- `NOCODB_BASE_URL`, `NOCODB_API_TOKEN`
- `NOCODB_TABLE_*` table IDs (from NocoDB table details)

## NocoDB schema
Create these tables and fields (snake_case):

### users
- `email` (text)
- `name` (text)
- `avatar_url` (text, optional)
- `google_sub` (text)
- `created_at` (datetime)
- `last_login_at` (datetime)

### teams
- `name` (text)
- `owner_id` (number)
- `created_at` (datetime)

### team_memberships
- `team_id` (number)
- `user_id` (number)
- `role` (text)
- `email_alerts_enabled` (boolean)
- `created_at` (datetime)

### invites
- `team_id` (number)
- `email` (text)
- `role` (text)
- `status` (text)
- `created_at` (datetime)
- `accepted_at` (datetime)

### reagents
- `team_id` (number)
- `name` (text)
- `category` (text)
- `expiry_date` (date or datetime)
- `lot_number` (text)
- `received_date` (date or datetime)
- `notes` (long text)
- `is_archived` (boolean)
- `snoozed_until` (datetime)
- `dismissed_until` (datetime)
- `created_at` (datetime)
- `updated_at` (datetime)

### notes
- `team_id` (number)
- `content` (long text)
- `created_at` (datetime)
- `updated_at` (datetime)

### notification_settings
- `team_id` (number)
- `enabled` (boolean)
- `remind_in_days` (number)
- `last_sent_at` (datetime)
