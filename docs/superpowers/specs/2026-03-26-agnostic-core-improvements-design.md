# Design Spec — Melhorias via agnostic-core
**Data:** 2026-03-26
**Projeto:** agnvendas-painelsbr
**Referência:** https://github.com/paulinett1508-dev/agnostic-core
**Status:** Aprovado pelo usuário

---

## Contexto

O painel `agnvendas-painelsbr` tem arquitetura sólida (monorepo Node.js/Fastify + React/Vite + PostgreSQL/Drizzle + Docker) mas está em estado MVP: zero error handling, zero validação, zero testes, zero auth, zero lint.

O repositório `agnostic-core` é um acervo de 60+ skills de boas práticas agnósticas de tecnologia. Este spec mapeia as ideias mais relevantes desse acervo para o projeto e define um plano de implementação em 4 waves sequenciais.

---

## Abordagem

**Waves sequenciais** — cada wave é deployável e estável antes de iniciar a próxima. A Wave 1 (fundação) cria a base sobre a qual as demais são construídas. Auth na Wave 2 fica segura porque error handling e validação já existem.

---

## Wave 1 — Fundação

**Objetivo:** tornar o sistema robusto contra falhas silenciosas em produção.
**Skills de referência:** `backend/error-handling.md`, `node.js-patterns.md`

### Error Handling

- Duas classes de erro: `AppError` (operacional, mensagem segura para o cliente) e erros não capturados (log + 500 genérico sem vazar stack trace)
- Middleware centralizado no Fastify via `setErrorHandler`
- Harvester com `try/catch` em cada etapa + retry exponencial (3 tentativas, backoff 1s→2s→4s)
- Falha total no harvester é logada mas não trava o processo — cron continua rodando

### Validação com Zod

- Schemas para parâmetros de rota na API (ex: `slpcode` — string numérica, 1–10 chars)
- Schemas para respostas da API Supabase no harvester (valida antes de inserir)
- Validação de variáveis de ambiente ao iniciar: ausência de `DATABASE_URL` → crash imediato com mensagem clara

### Logging Estruturado (pino)

- `pino` já bundlado com Fastify — apenas configurar corretamente
- API: request ID automático em cada log, níveis `info`/`warn`/`error`
- Harvester: log de início/fim com contagem de registros inseridos e duração em ms
- Formato: JSON em produção, pretty em desenvolvimento

### Graceful Shutdown

- Signal handlers `SIGTERM`/`SIGINT` na API e no harvester
- API: para de aceitar conexões, drena as ativas, fecha pool do DB
- Harvester: se cron estiver rodando ao receber sinal, termina o harvest atual antes de sair

---

## Wave 2 — Segurança & Auth

**Objetivo:** proteger o painel e endurecer a superfície de ataque da API.
**Skills de referência:** `backend/api-hardening.md`, `security/owasp-checklist.md`

### JWT + Tela de Login

**Backend:**
- Nova tabela `usuarios` no Postgres: `id`, `email`, `senha_hash` (bcrypt), `created_at`
- Novas rotas:
  - `POST /auth/login` — valida credenciais, retorna access token (8h) + seta refresh token em cookie `httpOnly` (7 dias)
  - `POST /auth/refresh` — troca refresh cookie por novo access token
  - `POST /auth/logout` — invalida o refresh cookie
- Plugin Fastify de autenticação que valida Bearer token em todas as rotas exceto `/health` e `/auth/*`
- Script `pnpm seed:admin` para criar primeiro usuário administrador

**Frontend:**
- Tela de login simples (email + senha) com feedback de erro
- `AuthContext` persistindo token em memória (não localStorage — segurança contra XSS)
- `PrivateRoute` wrapper — redireciona para `/login` se não autenticado
- Ao expirar o token, tenta refresh automático; se falhar, redireciona para login

### Rate Limiting

- Plugin `@fastify/rate-limit`
- Rotas gerais: 100 req/min por IP
- `POST /auth/login`: 5 tentativas/min por IP (anti brute-force)

### CORS Hardening

- Trocar `origin: true` por lista explícita via env var `CORS_ORIGIN`
- Ex: `https://painelsbrcom.laboratoriosobral.com.br`

---

## Wave 3 — Qualidade de Código

**Objetivo:** padronizar o código e facilitar manutenção contínua.
**Skills de referência:** `automation.md`, `database/schema-design.md`, `documentation/openapi.md`

### ESLint + Prettier + Husky

- ESLint flat config na raiz (`eslint.config.js`) compartilhada pelo monorepo
- Rules: `@typescript-eslint/recommended`, `no-console` (warn), `no-unused-vars`, `no-explicit-any`
- Prettier: `singleQuote: true`, `semi: false`, `printWidth: 100`
- Husky + lint-staged: pre-commit roda lint + format apenas em arquivos staged
- Scripts `pnpm lint` e `pnpm format` na raiz

### TypeScript Mais Strict

Adicionar em todos os `tsconfig.json`:
```json
"noUnusedLocals": true,
"noUnusedParameters": true,
"noFallthroughCasesInSwitch": true,
"forceConsistentCasingInFileNames": true
```

### Índices no Banco

Nova migration Drizzle com 3 índices baseados nas queries mais frequentes:
- `snapshots_dashboard(slpcode, captured_at DESC)`
- `snapshots_positivacao(slpcode, captured_at DESC)`
- `snapshots_top5itens(slpcode, captured_at DESC)`

Aplicada automaticamente no startup da API via `drizzle migrate`.

### Documentação OpenAPI

- `@fastify/swagger` + `@fastify/swagger-ui` → rota `/docs`
- Gerado automaticamente a partir dos schemas Zod criados na Wave 1
- Zero overhead adicional de documentação manual

---

## Wave 4 — Testes

**Objetivo:** cobertura ~75% com unit + integration + E2E nos fluxos críticos.
**Skills de referência:** `testing/unit-testing.md`, `testing/integration-testing.md`, `testing/e2e-testing.md`

### Vitest — Unit Tests

Arquivos `*.test.ts` ao lado dos módulos testados:
- `apps/web/src/lib/format.ts` — formatação de moeda, percentual, datas
- `packages/harvester/src/client.ts` — `parseDecimal()` e transformações
- Schemas Zod — casos de borda (slpcode inválido, campos ausentes, tipos errados)
- Utilitários de auth — geração e validação de JWT

### Vitest — Integration Tests

- `globalSetup` sobe Postgres isolado via `testcontainers`, roda migrations, teardown ao final
- Testa todas as rotas da API (6 existentes + 3 de auth)
- Factories de dados: `createVendedor()`, `createSnapshot()`, `createUsuario()`
- Casos de erro: slpcode inválido → 422, token ausente → 401, credenciais erradas → 401

**Cobertura alvo:** ~75% de `apps/api/src/` e `packages/harvester/src/`

### Playwright — E2E

3 fluxos críticos em `e2e/`:
1. **Auth flow:** acessar painel sem login → redireciona para `/login` → login → entra no dashboard
2. **Dashboard:** carrega métricas → clica em vendedor → drawer abre com dados corretos
3. **Positivação:** carrega tabela → sort funciona

### CI — GitHub Actions

Workflow `ci.yml` em todo PR para `main`:
1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test` (Vitest)
4. `pnpm test:e2e` (Playwright)

Bloqueia merge se qualquer step falhar.

---

## Decisões Técnicas

| Decisão | Escolha | Motivo |
|---|---|---|
| Validação | Zod | Integração nativa com Fastify via `@fastify/type-provider-zod`, reutilizável no frontend |
| Logging | pino | Já bundlado no Fastify, JSON estruturado, alta performance |
| Auth tokens | JWT access (8h) + refresh httpOnly (7d) | Equilíbrio segurança/UX; access curto limita exposição |
| Testes unitários | Vitest | Nativo do Vite, mesma config do frontend, rápido |
| Testes E2E | Playwright | Suporte multi-browser, API moderna, boa DX |
| DB no teste | testcontainers | Banco real isolado, sem mocks que mascaram bugs |
| Linting | ESLint flat config | Novo padrão ESLint 9+, mais simples de manter em monorepo |

---

## Arquivos que serão criados/modificados

### Wave 1
- `apps/api/src/errors.ts` — classes de erro
- `apps/api/src/index.ts` — adicionar error handler, env validation, graceful shutdown
- `apps/api/src/env.ts` — schema Zod para env vars
- `packages/harvester/src/harvest.ts` — retry logic + try/catch
- `packages/harvester/src/index.ts` — graceful shutdown

### Wave 2
- `apps/api/src/db/schema.ts` — tabela `usuarios`
- `apps/api/src/routes/auth.ts` — rotas de auth
- `apps/api/src/plugins/authenticate.ts` — plugin JWT
- `apps/web/src/context/AuthContext.tsx` — auth state
- `apps/web/src/pages/Login.tsx` — tela de login
- `apps/web/src/components/PrivateRoute.tsx`
- `apps/api/scripts/seed-admin.ts`
- `infra/docker-compose.yml` — env vars de auth

### Wave 3
- `eslint.config.js` — config raiz
- `.prettierrc` — config Prettier
- `.husky/pre-commit` — hook
- `apps/api/src/db/migrations/003_indices.ts` — nova migration

### Wave 4
- `apps/api/src/**/*.test.ts` — unit + integration tests
- `packages/harvester/src/**/*.test.ts`
- `apps/web/src/lib/*.test.ts`
- `e2e/auth.spec.ts`
- `e2e/dashboard.spec.ts`
- `e2e/positivacao.spec.ts`
- `.github/workflows/ci.yml`

---

## Critérios de Sucesso

- [ ] Wave 1: API não retorna 500 com stack trace exposto; harvester não trava se Supabase cair
- [ ] Wave 2: Acessar a URL sem login redireciona para `/login`; brute-force retorna 429
- [ ] Wave 3: `pnpm lint` passa sem erros; `pnpm typecheck` passa sem erros
- [ ] Wave 4: `pnpm test` verde com ≥75% cobertura; `pnpm test:e2e` verde nos 3 fluxos
