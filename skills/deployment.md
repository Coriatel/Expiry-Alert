# Skill: Deployment

**Goal**: Deploy the CRM platform to production

**Time**: ~30 minutes

---

## Pre-Deployment Checklist

- [ ] All tests passing (`npm test` + `npm run test:e2e`)
- [ ] Environment variables configured for production
- [ ] Database migrations ready
- [ ] Secrets stored securely (not in code)
- [ ] CORS configured for production domain
- [ ] Rate limiting enabled
- [ ] Logs configured
- [ ] Backup strategy in place

---

## Option 1: Docker Deployment

### 1. Create Dockerfiles

**API Dockerfile** (`apps/api/Dockerfile`):

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY prisma ./prisma/

RUN npm install --workspace=apps/api

COPY apps/api ./apps/api

RUN cd prisma/postgres && npx prisma generate

EXPOSE 3001

CMD ["npm", "start", "--workspace=apps/api"]
```

**Web Dockerfile** (`apps/web/Dockerfile`):

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

RUN npm install --workspace=apps/web

COPY apps/web ./apps/web

RUN npm run build --workspace=apps/web

FROM nginx:alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

### 2. Create Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.9'

services:
  api:
    build: ./apps/api
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres

  web:
    build: ./apps/web
    ports:
      - "80:80"

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: crm_db
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 3. Deploy

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## Option 2: Platform-as-a-Service

### Deploy to Railway

1. Install Railway CLI:
```bash
npm i -g @railway/cli
```

2. Login and init:
```bash
railway login
railway init
```

3. Add services:
```bash
railway add --database postgres
railway add --database mongodb
```

4. Deploy API:
```bash
cd apps/api
railway up
```

5. Deploy Web:
```bash
cd apps/web
railway up
```

6. Set environment variables in Railway dashboard

---

## Option 3: Deploy to Vercel + Supabase

### Frontend (Vercel)

```bash
cd apps/web
vercel
```

Configure build:
- Build Command: `npm run build`
- Output Directory: `dist`

### Backend (Railway/Render)

Deploy API to Railway or Render.com

### Database (Supabase)

1. Create Supabase project
2. Copy connection string
3. Update `DATABASE_URL` in API env vars
4. Run migrations:
```bash
npx prisma migrate deploy
```

---

## Post-Deployment

### 1. Run Migrations

```bash
ssh your-server
cd /app
npx prisma migrate deploy
```

### 2. Seed Production Database (First Time Only)

```bash
npm run db:seed --workspace=apps/api
```

### 3. Verify Health

```bash
curl https://your-domain/health
curl https://your-api-domain/health
```

### 4. Monitor Logs

```bash
# Docker
docker-compose logs -f api

# Railway
railway logs
```

### 5. Set Up Monitoring

Consider adding:
- Uptime monitoring (UptimeRobot, Pingdom)
- Error tracking (Sentry)
- Analytics (Google Analytics, Mixpanel)

---

## Environment Variables (Production)

**API (.env.production)**:
```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:password@host:5432/db
MONGO_URL=mongodb://user:password@host:27017/db
JWT_SECRET=your-super-secret-key-min-32-chars
REFRESH_TOKEN_SECRET=different-secret-key
CORS_ORIGIN=https://yourdomain.com
```

**Web**:
Update Vite proxy to point to production API URL.

---

## Rollback Plan

If deployment fails:

1. **Docker**: `docker-compose down && docker-compose up -d` (previous image)
2. **Vercel**: Revert to previous deployment in dashboard
3. **Database**: Restore from backup

---

## Security Checklist

- [ ] HTTPS enabled
- [ ] Environment secrets not in code
- [ ] CORS restricted to your domain
- [ ] Rate limiting enabled
- [ ] SQL injection prevented (Prisma handles this)
- [ ] XSS prevention (React escapes by default)
- [ ] Helmet.js security headers
- [ ] Strong JWT secrets (32+ chars)
- [ ] Database backups scheduled

---

## See Also

- `/docs/DEPLOYMENT.md` - Detailed deployment guide
- Docker Docs: https://docs.docker.com
- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
