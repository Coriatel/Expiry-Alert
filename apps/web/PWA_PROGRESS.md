# Expiry Alert PWA Conversion Progress

**Status:** Phase 4 Complete (ICS Calendar Export)
**Last Updated:** 2026-01-29
**Plan:** `~/.claude/plans/async-yawning-map.md` (Internal Claude plan)

## Goal
Convert the existing `apps/web` React application into a Progressive Web App (PWA) with:
- Mobile-first responsive design
- Push notifications (background alerts)
- ICS calendar export (no OAuth)
- Offline support

## Implementation Phases

### Phase 1: PWA Foundation (Web App) - COMPLETED
- [x] Install `vite-plugin-pwa` and `workbox-window`
- [x] Configure `vite.config.ts` with PWA plugin (manifest, caching, icons)
- [x] Update `index.html` with PWA meta tags and icon links
- [x] Generate PWA icons (192, 512, maskable) from existing Tauri assets
- [x] Create `public/mask-icon.svg`
- [x] Register Service Worker in `src/main.tsx` (`virtual:pwa-register`)
- [x] Add type definitions in `src/vite-env.d.ts`
- [x] Verify build (`npm run build`)

### Phase 2: Push Notification Backend - COMPLETED
- [x] Install `web-push` and `node-cron` in `apps/api`
- [x] Generate VAPID keys
- [x] Directus schema created for push subscriptions (`push_subscriptions`)
- [x] Create API endpoints:
    - `POST /api/push/subscribe`
    - `DELETE /api/push/unsubscribe`
    - `POST /api/push/test`
- [x] Implement daily cron scheduler for expiry alerts

### Phase 3: Frontend Push Integration - COMPLETED
- [x] Create Push Permission UI (Settings page / Login prompt)
- [x] Implement Service Worker push event listeners (`sw.ts`)
- [x] Handle notification clicks (open app, navigate to item)
- [x] Switch to `injectManifest` strategy in `vite.config.ts`

### Phase 4: ICS Calendar Export - COMPLETED
- [x] Install `ics` package in `apps/api`
- [x] Create ICS generator service (`src/services/calendar.ts`)
- [x] Create API endpoint `GET /api/calendar/export.ics`
- [x] Create API endpoint `GET /api/calendar/reagent/:id.ics` (single item export)
- [x] Add "Export to Calendar" button in Settings page
- [x] Add i18n translations (English + Hebrew)

### Phase 5: Responsive Design Enhancement - COMPLETED
- [x] Mobile bottom navigation bar
- [x] Touch-friendly improvements (min 48px targets)
- [x] Hamburger menu for mobile
- [x] Safe area support for iOS devices (notch)
- [x] Sticky header navigation

## Key Files Modified/Created

### API
- `apps/api/src/services/calendar.ts` (ICS generator)
- `apps/api/src/routes/calendar.ts` (calendar endpoints)
- `apps/api/src/index.ts` (added calendar router)

### Web
- `apps/web/vite.config.ts` (PWA config)
- `apps/web/index.html` (Meta tags, viewport-fit)
- `apps/web/src/main.tsx` (SW registration)
- `apps/web/src/App.tsx` (mobile navigation, responsive layout)
- `apps/web/src/pages/Settings.tsx` (calendar export UI)
- `apps/web/src/index.css` (safe area, touch targets, animations)
- `apps/web/src/i18n/locales/en.json` (calendar translations)
- `apps/web/src/i18n/locales/he.json` (calendar translations)

## Notes
- **Icons:** Generated using ImageMagick from `src-tauri/icons/128x128@2x.png`
- **Service Worker:** Using `injectManifest` strategy for push notifications
- **Calendar Export:** Generates ICS files with 7-day, 3-day, and same-day reminders
- **Mobile:** Bottom navigation with safe area support for iOS

## Remaining Manual Steps
1. Verify Google OAuth login in production
2. Subscribe to push notifications and confirm cron delivery

**Completed:** Directus migration + production build deployed on 2026-01-29.
