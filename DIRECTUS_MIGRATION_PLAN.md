# Directus Migration Plan for Expiry Alert

**Date:** 2026-01-29
**Status:** In Progress
**Goal:** Fully replace NocoDB with Directus as the backend/database for the Expiry Alert API.

## 1. Infrastructure Setup
- [ ] **Docker Compose**: Update `/root/expiry-alert/docker-compose.yml` to include:
    - `directus`: The CMS/API server.
    - `postgres`: The database for Directus (more robust than SQLite for production).
    - `redis`: (Optional) for caching, can skip for now.
- [ ] **Environment**: Update `/root/expiry-alert/apps/api/.env` and create a `.env` for Directus.

## 2. Dependency Management
- [ ] Uninstall NocoDB related code (custom wrappers).
- [ ] Install `@directus/sdk` in `apps/api`.
  ```bash
  npm install @directus/sdk
  ```

## 3. Code Refactoring (`apps/api`)
### A. Configuration
- [ ] Update `src/config.ts`:
    - Remove `NOCODB_*` variables.
    - Add `DIRECTUS_URL`, `DIRECTUS_ADMIN_TOKEN` (for schema mgmt if needed), `DIRECTUS_STATIC_TOKEN` (if using static tokens for server-to-server).

### B. Service Layer (`src/services/directus.ts`)
- [ ] Create a new client wrapper using `@directus/sdk`.
- [ ] Define TypeScript interfaces for the Schema (Users, Teams, Reagents, etc.).
- [ ] Export a typed `directus` client.

### C. Migration of Services
Refactor the following files to use the Directus client instead of `nocodb.ts`:
- [ ] `src/services/users.ts`
- [ ] `src/services/teams.ts`
- [ ] `src/services/reagents.ts`
- [ ] `src/services/notes.ts`
- [ ] `src/services/push.ts`
- [ ] `src/services/settings.ts`
- [ ] `src/services/cron.ts` (Watch out for date filtering syntax changes).

### D. Utility Replacements
- [ ] `src/utils/nocodb.ts` (`whereEq`) -> Directus filter syntax object `{ field: { _eq: value } }`.

## 4. Database Schema (Directus)
Since we are resetting, we need to create these Collections in Directus:
1.  **users**: (Might map to Directus system `directus_users` or a custom collection? Custom is usually safer if we want full control, but system users allows Auth. The current app seems to handle Auth via Passport/Google, so we likely just need a "profile" collection or map to system users. Let's stick to a custom `app_users` or similar to match existing logic if it links to Google IDs).
    - Fields: `googleId`, `email`, `displayName`, `avatarUrl`, etc.
2.  **teams**: `name`, `ownerId` (FK).
3.  **memberships**: `userId` (FK), `teamId` (FK), `role`.
4.  **invites**: `code`, `teamId`, `email`, `expiresAt`.
5.  **reagents**: `name`, `casNumber`, `expiryDate`, `location`, `teamId` (FK).
6.  **notes**: `content`, `reagentId` (FK), `authorId` (FK).
7.  **settings**: Global or User settings.
8.  **push_subscriptions**: `endpoint`, `keys`, `userId`.

## 5. Cleanup
- [ ] Remove `src/services/nocodb.ts`
- [ ] Remove `src/utils/nocodb.ts`
- [ ] Stop and remove the `nocodb` container.

---

## Immediate Next Steps (For Next Session)

1.  **Modify `docker-compose.yml`**: Add Directus and Postgres services.
2.  **Start Services**: `docker compose up -d` to get Directus running.
3.  **Initialize Schema**: Access Directus UI (port 8055) and create the collections/fields (or write a script to do it via API).
4.  **Refactor Code**: Start with `src/services/directus.ts` and `src/config.ts`.

## Current State
- NocoDB integration is broken (Auth/Token issues).
- Codebase fully relies on `src/services/nocodb.ts` abstraction, making it "easy" to swap the underlying driver.
