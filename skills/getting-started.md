# Skill: Getting Started

**Goal**: Set up the CRM platform for local development

**Time**: ~10 minutes

---

## Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- Git

## Steps

### 1. Install Dependencies

```bash
npm install
```

This will install dependencies for all workspaces (web, api, shared, e2e).

### 2. Start Databases

```bash
npm run docker:up
```

This starts PostgreSQL and MongoDB in Docker containers.

### 3. Set Up Environment Variables

```bash
# Copy example env files
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` if needed (defaults work for local dev).

### 4. Run Database Migrations

```bash
npm run db:migrate --workspace=apps/api
```

### 5. Seed the Database

```bash
npm run db:seed --workspace=apps/api
```

This creates test users:
- Admin: `admin@crm.local` / `Admin123!`
- Male: `male@crm.local` / `Male123!`
- Female: `female@crm.local` / `Female123!`

### 6. Start Development Servers

```bash
npm run dev
```

This starts both API (port 3001) and Web (port 5173) in parallel.

### 7. Open in Browser

Navigate to: http://localhost:5173

Login with any test account from step 5.

---

## Verify Setup

- ✅ Can you log in?
- ✅ Can you see the dashboard?
- ✅ Can you navigate to content page?

## Troubleshooting

**Database connection errors?**
- Run `docker-compose ps` to check if containers are running
- Run `docker-compose logs postgres` to see PostgreSQL logs

**Port already in use?**
- Change ports in `apps/api/.env` (PORT) and `apps/web/vite.config.js` (server.port)

**Prisma client errors?**
- Run `npm run db:generate --workspace=apps/api`

---

## Next Steps

- Read `/docs/ARCHITECTURE.md` to understand the codebase
- Try creating content as different users to see RBAC in action
- Explore other skills in `/skills/`

## See Also

- `/docs/DEVELOPMENT.md` - Development workflow
- `/docs/ASSUMPTIONS.md` - Design decisions
- `/.cursorrules` - Coding standards
