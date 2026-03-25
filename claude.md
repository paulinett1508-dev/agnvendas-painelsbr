# AGN Vendas — Painel Gerencial SBR

## Contexto do Projeto
Painel administrativo independente para gestão de equipe de vendas da empresa Laboratório Sobral.
O sistema original (agnvendas.agna.com.br) é um SaaS de terceiros baseado em Supabase + Firebase Auth.
Este painel consome os dados publicamente expostos via API REST do Supabase do fornecedor e os
retroalimenta em um backend próprio, com histórico, visão consolidada e funcionalidades gerenciais
que o sistema original não oferece.

## Stack
- **Runtime:** Node.js (v20+)
- **Framework API:** Fastify
- **Banco próprio:** PostgreSQL (via Docker)
- **ORM:** Drizzle ORM
- **Scheduler:** node-cron (harvester agendado)
- **Frontend:** React + Vite + TailwindCSS
- **Infra:** Docker Compose → VPS Hostinger
- **Package manager:** pnpm

## Estrutura do Repo
```
agnvendas-painelsbr/
├── apps/
│   ├── api/          # Fastify backend (porta 3001)
│   └── web/          # React frontend (porta 5173 dev / 80 prod)
├── packages/
│   └── harvester/    # Scraper/scheduler que consome a API da AGN
├── infra/
│   ├── docker-compose.yml
│   └── nginx/
├── CLAUDE.md
├── ARCHITECTURE.md
└── SCRAPER.md
```

## Regras Importantes
- NUNCA escrever no Supabase da AGN — acesso é somente leitura
- O harvester roda a cada 30 minutos via cron
- Todos os dados históricos ficam no Postgres próprio
- Variáveis sensíveis sempre em `.env`, nunca commitadas
- Estrutura de pastas: apps/ para aplicações, packages/ para módulos compartilhados

## Portas (dev)
- API: 3001
- Web: 5173
- Postgres: 5432
- pgAdmin: 8080 (opcional)

## Comandos principais
```bash
docker compose up -d          # sobe infra local
pnpm install                  # instala dependências
pnpm dev                      # sobe api + web em paralelo
pnpm harvester:run            # executa harvester manualmente
```