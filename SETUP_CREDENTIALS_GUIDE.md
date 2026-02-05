# 🔑 Complete Setup Guide - Get All Credentials

**Project:** Expiry Alert Web App
**Location:** `/root/expiry-alert/`
**Status:** Code Complete - Credentials Setup Required
**Last Updated:** 2026-01-28

---

## 📋 What You Need

1. **GitHub Authentication** (to push code)
2. **Google OAuth Credentials** (for user login)
3. **NocoDB Setup** (database)
4. **VAPID Keys** (for push notifications - already generated)

**Estimated Time:** 40 minutes total

---

## Part 1: GitHub Authentication (5 minutes)

### Option A: GitHub CLI (Easiest)

**Step 1:** Run this command:
```bash
gh auth login
```

**Step 2:** You'll see prompts. Choose these answers:
- "What account do you want to log into?" → **GitHub.com**
- "What is your preferred protocol?" → **HTTPS**
- "Authenticate Git with your GitHub credentials?" → **Yes**
- "How would you like to authenticate?" → **Login with a web browser**

**Step 3:** Copy the 8-character code shown

**Step 4:** Press Enter - a browser will open

**Step 5:** Paste the code and click "Authorize"

**Step 6:** Test it works:
```bash
gh auth status
```

You should see: "✓ Logged in to github.com"

---

## Part 2: Google OAuth Credentials (10 minutes)

### Step 1: Go to Google Cloud Console

Open: https://console.cloud.google.com/

### Step 2: Create a New Project (or select existing)

1. Click the **project dropdown** at the top (says "Select a project")
2. Click **"NEW PROJECT"**
3. Enter project name: `expiry-alert`
4. Click **"CREATE"**
5. Wait 30 seconds, then select your new project from the dropdown

### Step 3: Enable Google+ API

1. Go to: https://console.cloud.google.com/apis/library
2. Search for: `Google+ API`
3. Click on it
4. Click **"ENABLE"**
5. Wait for it to enable

### Step 4: Create OAuth Credentials

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click **"CREATE CREDENTIALS"** at the top
3. Choose **"OAuth client ID"**

### Step 5: Configure Consent Screen (if prompted)

If you see "Configure Consent Screen":

1. Click **"CONFIGURE CONSENT SCREEN"**
2. Choose **"External"** → Click **"CREATE"**
3. Fill in:
   - **App name:** `Expiry Alert`
   - **User support email:** (your email)
   - **Developer contact:** (your email)
4. Click **"SAVE AND CONTINUE"**
5. Click **"SAVE AND CONTINUE"** (skip scopes)
6. Click **"SAVE AND CONTINUE"** (skip test users)
7. Click **"BACK TO DASHBOARD"**

### Step 6: Create OAuth Client ID

1. Go back to: https://console.cloud.google.com/apis/credentials
2. Click **"CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Choose **"Application type"** → **"Web application"**
4. Enter **Name:** `Expiry Alert Web`
5. Under **"Authorized JavaScript origins"** click **"ADD URI"**:
   - Add: `http://localhost:5173` (for development)
   - Add: `http://localhost:3001` (for API)
6. Under **"Authorized redirect URIs"** click **"ADD URI"**:
   - Add: `http://localhost:3001/api/auth/google/callback`
7. Click **"CREATE"**

### Step 7: Save Your Credentials

You'll see a popup with:
- **Your Client ID** (looks like: `123456789-abcdef.apps.googleusercontent.com`)
- **Your Client Secret** (looks like: `GOCSPX-abc123def456`)

**IMPORTANT:** Copy both and save them in `/root/expiry-alert/CREDENTIALS.txt` (don't commit this file!)

---

## Part 3: NocoDB Setup (15 minutes)

### Step 1: Install NocoDB (if not already installed)

```bash
docker run -d --name nocodb \
  -p 8086:8080 \
  -v /root/nocodb:/usr/app/data \
  --restart unless-stopped \
  nocodb/nocodb:latest
```

Wait 30 seconds for it to start.

### Step 2: Access NocoDB

Open in browser: http://YOUR_VPS_IP:8086

(Or if running locally: http://localhost:8086)

### Step 3: Create Account

1. Click **"Sign Up"**
2. Enter email and password
3. Click **"Sign Up"**

### Step 4: Create New Base

1. Click **"+ New Base"**
2. Name it: `expiry_alert`
3. Click **"Create"**

### Step 5: Create Tables

You need to create **8 tables**. For each table:

#### Table 1: Users
1. Click **"Add new table"**
2. Name: `Users`
3. Add these columns (click **+ Column** for each):

| Column Name | Type |
|-------------|------|
| `google_id` | SingleLineText |
| `email` | Email |
| `name` | SingleLineText |
| `avatar_url` | URL |
| `created_at` | DateTime |

#### Table 2: Teams
1. Click **"Add new table"**
2. Name: `Teams`
3. Add columns:

| Column Name | Type |
|-------------|------|
| `name` | SingleLineText |
| `created_at` | DateTime |

#### Table 3: Memberships
1. Click **"Add new table"**
2. Name: `Memberships`
3. Add columns:

| Column Name | Type |
|-------------|------|
| `user_id` | Number |
| `team_id` | Number |
| `role` | SingleSelect (options: owner, admin, member) |
| `created_at` | DateTime |

#### Table 4: Invites
1. Click **"Add new table"**
2. Name: `Invites`
3. Add columns:

| Column Name | Type |
|-------------|------|
| `team_id` | Number |
| `email` | Email |
| `role` | SingleSelect (options: admin, member) |
| `token` | SingleLineText |
| `expires_at` | DateTime |
| `created_at` | DateTime |

#### Table 5: Reagents
1. Click **"Add new table"**
2. Name: `Reagents`
3. Add columns:

| Column Name | Type |
|-------------|------|
| `team_id` | Number |
| `name` | SingleLineText |
| `category` | SingleSelect (options: reagents, beads) |
| `expiry_date` | Date |
| `lot_number` | SingleLineText |
| `received_date` | Date |
| `notes` | LongText |
| `is_archived` | Checkbox |
| `snoozed_until` | DateTime |
| `dismissed_until` | DateTime |
| `created_at` | DateTime |
| `updated_at` | DateTime |

#### Table 6: Notes
1. Click **"Add new table"**
2. Name: `Notes`
3. Add columns:

| Column Name | Type |
|-------------|------|
| `team_id` | Number |
| `content` | LongText |
| `created_at` | DateTime |

#### Table 7: Settings
1. Click **"Add new table"**
2. Name: `Settings`
3. Add columns:

| Column Name | Type |
|-------------|------|
| `team_id` | Number |
| `enabled` | Checkbox |
| `remind_in_days` | Number |
| `last_sent_at` | DateTime |
| `created_at` | DateTime |

#### Table 8: PushSubscriptions
1. Click **"Add new table"**
2. Name: `PushSubscriptions`
3. Add columns:

| Column Name | Type |
|-------------|------|
| `user_id` | Number |
| `endpoint` | LongText |
| `p256dh` | LongText |
| `auth` | LongText |
| `created_at` | DateTime |

### Step 6: Get API Token

1. Click your **profile icon** (top right)
2. Click **"Account Settings"**
3. Click **"Tokens"** tab
4. Click **"+ Add New Token"**
5. Enter description: `Expiry Alert API`
6. Click **"Generate"**
7. **COPY THE TOKEN** - you won't see it again!
8. Save it in `/root/expiry-alert/CREDENTIALS.txt`

### Step 7: Get Table IDs

For each table you created:

1. Click on the table name
2. Look at the URL in your browser
3. The URL looks like: `http://localhost:8086/nc/base_abc123/table_xyz789`
4. Copy the part after `/table_` (that's the Table ID)

Do this for all 8 tables and save them in `/root/expiry-alert/CREDENTIALS.txt`:

```
Users table ID: _____________
Teams table ID: _____________
Memberships table ID: _____________
Invites table ID: _____________
Reagents table ID: _____________
Notes table ID: _____________
Settings table ID: _____________
PushSubscriptions table ID: _____________
```

---

## Part 4: Generate VAPID Keys (2 minutes)

Run this command:

```bash
cd /root/expiry-alert/apps/api
npx web-push generate-vapid-keys
```

You'll see output like:
```
Public Key: BDe8x...abc123
Private Key: xyz789...def456
```

**Copy both keys** and save in `/root/expiry-alert/CREDENTIALS.txt`

---

## Part 5: Create .env File (5 minutes)

Now create the configuration file:

```bash
cd /root/expiry-alert/apps/api
nano .env
```

Paste this and **fill in YOUR values from CREDENTIALS.txt**:

```bash
# Server
NODE_ENV=development
PORT=3001
APP_BASE_URL=http://localhost:5173

# Session (generate random string with: openssl rand -base64 32)
SESSION_SECRET=your-random-secret-here-make-it-long-and-random
SESSION_NAME=expiryalert.sid

# Google OAuth (from Part 2)
GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# VAPID Keys (from Part 4)
VAPID_PUBLIC_KEY=BDe8x...abc123
VAPID_PRIVATE_KEY=xyz789...def456
VAPID_SUBJECT=mailto:your-email@example.com

# NocoDB (from Part 3)
NOCODB_BASE_URL=http://localhost:8086
NOCODB_API_TOKEN=your-nocodb-api-token-here

# NocoDB Table IDs (from Part 3 Step 7)
NOCODB_TABLE_USERS=tbl_abc123
NOCODB_TABLE_TEAMS=tbl_def456
NOCODB_TABLE_MEMBERSHIPS=tbl_ghi789
NOCODB_TABLE_INVITES=tbl_jkl012
NOCODB_TABLE_REAGENTS=tbl_mno345
NOCODB_TABLE_NOTES=tbl_pqr678
NOCODB_TABLE_SETTINGS=tbl_stu901
NOCODB_TABLE_PUSH_SUBSCRIPTIONS=tbl_vwx234
```

**Press:** `Ctrl + X`, then `Y`, then `Enter` to save.

---

## Part 6: Test Everything (5 minutes)

### Test 1: Start the API

```bash
cd /root/expiry-alert/apps/api
npm run dev
```

You should see:
```
Expiry Alert API listening on 3001
```

If you see errors about missing env vars, check your `.env` file.

### Test 2: Start the Web App (in a new terminal)

```bash
cd /root/expiry-alert/apps/web
npm run dev
```

You should see:
```
Local:   http://localhost:5173/
```

### Test 3: Open in Browser

1. Open: http://localhost:5173
2. You should see the login page
3. Click **"Continue with Google"**
4. Login with your Google account
5. You should see the Dashboard!

---

## Part 7: Push to GitHub

Now that everything works, push your code:

```bash
cd /root/expiry-alert
git push origin claude/reagent-expiration-tracker-d0bju
```

Create PR:
```bash
gh pr create --title "feat: Complete web app PWA conversion" --body "Complete PWA conversion with calendar export and mobile UI"
```

---

## 🎉 Done!

You now have:
- ✅ GitHub authentication working
- ✅ Google OAuth configured
- ✅ NocoDB database set up
- ✅ VAPID keys for push notifications
- ✅ Web app running locally
- ✅ Code pushed to GitHub

---

## 🆘 Troubleshooting

### "Cannot read Username for GitHub"
→ Run: `gh auth login` again

### "Missing environment variables"
→ Check your `/root/expiry-alert/apps/api/.env` file has all values filled in

### "Failed to connect to NocoDB"
→ Make sure NocoDB is running: `docker ps | grep nocodb`

### Google OAuth error "redirect_uri_mismatch"
→ Check the redirect URI in Google Console matches: `http://localhost:3001/api/auth/google/callback`

---

## 📞 Support

Need help? Check:
- `/root/expiry-alert/COMPLETION_PLAN.md` - Overall completion plan
- `/root/expiry-alert/apps/web/PWA_PROGRESS.md` - PWA implementation status
- `/root/AI_JOBS.md` - Task #13 for Expiry Alert Web App

---

**Next Steps:** See `/root/expiry-alert/COMPLETION_PLAN.md`
