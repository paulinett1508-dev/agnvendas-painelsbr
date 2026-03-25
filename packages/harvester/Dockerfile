FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/harvester/package.json packages/harvester/
COPY apps/api/package.json apps/api/
RUN pnpm install --filter harvester
COPY packages/harvester/ packages/harvester/
COPY apps/api/src/db/ apps/api/src/db/
CMD ["node", "--loader", "tsx/esm", "packages/harvester/src/index.ts"]
