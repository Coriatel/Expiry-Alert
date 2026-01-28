FROM node:20-slim AS builder

WORKDIR /app
COPY . .

RUN npm ci
RUN npm run build --workspace=@expiry-alert/web
RUN npm run build --workspace=@expiry-alert/api

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/web/dist ./apps/web/dist

CMD ["node", "apps/api/dist/index.js"]
