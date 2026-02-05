FROM node:22-slim AS builder

WORKDIR /app
COPY . .

# Some branches have package-lock drift; use install here for resilient VPS deploys.
RUN npm install --no-audit --no-fund
RUN npm run build --workspace=@expiry-alert/web
RUN npm run build --workspace=@expiry-alert/api

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/web/dist ./apps/web/dist

CMD ["node", "apps/api/dist/index.js"]
