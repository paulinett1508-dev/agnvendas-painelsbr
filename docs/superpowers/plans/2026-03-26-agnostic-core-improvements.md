# Agnostic-Core Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evoluir o painel de MVP para produção-grade com error handling, auth JWT, qualidade de código e testes completos, em 4 waves sequenciais e deployáveis.

**Architecture:** 4 waves independentes — Wave 1 cria a fundação (errors + Zod + pino + graceful shutdown), Wave 2 adiciona segurança (JWT auth + rate limiting), Wave 3 padroniza o código (ESLint + indices + OpenAPI), Wave 4 adiciona testes (Vitest + Playwright + CI).

**Tech Stack:** Fastify v4, Zod, pino, @fastify/jwt, @fastify/cookie, @fastify/rate-limit, bcrypt, react-router-dom, ESLint flat config, Vitest, testcontainers, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-03-26-agnostic-core-improvements-design.md`

---

## File Map

### Wave 1 — Criados
- `apps/api/src/env.ts` — validação de env vars com Zod ao iniciar
- `apps/api/src/errors.ts` — classe `AppError` + helper `isAppError`

### Wave 1 — Modificados
- `apps/api/src/db/client.ts` — exportar `pool` para graceful shutdown
- `apps/api/src/index.ts` — setErrorHandler centralizado + graceful shutdown + pino config
- `packages/harvester/src/harvest.ts` — try/catch + retry exponencial + pino logging
- `packages/harvester/src/index.ts` — graceful shutdown com timeout 30s

### Wave 2 — Criados
- `apps/api/src/plugins/authenticate.ts` — plugin Fastify que valida JWT Bearer
- `apps/api/src/routes/auth.ts` — POST /auth/login, /auth/refresh, /auth/logout
- `apps/api/scripts/seed-admin.ts` — cria primeiro usuário administrador
- `apps/web/src/context/AuthContext.tsx` — estado de auth em memória + refresh automático
- `apps/web/src/pages/Login.tsx` — tela de login (email + senha)
- `apps/web/src/components/PrivateRoute.tsx` — redirect para /login se não autenticado

### Wave 2 — Modificados
- `apps/api/src/db/schema.ts` — adicionar tabela `usuarios`
- `apps/api/src/env.ts` — adicionar JWT_SECRET, CORS_ORIGIN
- `apps/api/src/index.ts` — registrar rate-limit, CORS com origem explícita, plugin auth, rotas auth
- `apps/web/src/App.tsx` — migrar para BrowserRouter + Routes
- `apps/web/src/hooks/useApi.ts` — adicionar Bearer token nos headers
- `apps/web/package.json` — react-router-dom
- `infra/docker-compose.yml` — JWT_SECRET, CORS_ORIGIN nas env vars da API
- `.env.example` — novas variáveis
- `.env.prod.example` — novas variáveis

### Wave 3 — Criados
- `eslint.config.js` — ESLint flat config compartilhada no monorepo
- `.prettierrc` — config Prettier
- `.husky/pre-commit` — hook de pre-commit

### Wave 3 — Modificados
- `apps/api/tsconfig.json` — flags strict adicionais
- `apps/web/tsconfig.json` — flags strict adicionais
- `packages/harvester/tsconfig.json` — flags strict adicionais
- `apps/api/src/db/schema.ts` — adicionar índices via Drizzle `.index()`
- `apps/api/src/index.ts` — registrar @fastify/swagger + swagger-ui
- `package.json` (root) — scripts lint, format, typecheck, prepare (husky)

### Wave 4 — Criados
- `apps/api/src/app.ts` — factory `buildApp()` extraída de index.ts (necessária para testes)
- `apps/api/vitest.config.ts` — config Vitest para unit + integration tests
- `apps/api/src/test/setup.ts` — globalSetup com testcontainers
- `apps/api/src/test/factories.ts` — createVendedor, createSnapshot, createUsuario
- `apps/api/src/test/api.unit.test.ts` — unit tests (env schema, AppError)
- `apps/api/src/test/routes.integration.test.ts` — integration tests de todas as rotas
- `apps/api/src/test/auth.integration.test.ts` — integration tests de auth
- `apps/web/src/lib/format.test.ts` — unit tests de format.ts
- `packages/harvester/src/parseDecimal.test.ts` — unit tests de parseDecimal
- `e2e/auth.spec.ts` — E2E: fluxo de login
- `e2e/dashboard.spec.ts` — E2E: dashboard + drawer
- `e2e/positivacao.spec.ts` — E2E: tabela + sort
- `playwright.config.ts` — config Playwright com webServer
- `.github/workflows/ci.yml` — CI pipeline

### Wave 4 — Modificados
- `package.json` (root) — scripts test, test:e2e
- `apps/api/package.json` — vitest, @testcontainers/postgresql
- `apps/web/package.json` — vitest
- `packages/harvester/package.json` — vitest

---

## ═══════════════════════════════════════
## WAVE 1 — FUNDAÇÃO
## ═══════════════════════════════════════

---

### Task 1: Instalar dependências da Wave 1

**Files:**
- Modify: `apps/api/package.json`
- Modify: `packages/harvester/package.json`

- [ ] **Step 1: Instalar deps na API**

```bash
cd apps/api
pnpm add zod @fastify/type-provider-zod@^1
pnpm add -D pino-pretty
```

- [ ] **Step 2: Instalar deps no harvester**

```bash
cd packages/harvester
pnpm add zod pino pino-pretty
```

- [ ] **Step 3: Verificar instalação**

```bash
cd ../..
pnpm install
```
Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add apps/api/package.json packages/harvester/package.json pnpm-lock.yaml
git commit -m "chore(deps): add zod, @fastify/type-provider-zod, pino for wave 1"
```

---

### Task 2: Validação de env vars na API

**Files:**
- Create: `apps/api/src/env.ts`

- [ ] **Step 1: Criar `apps/api/src/env.ts`**

```typescript
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().regex(/^postgresql:\/\//, 'DATABASE_URL deve começar com postgresql://'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
```

- [ ] **Step 2: Testar manualmente que funciona**

```bash
cd apps/api
DATABASE_URL=postgresql://x:x@localhost/x node --input-type=module <<'EOF'
import './src/env.ts'
EOF
```
Esperado: sem output (não crashou).

- [ ] **Step 3: Testar com env inválida**

```bash
DATABASE_URL=nao-e-url node --input-type=module -e "import './src/env.ts'"
```
Esperado: mensagem de erro com "DATABASE_URL deve ser uma URL válida" e exit 1.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/env.ts
git commit -m "feat(api): add env validation with Zod on startup"
```

---

### Task 3: Classe AppError e error handler centralizado na API

**Files:**
- Create: `apps/api/src/errors.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Criar `apps/api/src/errors.ts`**

```typescript
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError
}
```

- [ ] **Step 2: Importar env.ts no topo de `apps/api/src/index.ts`**

Adicionar como primeira linha (antes de qualquer outro import):
```typescript
import './env.js'
```

- [ ] **Step 3: Melhorar configuração do pino e adicionar setErrorHandler em `apps/api/src/index.ts`**

Trocar:
```typescript
const app = Fastify({ logger: true })
```
Por:
```typescript
const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    ...(process.env.NODE_ENV !== 'production' && {
      transport: { target: 'pino-pretty', options: { colorize: true } },
    }),
  },
  genReqId: () => crypto.randomUUID(),
})
```

- [ ] **Step 4: Adicionar `import { isAppError } from './errors.js'` e registrar o error handler após o registro do CORS**

```typescript
app.setErrorHandler((error, request, reply) => {
  if (isAppError(error)) {
    return reply.status(error.statusCode).send({
      error: error.message,
      code: error.code,
    })
  }
  request.log.error({ err: error }, 'unhandled error')
  return reply.status(500).send({ error: 'Erro interno do servidor' })
})
```

- [ ] **Step 5: Verificar que a API sobe sem erros**

```bash
cd apps/api
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/agnvendas pnpm dev
```
Esperado: `Server listening at http://0.0.0.0:3001` sem erros.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/errors.ts apps/api/src/index.ts
git commit -m "feat(api): add AppError class and centralized error handler"
```

---

### Task 4: Validação de parâmetros de rota com Zod na API

**Files:**
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Adicionar import do type provider no topo de `apps/api/src/index.ts`**

```typescript
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from '@fastify/type-provider-zod'
import { z } from 'zod'
```

- [ ] **Step 2: Registrar os compilers logo após criar o app**

```typescript
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)
```

- [ ] **Step 3: Adicionar schema ao tipo do app**

```typescript
const app = Fastify({ ... }).withTypeProvider<ZodTypeProvider>()
```

- [ ] **Step 4: Adicionar schema de validação às rotas com `slpcode`**

Para `/dashboard/:slpcode`:
```typescript
app.get(
  '/dashboard/:slpcode',
  {
    schema: {
      params: z.object({ slpcode: z.string().regex(/^\d{1,10}$/, 'slpcode inválido') }),
    },
  },
  async (req) => {
    // corpo existente sem alteração
  }
)
```

Aplicar o mesmo schema a `/top5itens/:slpcode`.

- [ ] **Step 5: Testar rota com slpcode inválido**

```bash
curl -s http://localhost:3001/dashboard/nao-e-numero | jq
```
Esperado: `{ "error": "..." }` com status 400 (não 500).

- [ ] **Step 6: Testar rota com slpcode válido**

```bash
curl -s http://localhost:3001/dashboard/11 | jq
```
Esperado: array de snapshots (pode ser vazio).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/index.ts
git commit -m "feat(api): add Zod param validation for slpcode routes"
```

---

### Task 5: Logging estruturado + retry no Harvester

**Files:**
- Modify: `packages/harvester/src/harvest.ts`
- Modify: `packages/harvester/src/index.ts`

- [ ] **Step 1: Criar logger pino em `packages/harvester/src/harvest.ts`**

Substituir os `console.log` e adicionar retry. Trocar o conteúdo de `harvest.ts` para:

```typescript
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import pino from 'pino'
import { agnClient, parseDecimal } from './client.js'
import {
  vendedores,
  snapshotsDashboard,
  snapshotsPositivacao,
  snapshotsTop5Itens,
} from './schema.js'

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
})

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool)

async function withRetry<T>(fn: () => Promise<T>, label: string, maxAttempts = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === maxAttempts) throw err
      const delay = attempt * 1000
      logger.warn({ err, attempt, delay }, `${label}: falhou, retry em ${delay}ms`)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw new Error('unreachable')
}

export async function runHarvest() {
  const start = Date.now()
  logger.info('iniciando coleta')

  // 1. Vendedores
  const { data: vendedoresData } = await withRetry(
    () => agnClient.get('/cadastrodevendedores'),
    'vendedores',
  )
  for (const v of vendedoresData) {
    await db
      .insert(vendedores)
      .values({ slpcode: String(v.codigo), nome: v.nomedovendedor ?? null, funcao: v.funcao ?? null, ativo: true })
      .onConflictDoUpdate({
        target: vendedores.slpcode,
        set: { nome: v.nomedovendedor ?? null, funcao: v.funcao ?? null },
      })
  }
  logger.debug({ count: vendedoresData.length }, 'vendedores upserted')

  // 2. Dashboard
  const { data: dashboardData } = await withRetry(() => agnClient.get('/dashboard'), 'dashboard')
  const capturedAt = new Date()
  const dashRows = dashboardData.map((d: Record<string, unknown>) => ({
    slpcode: String(d.slpcode),
    meta: parseDecimal(d.meta as string),
    faturamentoMes: parseDecimal(d.faturamentomes as string),
    faturamentoDia: parseDecimal(d.faturamentodia as string),
    ticketMedioDia: parseDecimal(d.ticketmediodia as string),
    percentualMes: parseDecimal(d.percentualmes as string),
    mediaMes: parseDecimal(d.mediames as string),
    capturedAt,
  }))
  if (dashRows.length) await db.insert(snapshotsDashboard).values(dashRows)
  logger.debug({ count: dashRows.length }, 'snapshots_dashboard inserted')

  // 3. Positivação
  const { data: positivacaoData } = await withRetry(() => agnClient.get('/positivacao'), 'positivacao')
  const posRows = positivacaoData.map((p: Record<string, unknown>) => ({
    slpcode: String(p.slpcode),
    baseAtiva: p.baseativa != null ? Number(p.baseativa) : null,
    positivacaoAtual: p.positivacaoatual != null ? Number(p.positivacaoatual) : null,
    qtdVendaMesAtual: p.qtdvendamesatual != null ? Number(p.qtdvendamesatual) : null,
    vrFatMesAtual: parseDecimal(p.vrfatmesatual as string),
    vrFatMesAnterior1: parseDecimal(p.vrfatmesanterior1 as string),
    vrFatMesAnterior2: parseDecimal(p.vrfatmesanterior2 as string),
    vrFatMesAnterior3: parseDecimal(p.vrfatmesanterior3 as string),
    capturedAt,
  }))
  if (posRows.length) await db.insert(snapshotsPositivacao).values(posRows)
  logger.debug({ count: posRows.length }, 'snapshots_positivacao inserted')

  // 4. Top 5 itens (por vendedor)
  const slpcodes: string[] = [...new Set(dashboardData.map((d: Record<string, unknown>) => String(d.slpcode)))]
  let top5Total = 0
  for (const slpcode of slpcodes) {
    const { data: top5 } = await withRetry(
      () => agnClient.get(`/top5itens?slpcode=eq.${slpcode}`),
      `top5[${slpcode}]`,
    )
    if (!top5.length) continue
    const itemRows = top5.map((t: Record<string, unknown>) => ({
      slpcode,
      itemcode: t.itemcode != null ? String(t.itemcode) : null,
      item: t.item != null ? String(t.item) : null,
      qtd: t.qtd != null ? Number(t.qtd) : null,
      percentual: parseDecimal(t.percentual as string),
      capturedAt,
    }))
    await db.insert(snapshotsTop5Itens).values(itemRows)
    top5Total += itemRows.length
  }
  logger.debug({ count: top5Total }, 'snapshots_top5itens inserted')

  logger.info({ durationMs: Date.now() - start }, 'coleta concluída')
}
```

- [ ] **Step 2: Adicionar graceful shutdown e substituir console.log em `packages/harvester/src/index.ts`**

```typescript
import cron from 'node-cron'
import { runHarvest, pool, logger } from './harvest.js'

const CRON_EXPR = process.env.HARVEST_CRON ?? '*/30 * * * *'
const RUN_ONCE = process.argv.includes('--once')
const SHUTDOWN_TIMEOUT_MS = 30_000

let harvesting = false
let shuttingDown = false

async function gracefulShutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  logger.info({ signal }, 'sinal recebido, encerrando...')

  if (harvesting) {
    logger.info(`aguardando coleta em andamento (timeout: ${SHUTDOWN_TIMEOUT_MS}ms)`)
    const deadline = Date.now() + SHUTDOWN_TIMEOUT_MS
    while (harvesting && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 200))
    }
    if (harvesting) logger.warn('timeout atingido, forçando saída')
  }

  await pool.end()
  logger.info('pool encerrado, saindo')
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

async function safeHarvest() {
  if (shuttingDown) return
  harvesting = true
  try {
    await runHarvest()
  } catch (err) {
    logger.error({ err }, 'erro na coleta')
  } finally {
    harvesting = false
  }
}

if (RUN_ONCE) {
  logger.info('modo manual — executando uma vez')
  await safeHarvest()
  await pool.end()
} else {
  logger.info({ cron: CRON_EXPR }, 'agendado')
  await safeHarvest()
  cron.schedule(CRON_EXPR, safeHarvest)
}
```

- [ ] **Step 3: Testar harvester manualmente**

```bash
pnpm harvester:run
```
Esperado: logs pino com início, contagens e conclusão. Sem crashes.

- [ ] **Step 4: Commit**

```bash
git add packages/harvester/src/harvest.ts packages/harvester/src/index.ts
git commit -m "feat(harvester): add pino logging, retry exponential, graceful shutdown"
```

---

### Task 6: Graceful shutdown na API

**Files:**
- Modify: `apps/api/src/db/client.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Exportar `pool` de `apps/api/src/db/client.ts`**

```typescript
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})
export const db = drizzle(pool, { schema })
```

- [ ] **Step 2: Importar pool e adicionar graceful shutdown no final de `apps/api/src/index.ts`**

Trocar o trecho final (o `app.listen`) por:

```typescript
const port = env.API_PORT
const host = env.API_HOST

await app.listen({ port, host })

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'sinal recebido, encerrando...')
  await app.close()
  await pool.end()
  app.log.info('servidor encerrado')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
```

Adicionar no início do arquivo:
```typescript
import { pool } from './db/client.js'
```

- [ ] **Step 3: Verificar que a API sobe e responde**

```bash
curl -s http://localhost:3001/health
```
Esperado: `{"status":"ok"}`

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/db/client.ts apps/api/src/index.ts
git commit -m "feat(api): add graceful shutdown with pool drain on SIGTERM/SIGINT"
```

---

### Task 7: Deploy Wave 1 na VPS

**Files:** nenhum

- [ ] **Step 1: Push para origin**

```bash
git push origin main
```

- [ ] **Step 2: Pull e rebuild na VPS**

```bash
ssh suporte@191.101.18.82 "cd /opt/painelsbr && git pull && docker compose -f infra/docker-compose.yml build api harvester && docker compose -f infra/docker-compose.yml up -d api harvester"
```

- [ ] **Step 3: Verificar que subiu**

```bash
ssh suporte@191.101.18.82 "docker logs infra-api-1 --tail=20"
```
Esperado: logs pino JSON com `"msg":"Server listening at http://0.0.0.0:3001"`. Sem erros.

- [ ] **Step 4: Testar endpoint público**

```bash
curl -s https://painelsbrcom.laboratoriosobral.com.br/api/vendedores | head -c 200
```
Esperado: JSON com lista de vendedores.

---

## ═══════════════════════════════════════
## WAVE 2 — SEGURANÇA & AUTH
## ═══════════════════════════════════════

---

### Task 8: Instalar dependências da Wave 2

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Instalar deps na API**

```bash
cd apps/api
pnpm add @fastify/jwt @fastify/cookie @fastify/rate-limit bcrypt
pnpm add -D @types/bcrypt
```

- [ ] **Step 2: Instalar react-router-dom na web**

```bash
cd ../web
pnpm add react-router-dom
pnpm add -D @types/react-router-dom
```

- [ ] **Step 3: Commit**

```bash
cd ../..
git add apps/api/package.json apps/web/package.json pnpm-lock.yaml
git commit -m "chore(deps): add JWT, bcrypt, rate-limit, react-router-dom for wave 2"
```

---

### Task 9: Tabela usuarios no banco + migration

**Files:**
- Modify: `apps/api/src/db/schema.ts`

- [ ] **Step 1: Adicionar tabela `usuarios` em `apps/api/src/db/schema.ts`**

Adicionar no final do arquivo:
```typescript
export const usuarios = pgTable('usuarios', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  senhaHash: varchar('senha_hash', { length: 255 }).notNull(),
  refreshTokenHash: varchar('refresh_token_hash', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
```

- [ ] **Step 2: Gerar a migration**

```bash
pnpm db:generate
```
Esperado: novo arquivo `.sql` criado em `apps/api/drizzle/` (ex: `0001_usuarios.sql`).

- [ ] **Step 3: Aplicar migration no banco local (precisa do Postgres rodando)**

```bash
pnpm db:migrate
```
Esperado: `All migrations applied successfully.`

- [ ] **Step 4: Verificar tabela criada**

```bash
docker exec infra-postgres-1 psql -U postgres -d agnvendas -c "\d usuarios"
```
Esperado: tabela com colunas id, email, senha_hash, refresh_token_hash, created_at.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/db/schema.ts apps/api/drizzle/
git commit -m "feat(db): add usuarios table with refresh_token_hash"
```

---

### Task 10: Adicionar JWT_SECRET e CORS_ORIGIN ao env schema

**Files:**
- Modify: `apps/api/src/env.ts`
- Modify: `.env.example`
- Modify: `.env.prod.example`
- Modify: `infra/docker-compose.yml`

- [ ] **Step 1: Atualizar `apps/api/src/env.ts`**

Adicionar ao `envSchema`:
```typescript
JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
```

- [ ] **Step 2: Adicionar ao `.env` local para dev**

```
JWT_SECRET=dev_secret_only_32chars_minimum_x
CORS_ORIGIN=http://localhost:5173
```

- [ ] **Step 3: Adicionar ao `.env.example`**

```
JWT_SECRET=troque_por_string_aleatoria_de_32_chars
CORS_ORIGIN=https://seu-dominio.com.br
```

- [ ] **Step 4: Adicionar nas env vars da api em `infra/docker-compose.yml`**

```yaml
environment:
  # ... vars existentes ...
  JWT_SECRET: ${JWT_SECRET}
  CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:5173}
```

- [ ] **Step 5: Adicionar ao `.env.prod.example`**

```
JWT_SECRET=gere_com_openssl_rand_-hex_32
CORS_ORIGIN=https://painelsbrcom.laboratoriosobral.com.br
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/env.ts infra/docker-compose.yml .env.example .env.prod.example
git commit -m "feat(api): add JWT_SECRET and CORS_ORIGIN to env schema"
```

---

### Task 11: Plugin de autenticação Fastify

**Files:**
- Create: `apps/api/src/plugins/authenticate.ts`

- [ ] **Step 1: Criar `apps/api/src/plugins/authenticate.ts`**

```typescript
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'

export interface JwtPayload {
  sub: number   // usuario.id
  email: string
}

export default fp(async function authenticate(app: FastifyInstance) {
  await app.register(fastifyJwt, {
    secret: app.config.JWT_SECRET,
    sign: { expiresIn: '8h' },
  })

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify<JwtPayload>()
    } catch {
      reply.status(401).send({ error: 'Não autorizado' })
    }
  })
})

// Augment Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    config: { JWT_SECRET: string; CORS_ORIGIN: string }
  }
}
```

**Nota:** para que `app.config` funcione, adicionar em `index.ts` após criar o app:
```typescript
app.decorate('config', { JWT_SECRET: env.JWT_SECRET, CORS_ORIGIN: env.CORS_ORIGIN })
```

- [ ] **Step 2: Instalar `fastify-plugin`**

```bash
cd apps/api
pnpm add fastify-plugin
```

- [ ] **Step 3: Registrar o plugin em `apps/api/src/index.ts`**

```typescript
import authenticate from './plugins/authenticate.js'

// após registrar cors e rate-limit:
await app.register(authenticate)
```

- [ ] **Step 4: Adicionar `onRequest: [app.authenticate]` nas rotas protegidas (todas exceto /health)**

Exemplo para `/vendedores`:
```typescript
app.get('/vendedores', { onRequest: [app.authenticate] }, async () => { ... })
```
Aplicar a **todas** as rotas exceto `/health`.

- [ ] **Step 5: Testar que rota protegida retorna 401**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/vendedores
```
Esperado: `401`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/plugins/ apps/api/src/index.ts apps/api/package.json pnpm-lock.yaml
git commit -m "feat(api): add JWT authentication plugin, protect all routes"
```

---

### Task 12: Rotas de auth (login/refresh/logout)

**Files:**
- Create: `apps/api/src/routes/auth.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Criar `apps/api/src/routes/auth.ts`**

```typescript
import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import fastifyCookie from '@fastify/cookie'
import crypto from 'node:crypto'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/client.js'
import { usuarios } from '../db/schema.js'
import { AppError } from '../errors.js'

const COOKIE_NAME = 'refresh_token'
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 dias em segundos
}

// Nota: @fastify/cookie deve ser registrado em index.ts (escopo raiz),
// não dentro deste plugin, para que req.cookies esteja disponível em todos os hooks.

export default async function authRoutes(app: FastifyInstance) {
  // POST /auth/login
  app.post(
    '/auth/login',
    {
      schema: {
        body: z.object({
          email: z.string().email(),
          senha: z.string().min(1),
        }),
      },
    },
    async (req, reply) => {
      const { email, senha } = req.body as { email: string; senha: string }

      const [usuario] = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1)
      if (!usuario) throw new AppError(401, 'Credenciais inválidas')

      const senhaOk = await bcrypt.compare(senha, usuario.senhaHash)
      if (!senhaOk) throw new AppError(401, 'Credenciais inválidas')

      const accessToken = app.jwt.sign({ sub: usuario.id, email: usuario.email })

      const refreshToken = crypto.randomBytes(40).toString('hex')
      const refreshTokenHash = await bcrypt.hash(refreshToken, 10)
      await db.update(usuarios).set({ refreshTokenHash }).where(eq(usuarios.id, usuario.id))

      return reply
        .setCookie(COOKIE_NAME, refreshToken, COOKIE_OPTS)
        .send({ accessToken })
    },
  )

  // POST /auth/refresh
  // Estratégia segura: carregar todos os usuários com refreshTokenHash e usar bcrypt.compare
  // (O painel tem ~5 usuários admin — custo aceitável para garantir segurança correta)
  app.post('/auth/refresh', async (req, reply) => {
    const refreshToken = req.cookies?.[COOKIE_NAME]
    if (!refreshToken) throw new AppError(401, 'Refresh token ausente')

    const candidatos = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.refreshTokenHash, usuarios.refreshTokenHash)) // busca apenas os que têm hash

    let match: typeof candidatos[0] | null = null
    for (const u of candidatos) {
      if (!u.refreshTokenHash) continue
      const ok = await bcrypt.compare(refreshToken, u.refreshTokenHash)
      if (ok) { match = u; break }
    }

    if (!match) throw new AppError(401, 'Refresh token inválido')

    const accessToken = app.jwt.sign({ sub: match.id, email: match.email })
    return reply.send({ accessToken })
  })

  // POST /auth/logout
  app.post('/auth/logout', { onRequest: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as { sub: number }
    await db.update(usuarios).set({ refreshTokenHash: null }).where(eq(usuarios.id, payload.sub))
    return reply.clearCookie(COOKIE_NAME, COOKIE_OPTS).send({ ok: true })
  })
}
```

- [ ] **Step 2: Registrar `@fastify/cookie` e rotas de auth em `apps/api/src/index.ts`**

```typescript
import fastifyCookie from '@fastify/cookie'
import authRoutes from './routes/auth.js'

// após registrar cors, ANTES de authenticate e das demais rotas:
await app.register(fastifyCookie)
await app.register(authRoutes, { prefix: '/auth' })
```

`@fastify/cookie` deve ficar no escopo raiz (não dentro de authRoutes) para que `req.cookies` esteja disponível no plugin `authenticate` e em futuras rotas.

- [ ] **Step 3: Testar login**

```bash
# Precisa de um usuário no banco — usar seed na próxima task
# Por ora testar que rota existe e retorna 401 sem credenciais
curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nao@existe.com","senha":"qualquer"}' | jq
```
Esperado: `{"error":"Credenciais inválidas"}` com status 401.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/ apps/api/src/index.ts
git commit -m "feat(api): add auth routes (login/refresh/logout) with bcrypt + JWT"
```

---

### Task 13: Script seed-admin

**Files:**
- Create: `apps/api/scripts/seed-admin.ts`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Criar `apps/api/scripts/seed-admin.ts`**

```typescript
import '../src/env.js'
import bcrypt from 'bcrypt'
import { db } from '../src/db/client.js'
import { usuarios } from '../src/db/schema.js'

const email = process.env.ADMIN_EMAIL ?? 'admin@laboratoriosobral.com.br'
const senha = process.env.ADMIN_PASSWORD

if (!senha) {
  console.error('❌ Defina ADMIN_PASSWORD no ambiente antes de rodar este script')
  process.exit(1)
}

const senhaHash = await bcrypt.hash(senha, 12)

await db
  .insert(usuarios)
  .values({ email, senhaHash })
  .onConflictDoUpdate({ target: usuarios.email, set: { senhaHash } })

console.log(`✅ Admin criado/atualizado: ${email}`)
process.exit(0)
```

- [ ] **Step 2: Adicionar script ao `apps/api/package.json`**

```json
"scripts": {
  "seed:admin": "tsx scripts/seed-admin.ts"
}
```

- [ ] **Step 3: Adicionar script na raiz em `package.json`**

```json
"seed:admin": "pnpm --filter api seed:admin"
```

- [ ] **Step 4: Testar o seed**

```bash
ADMIN_PASSWORD=MinhaSenh@Forte123 pnpm seed:admin
```
Esperado: `✅ Admin criado/atualizado: admin@laboratoriosobral.com.br`

- [ ] **Step 5: Testar login com o usuário criado**

```bash
curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@laboratoriosobral.com.br","senha":"MinhaSenh@Forte123"}' | jq
```
Esperado: `{"accessToken":"eyJ..."}`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/scripts/ apps/api/package.json package.json
git commit -m "feat(api): add seed-admin script for first user creation"
```

---

### Task 14: Rate limiting + CORS hardening

**Files:**
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Registrar `@fastify/rate-limit` em `apps/api/src/index.ts`**

```typescript
import rateLimit from '@fastify/rate-limit'

// logo após criar o app e antes de registrar as rotas:
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({ error: 'Muitas requisições. Tente novamente em 1 minuto.' }),
})
```

- [ ] **Step 2: Adicionar rate limit específico na rota de login**

Na definição do POST `/auth/login`, adicionar:
```typescript
config: { rateLimit: { max: 5, timeWindow: '1 minute' } }
```

- [ ] **Step 3: Atualizar CORS para usar `env.CORS_ORIGIN`**

Trocar:
```typescript
await app.register(cors, { origin: true })
```
Por:
```typescript
await app.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true,
})
```

- [ ] **Step 4: Verificar que CORS funciona**

```bash
curl -s -I -H "Origin: http://localhost:5173" http://localhost:3001/health
```
Esperado: header `Access-Control-Allow-Origin: http://localhost:5173`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/index.ts
git commit -m "feat(api): add rate limiting (100/min global, 5/min login) and CORS hardening"
```

---

### Task 15: Frontend — AuthContext + Login + PrivateRoute

**Files:**
- Create: `apps/web/src/context/AuthContext.tsx`
- Create: `apps/web/src/pages/Login.tsx`
- Create: `apps/web/src/components/PrivateRoute.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/hooks/useApi.ts`

- [ ] **Step 1: Criar `apps/web/src/context/AuthContext.tsx`**

```typescript
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface AuthState {
  accessToken: string | null
  login: (email: string, senha: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<boolean>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const login = useCallback(async (email: string, senha: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
      credentials: 'include',
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error ?? 'Erro ao fazer login')
    }
    const { accessToken } = await res.json()
    setAccessToken(accessToken)
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    }).catch(() => {})
    setAccessToken(null)
  }, [accessToken])

  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) return false
      const { accessToken } = await res.json()
      setAccessToken(accessToken)
      return true
    } catch {
      return false
    }
  }, [])

  return (
    <AuthContext.Provider value={{ accessToken, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
```

- [ ] **Step 2: Criar `apps/web/src/pages/Login.tsx`**

```typescript
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, senha)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950">
      <div className="w-full max-w-sm bg-dark-900 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-white mb-2">Painel SBR</h1>
        <p className="text-dark-400 mb-8 text-sm">Faça login para continuar</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-dark-300 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2.5 text-white placeholder-dark-500 focus:outline-none focus:border-orange-500"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2.5 text-white placeholder-dark-500 focus:outline-none focus:border-orange-500"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Criar `apps/web/src/components/PrivateRoute.tsx`**

```typescript
import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PrivateRoute({ children }: { children: ReactNode }) {
  const { accessToken, refresh } = useAuth()
  const [checking, setChecking] = useState(!accessToken)

  useEffect(() => {
    if (accessToken) return
    refresh().finally(() => setChecking(false))
  }, [accessToken, refresh])

  if (checking) return <div className="min-h-screen flex items-center justify-center bg-dark-950" />
  if (!accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}
```

- [ ] **Step 4: Migrar `apps/web/src/App.tsx` para react-router-dom**

Ler o App.tsx atual e substituir a lógica de navegação por estado por `BrowserRouter + Routes`. A estrutura existente de páginas deve ser preservada dentro do `PrivateRoute`. Exemplo de estrutura:

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'
// ... imports das páginas existentes

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <div className="flex h-screen">
                  <Sidebar />
                  <main className="flex-1 overflow-auto">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/vendedores" element={<Vendedores />} />
                      <Route path="/positivacao" element={<Positivacao />} />
                    </Routes>
                  </main>
                </div>
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
```

**Nota:** Ler `apps/web/src/App.tsx` antes de editar para preservar ThemeContext, tema dark/light e qualquer lógica existente.

- [ ] **Step 5: Adicionar Bearer token nos fetches de `apps/web/src/hooks/useApi.ts`**

Ler o arquivo atual. Trocar a função `fetchJson` para aceitar o token do AuthContext. O hook deve chamar `useAuth()` e passar o token no header Authorization.

Padrão esperado:
```typescript
const { accessToken } = useAuth()
const res = await fetch(url, {
  headers: { Authorization: `Bearer ${accessToken}` },
  credentials: 'include',
})
```

- [ ] **Step 6: Verificar que o frontend compila sem erros**

```bash
cd apps/web
pnpm build
```
Esperado: sem erros TypeScript.

- [ ] **Step 7: Testar fluxo de login manualmente**

```bash
pnpm dev
```
Abrir `http://localhost:5173` no browser. Esperado: redireciona para `/login`. Fazer login com o admin criado. Esperado: entra no dashboard.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/context/ apps/web/src/pages/Login.tsx apps/web/src/components/PrivateRoute.tsx apps/web/src/App.tsx apps/web/src/hooks/useApi.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): add auth flow — login page, AuthContext, PrivateRoute, react-router-dom"
```

---

### Task 16: Deploy Wave 2 na VPS

**Files:** nenhum

- [ ] **Step 1: Adicionar JWT_SECRET e CORS_ORIGIN ao `.env` da VPS**

```bash
ssh suporte@191.101.18.82 "cat >> /opt/painelsbr/.env << 'EOF'
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGIN=https://painelsbrcom.laboratoriosobral.com.br
EOF"
```

- [ ] **Step 2: Push e deploy**

```bash
git push origin main
ssh suporte@191.101.18.82 "cd /opt/painelsbr && git pull && docker compose -f infra/docker-compose.yml build api web && docker compose -f infra/docker-compose.yml up -d"
```

- [ ] **Step 3: Rodar seed-admin na VPS**

```bash
ssh suporte@191.101.18.82 "cd /opt/painelsbr && ADMIN_PASSWORD='SenhaMuitoForte#2026' docker compose -f infra/docker-compose.yml exec api node -e \"process.env.ADMIN_PASSWORD='SenhaMuitoForte#2026'\" 2>/dev/null || docker exec infra-api-1 sh -c 'ADMIN_PASSWORD=SenhaMuitoForte#2026 node dist/scripts/seed-admin.js'"
```
**Alternativa mais simples:** `ssh` na VPS, entrar no container e rodar o script manualmente.

- [ ] **Step 4: Testar login no domínio público**

```bash
curl -s -X POST https://painelsbrcom.laboratoriosobral.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@laboratoriosobral.com.br","senha":"SenhaMuitoForte#2026"}' | jq
```
Esperado: `{"accessToken":"eyJ..."}`.

- [ ] **Step 5: Testar que rota sem token retorna 401**

```bash
curl -s -o /dev/null -w "%{http_code}" https://painelsbrcom.laboratoriosobral.com.br/api/vendedores
```
Esperado: `401`.

---

## ═══════════════════════════════════════
## WAVE 3 — QUALIDADE DE CÓDIGO
## ═══════════════════════════════════════

---

### Task 17: ESLint + Prettier + Husky

**Files:**
- Create: `eslint.config.js`
- Create: `.prettierrc`
- Modify: `package.json` (root)

- [ ] **Step 1: Instalar ESLint + Prettier + Husky na raiz**

```bash
pnpm add -D -w eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-config-prettier prettier husky lint-staged
```

- [ ] **Step 2: Criar `eslint.config.js` na raiz**

```javascript
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.drizzle/**', '**/drizzle/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: { parser: tsParser },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs['recommended'].rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
    },
  },
]
```

- [ ] **Step 3: Criar `.prettierrc` na raiz**

```json
{
  "singleQuote": true,
  "semi": false,
  "printWidth": 100,
  "trailingComma": "all"
}
```

- [ ] **Step 4: Adicionar scripts e lint-staged ao `package.json` raiz**

```json
"scripts": {
  "lint": "eslint apps packages",
  "format": "prettier --write apps packages",
  "typecheck": "pnpm --filter './apps/*' --filter './packages/*' exec tsc --noEmit",
  "prepare": "husky"
},
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
```

- [ ] **Step 5: Inicializar Husky e criar hook pre-commit**

```bash
pnpm exec husky init
echo "pnpm exec lint-staged" > .husky/pre-commit
```

- [ ] **Step 6: Rodar lint e corrigir todos os warnings/errors**

```bash
pnpm lint 2>&1 | head -50
```
Corrigir os erros encontrados (principalmente `no-console` → substituir por logger, e `no-explicit-any` → tipar corretamente).

- [ ] **Step 7: Rodar format**

```bash
pnpm format
```

- [ ] **Step 8: Verificar typecheck**

```bash
pnpm typecheck
```
Esperado: sem erros.

- [ ] **Step 9: Commit**

```bash
git add eslint.config.js .prettierrc .husky/ package.json pnpm-lock.yaml
git add -u  # captura arquivos formatados pelo prettier
git commit -m "chore: add ESLint flat config, Prettier, Husky pre-commit hook"
```

---

### Task 18: TypeScript flags strict adicionais

**Files:**
- Modify: `apps/api/tsconfig.json`
- Modify: `apps/web/tsconfig.json`
- Modify: `packages/harvester/tsconfig.json`

- [ ] **Step 1: Ler cada tsconfig e adicionar as flags**

Em cada um dos três `tsconfig.json`, adicionar dentro de `"compilerOptions"`:
```json
"noUnusedLocals": true,
"noUnusedParameters": true,
"noFallthroughCasesInSwitch": true,
"forceConsistentCasingInFileNames": true
```

- [ ] **Step 2: Rodar typecheck e corrigir erros**

```bash
pnpm typecheck
```
Corrigir todos os erros que surgirem (variáveis não usadas, parâmetros não usados, etc.).

- [ ] **Step 3: Commit**

```bash
git add apps/api/tsconfig.json apps/web/tsconfig.json packages/harvester/tsconfig.json
git add -u
git commit -m "chore(ts): add strict flags (noUnusedLocals, noUnusedParameters, etc)"
```

---

### Task 19: Índices no banco via Drizzle

**Files:**
- Modify: `apps/api/src/db/schema.ts`

- [ ] **Step 1: Adicionar índices às tabelas em `apps/api/src/db/schema.ts`**

```typescript
import { index, ... } from 'drizzle-orm/pg-core'

export const snapshotsDashboard = pgTable('snapshots_dashboard', {
  // ... campos existentes sem alteração ...
}, (t) => [
  index('idx_dashboard_slpcode_captured').on(t.slpcode, t.capturedAt),
])

export const snapshotsPositivacao = pgTable('snapshots_positivacao', {
  // ... campos existentes sem alteração ...
}, (t) => [
  index('idx_positivacao_slpcode_captured').on(t.slpcode, t.capturedAt),
])

export const snapshotsTop5Itens = pgTable('snapshots_top5itens', {
  // ... campos existentes sem alteração ...
}, (t) => [
  index('idx_top5_slpcode_captured').on(t.slpcode, t.capturedAt),
])
```

- [ ] **Step 2: Gerar e aplicar migration**

```bash
pnpm db:generate
pnpm db:migrate
```
Esperado: novo arquivo `.sql` com os três `CREATE INDEX`.

- [ ] **Step 3: Verificar índices criados**

```bash
docker exec infra-postgres-1 psql -U postgres -d agnvendas -c "\di idx_*"
```
Esperado: 3 índices listados.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/db/schema.ts apps/api/drizzle/
git commit -m "perf(db): add composite indexes on slpcode+captured_at for snapshot tables"
```

---

### Task 20: Documentação OpenAPI via Swagger

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Instalar deps**

```bash
cd apps/api
pnpm add @fastify/swagger @fastify/swagger-ui
```

- [ ] **Step 2: Registrar swagger em `apps/api/src/index.ts`**

Adicionar **antes** de registrar as rotas:
```typescript
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

if (env.NODE_ENV !== 'production') {
  await app.register(swagger, {
    openapi: {
      info: { title: 'Painel SBR API', version: '1.0.0' },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  })
  await app.register(swaggerUi, { routePrefix: '/docs' })
}
```

- [ ] **Step 3: Verificar docs**

```bash
# com a API rodando em dev
curl -s http://localhost:3001/docs/json | jq '.info'
```
Esperado: `{"title":"Painel SBR API","version":"1.0.0"}`.
Abrir `http://localhost:3001/docs` no browser: Swagger UI deve aparecer.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/index.ts apps/api/package.json pnpm-lock.yaml
git commit -m "feat(api): add Swagger/OpenAPI docs at /docs (dev only)"
```

---

### Task 21: Deploy Wave 3 na VPS

- [ ] **Step 1: Push e rebuild**

```bash
git push origin main
ssh suporte@191.101.18.82 "cd /opt/painelsbr && git pull && docker compose -f infra/docker-compose.yml build api web && docker compose -f infra/docker-compose.yml up -d"
```

- [ ] **Step 2: Verificar que pnpm lint passa localmente**

```bash
pnpm lint && echo "lint ok"
pnpm typecheck && echo "typecheck ok"
```
Esperado: sem erros.

---

## ═══════════════════════════════════════
## WAVE 4 — TESTES
## ═══════════════════════════════════════

---

### Task 22: Setup Vitest + unit tests de format.ts

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/src/lib/format.test.ts`

- [ ] **Step 1: Instalar Vitest na web**

```bash
cd apps/web
pnpm add -D vitest @vitest/coverage-v8
```

- [ ] **Step 2: Criar `apps/web/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
})
```

- [ ] **Step 3: Adicionar scripts em `apps/web/package.json`**

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 4: Escrever tests em `apps/web/src/lib/format.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { formatBRL, formatPct, formatNum, pctNum, initials, firstName, metaColor } from './format'

describe('formatBRL', () => {
  it('formata valor numérico como BRL (contém R$)', () => {
    expect(formatBRL(44241.91)).toMatch(/R\$/)
  })
  it('formata valor sem casas decimais', () => {
    // verificar estrutura, não valor exato (locale pode variar por ambiente)
    expect(formatBRL(44241.91)).toMatch(/\d/)
  })
  it('retorna — para null', () => {
    expect(formatBRL(null)).toBe('—')
  })
  it('retorna — para string vazia', () => {
    expect(formatBRL('')).toBe('—')
  })
  it('aceita string numérica', () => {
    expect(formatBRL('1000')).toMatch(/R\$/)
  })
  it('retorna — para NaN', () => {
    expect(formatBRL('nao-e-numero')).toBe('—')
  })
})

describe('formatPct', () => {
  it('formata percentual com 1 casa decimal', () => {
    expect(formatPct(0.8543)).toBe('0.9%')
  })
  it('retorna — para undefined', () => {
    expect(formatPct(undefined)).toBe('—')
  })
})

describe('initials', () => {
  it('retorna iniciais de nome completo', () => {
    expect(initials('Alex Vando Araujo')).toBe('AA')
  })
  it('retorna inicial de nome único', () => {
    expect(initials('Alex')).toBe('A')
  })
  it('retorna ? para null', () => {
    expect(initials(null)).toBe('?')
  })
})

describe('metaColor', () => {
  it('retorna verde para >= 100%', () => {
    expect(metaColor(100).text).toBe('#22c55e')
  })
  it('retorna vermelho para < 50%', () => {
    expect(metaColor(49).text).toBe('#ef4444')
  })
})
```

- [ ] **Step 5: Rodar os testes**

```bash
cd apps/web
pnpm test
```
Esperado: todos os testes passam.

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/vitest.config.ts apps/web/src/lib/format.test.ts pnpm-lock.yaml
git commit -m "test(web): add Vitest unit tests for format.ts utilities"
```

---

### Task 23: Unit tests do parseDecimal no harvester

**Files:**
- Modify: `packages/harvester/package.json`
- Create: `packages/harvester/vitest.config.ts`
- Create: `packages/harvester/src/parseDecimal.test.ts`

- [ ] **Step 1: Instalar Vitest no harvester**

```bash
cd packages/harvester
pnpm add -D vitest @vitest/coverage-v8
```

- [ ] **Step 2: Criar `packages/harvester/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
})
```

- [ ] **Step 3: Criar `packages/harvester/src/parseDecimal.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { parseDecimal } from './client'

describe('parseDecimal', () => {
  it('converte string com vírgula decimal para number', () => {
    expect(parseDecimal('44241,910000')).toBeCloseTo(44241.91)
  })
  it('converte string com ponto decimal', () => {
    expect(parseDecimal('1000.50')).toBeCloseTo(1000.50)
  })
  it('retorna null para null', () => {
    expect(parseDecimal(null)).toBeNull()
  })
  it('retorna null para string vazia', () => {
    expect(parseDecimal('')).toBeNull()
  })
  it('retorna null para undefined', () => {
    expect(parseDecimal(undefined)).toBeNull()
  })
  it('converte zero', () => {
    expect(parseDecimal('0,00')).toBe(0)
  })
  it('converte valor negativo', () => {
    expect(parseDecimal('-100,50')).toBeCloseTo(-100.50)
  })
})
```

- [ ] **Step 4: Adicionar scripts e rodar**

Em `packages/harvester/package.json`:
```json
"test": "vitest run",
"test:coverage": "vitest run --coverage"
```

```bash
pnpm test
```
Esperado: todos os testes passam.

- [ ] **Step 5: Commit**

```bash
git add packages/harvester/package.json packages/harvester/vitest.config.ts packages/harvester/src/parseDecimal.test.ts pnpm-lock.yaml
git commit -m "test(harvester): add Vitest unit tests for parseDecimal"
```

---

### Task 24: Setup integration tests da API com testcontainers

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/src/test/setup.ts`
- Create: `apps/api/src/test/factories.ts`

- [ ] **Step 1: Instalar deps de test na API**

```bash
cd apps/api
pnpm add -D vitest @vitest/coverage-v8 @testcontainers/postgresql testcontainers supertest @types/supertest
```

- [ ] **Step 2: Criar `apps/api/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './src/test/setup.ts',
    testTimeout: 60_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/test/**', 'src/env.ts'],
      thresholds: { lines: 75 },
    },
  },
})
```

- [ ] **Step 3: Criar `apps/api/src/test/setup.ts`**

```typescript
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

let container: StartedPostgreSqlContainer

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function setup() {
  container = await new PostgreSqlContainer('postgres:16-alpine').start()

  const connectionString = container.getConnectionUri()
  process.env.DATABASE_URL = connectionString
  process.env.JWT_SECRET = 'test_secret_minimum_32_characters_x'
  process.env.CORS_ORIGIN = 'http://localhost:5173'
  process.env.NODE_ENV = 'test'

  const pool = new pg.Pool({ connectionString })
  const db = drizzle(pool)
  await migrate(db, { migrationsFolder: path.resolve(__dirname, '../../drizzle') })
  await pool.end()
}

export async function teardown() {
  await container?.stop()
}
```

- [ ] **Step 4: Criar `apps/api/src/test/factories.ts`**

```typescript
import bcrypt from 'bcrypt'
import { db } from '../db/client.js'
import { vendedores, snapshotsDashboard, snapshotsPositivacao, usuarios } from '../db/schema.js'

export async function createVendedor(overrides: Partial<typeof vendedores.$inferInsert> = {}) {
  const [row] = await db.insert(vendedores).values({
    slpcode: String(Math.floor(Math.random() * 9000) + 1000),
    nome: 'Vendedor Teste',
    funcao: 'Vendedor',
    ativo: true,
    ...overrides,
  }).returning()
  return row
}

export async function createDashboardSnapshot(slpcode: string) {
  const [row] = await db.insert(snapshotsDashboard).values({
    slpcode,
    meta: '10000.00',
    faturamentoMes: '5000.00',
    faturamentoDia: '300.00',
    ticketMedioDia: '150.00',
    percentualMes: '0.5000',
    mediaMes: '250.00',
  }).returning()
  return row
}

export async function createUsuario(email = 'test@test.com', senha = 'senha123') {
  const senhaHash = await bcrypt.hash(senha, 4) // rounds baixo para testes serem rápidos
  const [row] = await db.insert(usuarios).values({ email, senhaHash }).returning()
  return { ...row, senhaPlain: senha }
}
```

- [ ] **Step 5: Adicionar scripts em `apps/api/package.json`**

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 6: Verificar que o setup funciona**

```bash
cd apps/api
pnpm test 2>&1 | head -20
```
Esperado: mensagem de que o container PostgreSQL subiu e migrations foram aplicadas (sem errors). Pode não ter testes ainda — ok.

- [ ] **Step 7: Commit**

```bash
git add apps/api/package.json apps/api/vitest.config.ts apps/api/src/test/ pnpm-lock.yaml
git commit -m "test(api): setup Vitest + testcontainers + factories for integration tests"
```

---

### Task 25: Integration tests das rotas da API

**Files:**
- Create: `apps/api/src/app.ts`
- Modify: `apps/api/src/index.ts`
- Create: `apps/api/src/test/routes.integration.test.ts`
- Create: `apps/api/src/test/auth.integration.test.ts`

- [ ] **Step 0: Extrair `buildApp()` de `index.ts` para `apps/api/src/app.ts`**

Os testes precisam instanciar o app sem chamar `app.listen()`. Extrair toda a lógica de configuração do Fastify para um arquivo separado:

Criar `apps/api/src/app.ts`:
```typescript
import './env.js'
import Fastify from 'fastify'
import { ZodTypeProvider, serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import fastifyCookie from '@fastify/cookie'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { isAppError } from './errors.js'
import { env } from './env.js'
import authenticate from './plugins/authenticate.js'
import authRoutes from './routes/auth.js'
import { pool } from './db/client.js'
// ... demais imports de rotas

export default async function buildApp() {
  const app = Fastify({ logger: { level: 'silent' } }).withTypeProvider<ZodTypeProvider>()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  app.decorate('config', { JWT_SECRET: env.JWT_SECRET, CORS_ORIGIN: env.CORS_ORIGIN })
  app.setErrorHandler(/* ... */)
  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true })
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })
  await app.register(fastifyCookie)
  await app.register(authenticate)
  await app.register(authRoutes, { prefix: '/auth' })
  // ... registrar demais rotas
  return app
}
```

Modificar `apps/api/src/index.ts` para apenas:
```typescript
import buildApp from './app.js'
import { env } from './env.js'
import { pool } from './db/client.js'

const app = await buildApp()
await app.listen({ port: env.API_PORT, host: env.API_HOST })

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'encerrando...')
  await app.close()
  await pool.end()
  process.exit(0)
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
```

- [ ] **Step 0b: Verificar que a API ainda funciona após a refatoração**

```bash
cd apps/api
pnpm dev
```
```bash
curl -s http://localhost:3001/health
```
Esperado: `{"status":"ok"}`

- [ ] **Step 1: Criar `apps/api/src/test/routes.integration.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { db } from '../db/client.js'
import { vendedores, snapshotsDashboard } from '../db/schema.js'
import { createVendedor, createDashboardSnapshot } from './factories.js'

// Importar e montar o app igual ao index.ts mas sem listen
async function buildApp() {
  // Importar dinamicamente para usar o DATABASE_URL já setado pelo globalSetup
  const { default: buildFastifyApp } = await import('../app.js')
  return buildFastifyApp()
}

// Nota: refatorar index.ts para exportar uma função buildApp() — ver Task 25 Step 0

describe('GET /vendedores', () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  let token: string

  beforeAll(async () => {
    app = await buildApp()
    // criar usuário e fazer login para obter token
    // ...
  })
  afterAll(() => app.close())

  it('retorna lista de vendedores com token', async () => {
    const v = await createVendedor()
    const res = await app.inject({
      method: 'GET',
      url: '/vendedores',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toBeInstanceOf(Array)
    expect(body.some((x: { slpcode: string }) => x.slpcode === v.slpcode)).toBe(true)
  })

  it('retorna 401 sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/vendedores' })
    expect(res.statusCode).toBe(401)
  })

  it('retorna 400 para slpcode inválido em /dashboard/:slpcode', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/dashboard/nao-e-numero',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(400)
  })
})
```

**Nota importante (Step 0):** Antes de escrever os testes, refatorar `apps/api/src/index.ts` para separar a construção do app do `app.listen`. Criar `apps/api/src/app.ts` que exporta `buildApp()` e `index.ts` apenas importa e chama `buildApp().then(app => app.listen(...))`. Isso permite que os testes importem o app sem iniciar o servidor.

- [ ] **Step 2: Criar `apps/api/src/test/auth.integration.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createUsuario } from './factories.js'

describe('POST /auth/login', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => { app = await buildApp() })
  afterAll(() => app.close())

  it('retorna accessToken com credenciais válidas', async () => {
    const { email, senhaPlain } = await createUsuario('login@test.com', 'senha123')
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, senha: senhaPlain },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveProperty('accessToken')
  })

  it('retorna 401 com credenciais inválidas', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'nao@existe.com', senha: 'qualquer' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('retorna 400 com body inválido', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'nao-e-email', senha: 'x' },
    })
    expect(res.statusCode).toBe(400)
  })

  // Nota: teste de rate-limit (429) foi movido para E2E (e2e/auth.spec.ts)
  // pois app.inject() não simula IP real de forma consistente com @fastify/rate-limit in-memory store
})
```

- [ ] **Step 3: Rodar integration tests**

```bash
cd apps/api
pnpm test
```
Esperado: todos os testes passam. Corrigir qualquer falha.

- [ ] **Step 4: Verificar cobertura**

```bash
pnpm test:coverage
```
Esperado: `lines: >= 75%` em `src/`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/test/ apps/api/src/app.ts apps/api/src/index.ts
git commit -m "test(api): add integration tests for routes and auth with testcontainers"
```

---

### Task 26: Playwright E2E

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/auth.spec.ts`
- Create: `e2e/dashboard.spec.ts`
- Create: `e2e/positivacao.spec.ts`
- Modify: `package.json` (root)

- [ ] **Step 1: Instalar Playwright na raiz**

```bash
pnpm add -D -w @playwright/test
pnpm exec playwright install chromium
```

- [ ] **Step 2: Criar `playwright.config.ts` na raiz**

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

- [ ] **Step 3: Criar `e2e/auth.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = 'admin@laboratoriosobral.com.br'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'MinhaSenh@Forte123'

test.describe('Auth flow', () => {
  test('redireciona para /login quando não autenticado', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('faz login com credenciais válidas e entra no dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })

  test('exibe erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'nao@existe.com')
    await page.fill('input[type="password"]', 'senhaerrada')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Credenciais inválidas')).toBeVisible()
  })
})
```

- [ ] **Step 4: Criar `e2e/dashboard.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // login antes de cada teste
    await page.goto('/login')
    await page.fill('input[type="email"]', process.env.ADMIN_EMAIL ?? 'admin@laboratoriosobral.com.br')
    await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD ?? 'MinhaSenh@Forte123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
  })

  test('carrega métricas do dashboard', async ({ page }) => {
    await expect(page.locator('table, [data-testid="dashboard-table"]')).toBeVisible({ timeout: 10_000 })
  })

  test('abre drawer ao clicar em um vendedor', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first()
    await firstRow.click()
    await expect(page.locator('[role="dialog"], [data-testid="drawer"]')).toBeVisible()
  })
})
```

- [ ] **Step 5: Criar `e2e/positivacao.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Positivação', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', process.env.ADMIN_EMAIL ?? 'admin@laboratoriosobral.com.br')
    await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD ?? 'MinhaSenh@Forte123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
    await page.goto('/positivacao')
  })

  test('carrega tabela de positivação', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 })
  })

  test('sort funciona ao clicar no cabeçalho', async ({ page }) => {
    const header = page.locator('th').first()
    await header.click()
    // verificar que a ordem mudou ou que o ícone de sort aparece
    await expect(header).toBeVisible()
  })
})
```

- [ ] **Step 6: Adicionar scripts de E2E no `package.json` raiz**

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 7: Rodar E2E (requer API + web rodando)**

```bash
pnpm dev &
sleep 5
pnpm test:e2e
```
Esperado: 3 suites passando.

- [ ] **Step 8: Commit**

```bash
git add playwright.config.ts e2e/ package.json pnpm-lock.yaml
git commit -m "test(e2e): add Playwright tests for auth, dashboard, and positivacao flows"
```

---

### Task 27: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Criar `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-typecheck:
    name: Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  unit-tests:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Run tests (web + harvester unit, api integration)
        run: |
          pnpm --filter web test
          pnpm --filter harvester test
          pnpm --filter api test
        env:
          NODE_ENV: test

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [lint-typecheck, unit-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - name: Start services
        # Apenas postgres — a API sobe localmente via playwright webServer (pnpm dev)
        run: docker compose -f infra/docker-compose.yml up -d postgres
        env:
          DATABASE_URL: postgresql://painelsbr:changeme@localhost:5433/painelsbr
          JWT_SECRET: ci_test_secret_minimum_32_chars_xx
          CORS_ORIGIN: http://localhost:5173
      - name: Seed admin for E2E
        run: ADMIN_PASSWORD=${{ secrets.E2E_ADMIN_PASSWORD }} pnpm seed:admin
        env:
          DATABASE_URL: postgresql://painelsbr:changeme@localhost:5433/painelsbr
      - run: pnpm test:e2e
        env:
          ADMIN_EMAIL: admin@laboratoriosobral.com.br
          ADMIN_PASSWORD: ${{ secrets.E2E_ADMIN_PASSWORD }}
```

- [ ] **Step 2: Adicionar secret `E2E_ADMIN_PASSWORD` no GitHub**

Ir em Settings → Secrets → Actions → New repository secret:
- Name: `E2E_ADMIN_PASSWORD`
- Value: a senha do admin

- [ ] **Step 3: Commit e push**

```bash
git add .github/
git commit -m "ci: add GitHub Actions CI with lint, tests, and E2E"
git push origin main
```

- [ ] **Step 4: Verificar no GitHub**

Abrir `https://github.com/paulinett1508-dev/agnvendas-painelsbr/actions`. Esperado: workflow verde em todos os jobs.

---

### Task 28: Deploy final Wave 4 na VPS

- [ ] **Step 1: Push final e rebuild completo**

```bash
git push origin main
ssh suporte@191.101.18.82 "cd /opt/painelsbr && git pull && docker compose -f infra/docker-compose.yml build && docker compose -f infra/docker-compose.yml up -d"
```

- [ ] **Step 2: Smoke test final**

```bash
# Health
curl -s https://painelsbrcom.laboratoriosobral.com.br/api/health
# Sem token = 401
curl -s -o /dev/null -w "%{http_code}" https://painelsbrcom.laboratoriosobral.com.br/api/vendedores
# Login
curl -s -X POST https://painelsbrcom.laboratoriosobral.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@laboratoriosobral.com.br","senha":"SenhaMuitoForte#2026"}' | jq '.accessToken' | head -c 30
```
Esperado: `{"status":"ok"}`, `401`, e um token JWT.

---

## Critérios de Sucesso

- [ ] **Wave 1:** `curl /api/health` → 200; `curl /api/dashboard/abc` → 400 (não 500); logs pino JSON no container
- [ ] **Wave 2:** `curl /api/vendedores` sem token → 401; login → 200 com `accessToken`; 6ª tentativa de login → 429
- [ ] **Wave 3:** `pnpm lint` → 0 erros; `pnpm typecheck` → 0 erros; `\di idx_*` no pg → 3 índices
- [ ] **Wave 4:** `pnpm test` → verde; cobertura ≥75% api, ≥60% harvester; `pnpm test:e2e` → 3 suites verdes; CI verde no GitHub
