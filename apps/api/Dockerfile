FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@10

# Workspace manifest
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/harvester/package.json ./packages/harvester/

RUN pnpm install --frozen-lockfile --filter api

COPY apps/api/ ./apps/api/
COPY packages/ ./packages/

RUN pnpm --filter api build

# ── Runtime ─────────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

RUN npm install -g pnpm@10

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/harvester/package.json ./packages/harvester/

RUN pnpm install --frozen-lockfile --filter api --prod

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/drizzle ./apps/api/drizzle

EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
