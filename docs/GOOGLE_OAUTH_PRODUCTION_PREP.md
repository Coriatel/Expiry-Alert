# Google OAuth Production Prep (Expiry Alert)

Last updated: 2026-02-03

This checklist is for moving Expiry Alert OAuth from **Testing** to **Production**.

## What Is Already Prepared In The App

- Public privacy page is available at `https://expiryalert.coriathost.cloud/privacy`.
- Public terms page is available at `https://expiryalert.coriathost.cloud/terms`.
- Login page links to both legal pages.
- OAuth redirect URI in server config is:
  `https://expiryalert.coriathost.cloud/api/auth/google/callback`.
- Google Calendar integration requests only:
  `https://www.googleapis.com/auth/calendar.events`.

## What You Must Do In Google Cloud Console

1. Open Google Cloud Console and select the project used by Expiry Alert.
2. Go to **Google Auth Platform** (or **APIs & Services** OAuth pages).
3. In OAuth consent screen / Branding:
   - App name: `Expiry Alert` (or your final public name)
   - Support email: your support inbox
   - App homepage: `https://expiryalert.coriathost.cloud`
   - Privacy policy: `https://expiryalert.coriathost.cloud/privacy`
   - Terms of service: `https://expiryalert.coriathost.cloud/terms`
4. Add authorized domain `coriathost.cloud`.
5. Verify domain ownership in Search Console if requested.
6. In OAuth client settings, confirm redirect URI includes exactly:
   `https://expiryalert.coriathost.cloud/api/auth/google/callback`
7. In Data Access / Scopes, keep only required scopes:
   - `profile`
   - `email`
   - `https://www.googleapis.com/auth/calendar.events`
8. Submit OAuth app verification.
9. Publish app to **In production** after required checks are complete.

## Verification Submission Notes (Use This Wording)

- Why this scope is needed:
  - "The app creates Google Calendar events only when the signed-in user explicitly requests alert creation for selected reagent expiry items."
- How data is used:
  - "Access is used only to create events in the user's own calendar; no background calendar reads are required for core workflow."
- User control:
  - "User can disconnect Google Calendar from app settings at any time."

## Demo Video Checklist For Google Review

Record one short video showing:

1. App homepage.
2. Privacy policy page.
3. Terms page.
4. Google sign-in.
5. Connect Google Calendar in Settings.
6. Select active reagents.
7. Choose manual date/time and create event(s).
8. Show created event(s) in Google Calendar.

## If You Stay On Testing For Now

- Add each friend Gmail under **Test users** in OAuth consent screen.
- They can use the app immediately after being added.
- This is acceptable for early closed testing.
