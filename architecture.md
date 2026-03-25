# Arquitetura — Painel Gerencial SBR

## Decisão: Backend próprio (não usar Supabase da AGN diretamente no frontend)

O Supabase da AGN expõe uma apikey pública (`sb_publishable_...`) que permite
leitura direta das tabelas. Optamos por NÃO expor isso no frontend do painel por:

1. A apikey pode ser revogada/rotacionada a qualquer momento pelo fornecedor
2. Não temos controle sobre schema changes
3. Precisamos de histórico — o Supabase deles só retorna dados do momento atual
4. Queremos enriquecer os dados com métricas calculadas

## Fluxo de dados
```
[Supabase AGN]
      ↓  GET (readonly, sem auth de usuário)
[Harvester - packages/harvester]
      ↓  INSERT/UPSERT
[PostgreSQL próprio]
      ↓  query
[API Fastify - apps/api]
      ↓  REST/JSON
[Frontend React - apps/web]
```

## Tabelas próprias (PostgreSQL)

### vendedores
| campo | tipo | obs |
|---|---|---|
| id | serial PK | |
| slpcode | varchar | código do vendedor no sistema AGN |
| nome | varchar | |
| funcao | varchar | |
| ativo | boolean | |
| created_at | timestamp | |

### snapshots_dashboard
| campo | tipo | obs |
|---|---|---|
| id | serial PK | |
| slpcode | varchar | |
| meta | numeric | |
| faturamento_mes | numeric | |
| faturamento_dia | numeric | |
| ticket_medio_dia | numeric | |
| percentual_mes | numeric | |
| media_mes | numeric | |
| captured_at | timestamp | momento do scraping |

### snapshots_positivacao
| campo | tipo | obs |
|---|---|---|
| id | serial PK | |
| slpcode | varchar | |
| base_ativa | int | |
| positivacao_atual | int | |
| qtd_venda_mes_atual | int | |
| vr_fat_mes_atual | numeric | |
| vr_fat_mes_anterior1 | numeric | |
| vr_fat_mes_anterior2 | numeric | |
| vr_fat_mes_anterior3 | numeric | |
| captured_at | timestamp | |

### snapshots_top5itens
| campo | tipo | obs |
|---|---|---|
| id | serial PK | |
| slpcode | varchar | |
| itemcode | varchar | |
| item | varchar | |
| qtd | int | |
| percentual | numeric | |
| captured_at | timestamp | |

## Harvester — API da AGN

Base URL: `https://jthpohihrsacpftklctt.supabase.co/rest/v1`
Schema: `lab_sobral`
Auth: apikey pública (ver .env)

Endpoints consumidos:
- `GET /cadastrodevendedores` → lista todos os vendedores
- `GET /dashboard` → faturamento atual de todos
- `GET /positivacao` → positivação de todos
- `GET /top5itens` → top itens por vendedor

Frequência: a cada 30 minutos (node-cron)

## Infra Docker
```yaml
services:
  postgres:   # banco próprio
  api:        # Fastify (porta 3001)
  web:        # React buildado servido via nginx (porta 80)
  nginx:      # reverse proxy (opcional na VPS)
```