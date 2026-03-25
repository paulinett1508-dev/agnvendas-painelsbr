FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@10

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile --filter web

COPY apps/web/ ./apps/web/

# Em produção a API é servida via proxy nginx no caminho /api
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm --filter web build

# ── Runtime ─────────────────────────────────────────────────────────────────
FROM nginx:stable-alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY infra/nginx/app.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
