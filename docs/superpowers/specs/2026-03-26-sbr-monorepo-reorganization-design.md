# Design: Reorganização em `sbr-monorepo`

**Data:** 2026-03-26
**Status:** Aprovado

---

## Contexto

Atualmente os projetos do Laboratório Sobral estão dispersos em múltiplos repositórios independentes e dentro de um monorepo genérico (`miranda-monorepo`) que também contém apps não relacionados. Isso gerou o problema concreto de apps não-SBR (`f1-pulse`, `supercartolamanager`) sendo implantados por acidente em VPS da Sobral.

**Repositórios a consolidar:**

| Repo atual | App | Deploy atual |
|---|---|---|
| `agnvendas-painelsbr` | painel gerencial AGN Vendas | VPS Hostinger |
| `pedidomobile` | relatórios de pedidos por RCA | Vercel |
| `miranda-monorepo/apps/crm-sbr` | CRM SBR | VPS Hostinger |
| `miranda-monorepo/apps/sbr-ocomon` | sistema ocomon | VPS Hostinger |

---

## Objetivo

Criar um novo repositório `sbr-monorepo` que:
- Consolida todos os 4 projetos SBR em um único lugar
- Preserva o histórico git completo de cada repo
- Não quebra nenhuma funcionalidade ou deploy em produção
- Usa Turborepo + pnpm (mesmo padrão do `miranda-monorepo`)
- Mantém os repos originais ativos como backup/referência

---

## Estrutura de Pastas

```
sbr-monorepo/
├── apps/
│   ├── agnvendas/              ← repo agnvendas-painelsbr inteiro
│   │   ├── apps/api/           ← estrutura interna não muda
│   │   ├── apps/web/
│   │   ├── packages/harvester/
│   │   └── infra/
│   ├── pedidomobile/           ← repo pedidomobile inteiro
│   ├── crm-sbr/                ← de miranda-monorepo/apps/crm-sbr
│   └── sbr-ocomon/             ← de miranda-monorepo/apps/sbr-ocomon
├── packages/                   ← futuro: shared libs entre apps
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── .github/
    └── workflows/
        ├── ci.yml
        └── deploy-agnvendas.yml  (opcional)
```

**Princípio:** cada app entra inteiro em `apps/<nome>/` sem alterar sua estrutura interna.

---

## Tooling

### `pnpm-workspace.yaml`
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### `turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "type-check": {}
  }
}
```

### Convenção de nomes (`package.json` de cada app)

| App | `name` |
|---|---|
| agnvendas | `@sbr/agnvendas` |
| pedidomobile | `@sbr/pedidomobile` |
| crm-sbr | `@sbr/crm-sbr` |
| sbr-ocomon | `@sbr/sbr-ocomon` |

Esta é a **única mudança** necessária dentro de cada app.

### Comandos úteis
```bash
pnpm --filter @sbr/agnvendas dev      # rodar app específico
pnpm --filter @sbr/pedidomobile build
pnpm build                            # build de todos
pnpm --filter @sbr/sbr-ocomon add express
```

---

## Estratégia de Migração Git

**Ferramenta:** `git filter-repo` (recomendação oficial do Git)

**Pré-requisito:**
```bash
pip install git-filter-repo
```

**Processo por app (repetir 4x):**
```bash
# 1. Clonar repo original em pasta temporária
git clone https://github.com/paulinett1508-dev/<repo>.git /tmp/<nome>
cd /tmp/<nome>

# 2. Reescrever histórico: todos os arquivos movem para apps/<nome>/
git filter-repo --to-subdirectory-filter apps/<nome>

# 3. Fundir no monorepo
cd /path/to/sbr-monorepo
git remote add <nome> /tmp/<nome>
git fetch <nome>
git merge --allow-unrelated-histories <nome>/main --no-edit
git remote remove <nome>
```

**Ordem de importação:**

| Ordem | App | Motivo |
|---|---|---|
| 1º | `sbr-ocomon` | Menor risco — validar processo |
| 2º | `crm-sbr` | Idem |
| 3º | `pedidomobile` | Crítico — validar histórico |
| 4º | `agnvendas` | Mais complexo — deixar por último |

**Commit final após os 4 merges:**
```bash
# Adicionar scaffolding raiz do monorepo
git add turbo.json pnpm-workspace.yaml package.json .github/
git commit -m "chore: setup monorepo root (turborepo + pnpm workspaces)"
git push
```

---

## Atualização de Infra

### VPS Hostinger

```bash
# Clonar monorepo na VPS (uma vez)
git clone https://github.com/paulinett1508-dev/sbr-monorepo.git /opt/sbr-monorepo

# Cada app sobe seus próprios containers (per-app Docker — sem orquestração central)
cd /opt/sbr-monorepo/apps/agnvendas/infra && docker compose up -d
cd /opt/sbr-monorepo/apps/sbr-ocomon && docker compose up -d
cd /opt/sbr-monorepo/apps/crm-sbr && docker compose up -d

# Para atualizar um app individualmente
cd /opt/sbr-monorepo && git pull
cd apps/agnvendas/infra && docker compose up -d --build
```

### Limpeza da VPS (apps não-SBR)

```bash
# Remover clone incorreto do miranda-monorepo
rm -rf /home/suporte/projetos/sbr-ocomon
```

### Vercel — pedidomobile

Única mudança: configurar o Root Directory no painel Vercel.

```
Vercel Dashboard → pedidomobile → Settings → General
  Root Directory: apps/pedidomobile
```

O deploy só trigera quando arquivos em `apps/pedidomobile/` mudam.

### Domínio / nginx / containers

**Nenhuma mudança.** O domínio, nginx e containers do agnvendas continuam funcionando — apenas o path de clone na VPS muda.

---

## Repos Originais

Manter todos os 4 repos originais no GitHub como backup ativo (não arquivar). Adicionar aviso no README de cada um:

```markdown
> Este repositório foi migrado para
> [sbr-monorepo](https://github.com/paulinett1508-dev/sbr-monorepo).
> Mantido como backup de referência.
```

---

## O que NÃO muda

- Estrutura interna de cada app
- Docker Compose de cada app
- Configuração de nginx e domínios
- Deploy do pedidomobile no Vercel (só muda o Root Directory)
- Portas de desenvolvimento
- Variáveis de ambiente (`.env` de cada app)

---

## Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Histórico corrompido durante filter-repo | Sempre operar em clone temporário — repo original intacto |
| Deploy quebrar durante transição | Manter repo original ativo; só migrar VPS após monorepo validado |
| pnpm install falhar por conflito de nomes | Garantir que `name` em cada `package.json` seja único com prefixo `@sbr/` |
