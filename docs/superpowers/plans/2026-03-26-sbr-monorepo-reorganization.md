# sbr-monorepo Reorganization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidar agnvendas-painelsbr, pedidomobile, crm-sbr e sbr-ocomon em um único repositório `sbr-monorepo` preservando o histórico git completo de cada app, configurando Turborepo + pnpm workspaces, sem quebrar nenhum deploy em produção.

**Architecture:** Cada app entra inteiro dentro de `apps/<nome>/` sem alterar sua estrutura interna. O monorepo raiz gerencia os quatro apps como workspace members. agnvendas mantém seu próprio workspace interno (`apps/api`, `apps/web`, `packages/harvester`) e requer um `pnpm install` interno separado. Os demais apps são workspaces planos.

**Tech Stack:** git filter-repo, pnpm workspaces, Turborepo 2, Node.js 20+, Docker Compose (per-app), Vercel (pedidomobile), VPS Hostinger (demais apps).

---

## Estrutura de Arquivos

**Criar:**
- `sbr-monorepo/turbo.json`
- `sbr-monorepo/pnpm-workspace.yaml`
- `sbr-monorepo/package.json`
- `sbr-monorepo/.github/workflows/ci.yml`
- `sbr-monorepo/README.md`

**Modificar (renomear campo `name`):**
- `sbr-monorepo/apps/agnvendas/package.json` — `"agnvendas-painelsbr"` → `"@sbr/agnvendas"`
- `sbr-monorepo/apps/pedidomobile/package.json` — `"pedidomobile"` → `"@sbr/pedidomobile"`
- `sbr-monorepo/apps/crm-sbr/package.json` — `"@miranda/crm-sbr"` → `"@sbr/crm-sbr"`
- `sbr-monorepo/apps/sbr-ocomon/package.json` — `"@miranda/sbr-ocomon"` → `"@sbr/sbr-ocomon"`

**Deletar:**
- `sbr-monorepo/apps/pedidomobile/package-lock.json` — substituído pelo lockfile pnpm da raiz

**Modificar (aviso de migração):**
- `agnvendas-painelsbr/README.md`
- `pedidomobile/README.md`
- `miranda-monorepo/apps/crm-sbr/README.md`
- `miranda-monorepo/apps/sbr-ocomon/README.md` (se existir)

---

## Pré-requisitos

Antes de iniciar, verifique:

```bash
git --version          # >= 2.30
node --version         # >= 20
pnpm --version         # >= 9
```

**git-filter-repo** requer Python. Se `python --version` retornar erro (como ocorre nesta máquina):

```
# Opção 1: instalar Python pelo Microsoft Store (indicado no próprio erro)
# Opção 2 (recomendada): executar os passos de migração diretamente na VPS
#   A VPS tem Python disponível via apt e Git instalado.
#   Faça SSH na VPS para as Tasks 3–6.
```

---

## Task 1: Criar `sbr-monorepo` no GitHub e clonar local

**Files:**
- Create: `sbr-monorepo/` (novo repositório)

- [ ] **Step 1: Criar repositório vazio no GitHub**

Acesse github.com → New repository → nome: `sbr-monorepo`, privado, sem README/gitignore.

- [ ] **Step 2: Clonar localmente**

```bash
cd /c/PROJETOS
git clone https://github.com/paulinett1508-dev/sbr-monorepo.git
cd sbr-monorepo
```

- [ ] **Step 3: Commit inicial vazio**

```bash
git commit --allow-empty -m "chore: init sbr-monorepo"
git push origin main
```

Expected: branch `main` criada no GitHub com 1 commit.

---

## Task 2: Instalar git-filter-repo na VPS

> Se optou por rodar na VPS, faça SSH agora. Se instalou Python local, adapte o comando.

**Files:** nenhum arquivo de código.

- [ ] **Step 1: Conectar na VPS e instalar**

```bash
# Na VPS via SSH
pip3 install git-filter-repo
```

Expected:
```
Successfully installed git-filter-repo-2.x.x
```

- [ ] **Step 2: Verificar instalação**

```bash
git filter-repo --version
```

Expected: `git filter-repo 2.x.x`

---

## Task 3: Migrar `sbr-ocomon` para o monorepo

> Primeiro app a migrar — menor risco, serve para validar o processo.

**Files:** `sbr-monorepo/apps/sbr-ocomon/` (todo o conteúdo do repo miranda-monorepo/apps/sbr-ocomon)

- [ ] **Step 1: Clonar sbr-ocomon em pasta temporária**

```bash
# Clonar somente o subdiretório apps/sbr-ocomon do miranda-monorepo
git clone https://github.com/paulinett1508-dev/miranda-monorepo.git ~/tmp/sbr-ocomon-migration
cd ~/tmp/sbr-ocomon-migration

# Manter apenas o histórico do apps/sbr-ocomon
git filter-repo --subdirectory-filter apps/sbr-ocomon
```

Expected: o repo temporário agora contém apenas os arquivos e commits de `apps/sbr-ocomon`. Verifique com `ls` — deve mostrar: `CLAUDE.md client docker-compose.yml Dockerfile ...`

- [ ] **Step 2: Mover arquivos para `apps/sbr-ocomon/` dentro do monorepo**

```bash
cd ~/tmp/sbr-ocomon-migration
git filter-repo --to-subdirectory-filter apps/sbr-ocomon
```

Expected: `git log --oneline -3` deve mostrar commits com paths `apps/sbr-ocomon/...`

- [ ] **Step 3: Fundir no sbr-monorepo**

```bash
cd /c/PROJETOS/sbr-monorepo   # ou o path correto na VPS
git remote add sbr-ocomon ~/tmp/sbr-ocomon-migration
git fetch sbr-ocomon
git merge --allow-unrelated-histories sbr-ocomon/main --no-edit
git remote remove sbr-ocomon
```

- [ ] **Step 4: Verificar resultado**

```bash
ls apps/sbr-ocomon/
# Expected: CLAUDE.md  client/  docker-compose.yml  Dockerfile  ...

git log --oneline apps/sbr-ocomon/ | head -5
# Expected: commits do histórico original de sbr-ocomon com paths corretos
```

- [ ] **Step 5: Commit de verificação**

```bash
git push origin main
```

---

## Task 4: Migrar `crm-sbr` para o monorepo

**Files:** `sbr-monorepo/apps/crm-sbr/`

- [ ] **Step 1: Clonar crm-sbr em pasta temporária**

```bash
git clone https://github.com/paulinett1508-dev/miranda-monorepo.git ~/tmp/crm-sbr-migration
cd ~/tmp/crm-sbr-migration
git filter-repo --subdirectory-filter apps/crm-sbr
git filter-repo --to-subdirectory-filter apps/crm-sbr
```

Expected: `git log --oneline -3` mostra commits com paths `apps/crm-sbr/...`

- [ ] **Step 2: Fundir no sbr-monorepo**

```bash
cd /c/PROJETOS/sbr-monorepo
git remote add crm-sbr ~/tmp/crm-sbr-migration
git fetch crm-sbr
git merge --allow-unrelated-histories crm-sbr/main --no-edit
git remote remove crm-sbr
```

- [ ] **Step 3: Verificar resultado**

```bash
ls apps/crm-sbr/
# Expected: App.tsx  CLAUDE.md  components/  package.json  ...

git log --oneline apps/crm-sbr/ | head -5
```

- [ ] **Step 4: Push**

```bash
git push origin main
```

---

## Task 5: Migrar `pedidomobile` para o monorepo

**Files:** `sbr-monorepo/apps/pedidomobile/`

- [ ] **Step 1: Clonar pedidomobile em pasta temporária**

```bash
git clone https://github.com/paulinett1508-dev/pedidomobile.git ~/tmp/pedidomobile-migration
cd ~/tmp/pedidomobile-migration
```

> Este repo tem uma subpasta `pedidomobile/` dentro (o PEDIDO-MOBILE local tem essa estrutura). Verifique:

```bash
ls
# Se a raiz do clone já tem package.json → pular o próximo filtro
# Se a raiz tem uma pasta pedidomobile/ com o código dentro → aplicar:
# git filter-repo --subdirectory-filter pedidomobile
```

- [ ] **Step 2: Reescrever histórico para `apps/pedidomobile/`**

```bash
git filter-repo --to-subdirectory-filter apps/pedidomobile
```

Expected: `git log --oneline -3` mostra commits com paths `apps/pedidomobile/...`

- [ ] **Step 3: Fundir no sbr-monorepo**

```bash
cd /c/PROJETOS/sbr-monorepo
git remote add pedidomobile ~/tmp/pedidomobile-migration
git fetch pedidomobile
git merge --allow-unrelated-histories pedidomobile/main --no-edit
git remote remove pedidomobile
```

- [ ] **Step 4: Verificar resultado**

```bash
ls apps/pedidomobile/
# Expected: app/  components/  data/  package.json  next.config.js  ...

git log --oneline apps/pedidomobile/ | head -5
# Deve mostrar histórico completo do pedidomobile
```

- [ ] **Step 5: Push**

```bash
git push origin main
```

---

## Task 6: Migrar `agnvendas-painelsbr` para o monorepo

> O mais complexo — tem workspace interno próprio.

**Files:** `sbr-monorepo/apps/agnvendas/`

- [ ] **Step 1: Clonar agnvendas em pasta temporária**

```bash
git clone https://github.com/paulinett1508-dev/agnvendas-painelsbr.git ~/tmp/agnvendas-migration
cd ~/tmp/agnvendas-migration
git filter-repo --to-subdirectory-filter apps/agnvendas
```

Expected: `git log --oneline -3` mostra commits com paths `apps/agnvendas/...`

- [ ] **Step 2: Fundir no sbr-monorepo**

```bash
cd /c/PROJETOS/sbr-monorepo
git remote add agnvendas ~/tmp/agnvendas-migration
git fetch agnvendas
git merge --allow-unrelated-histories agnvendas/main --no-edit
git remote remove agnvendas
```

- [ ] **Step 3: Verificar resultado**

```bash
ls apps/agnvendas/
# Expected: apps/  packages/  infra/  CLAUDE.md  package.json  pnpm-workspace.yaml  ...

ls apps/agnvendas/apps/
# Expected: api/  web/

git log --oneline apps/agnvendas/ | head -5
```

- [ ] **Step 4: Push**

```bash
git push origin main
```

---

## Task 7: Adicionar scaffold do monorepo raiz

**Files:**
- Create: `sbr-monorepo/package.json`
- Create: `sbr-monorepo/pnpm-workspace.yaml`
- Create: `sbr-monorepo/turbo.json`
- Create: `sbr-monorepo/.github/workflows/ci.yml`
- Create: `sbr-monorepo/README.md`

- [ ] **Step 1: Criar `package.json` raiz**

```bash
cat > /c/PROJETOS/sbr-monorepo/package.json << 'EOF'
{
  "name": "sbr-monorepo",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "type-check": "turbo type-check"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  },
  "packageManager": "pnpm@10.31.0",
  "engines": {
    "node": ">=20"
  }
}
EOF
```

- [ ] **Step 2: Criar `pnpm-workspace.yaml`**

```bash
cat > /c/PROJETOS/sbr-monorepo/pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
EOF
```

> Nota: agnvendas tem workspace interno próprio (`apps/agnvendas/pnpm-workspace.yaml`).
> Suas sub-dependências (api, web, harvester) são instaladas separadamente com
> `cd apps/agnvendas && pnpm install`.

- [ ] **Step 3: Criar `turbo.json`**

```bash
cat > /c/PROJETOS/sbr-monorepo/turbo.json << 'EOF'
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
EOF
```

- [ ] **Step 4: Criar `.github/workflows/ci.yml`**

```bash
mkdir -p /c/PROJETOS/sbr-monorepo/.github/workflows
cat > /c/PROJETOS/sbr-monorepo/.github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install root dependencies
        run: pnpm install

      - name: Install agnvendas internal dependencies
        run: cd apps/agnvendas && pnpm install

      - name: Build all apps
        run: pnpm build
EOF
```

- [ ] **Step 5: Criar `README.md`**

```bash
cat > /c/PROJETOS/sbr-monorepo/README.md << 'EOF'
# sbr-monorepo

Monorepo dos sistemas do Laboratório Sobral.

## Apps

| App | Descrição | Deploy |
|-----|-----------|--------|
| [agnvendas](apps/agnvendas/) | Painel gerencial AGN Vendas | VPS Hostinger |
| [pedidomobile](apps/pedidomobile/) | Relatórios de pedidos por RCA | Vercel |
| [crm-sbr](apps/crm-sbr/) | CRM SBR | VPS Hostinger |
| [sbr-ocomon](apps/sbr-ocomon/) | Sistema Ocomon | VPS Hostinger |

## Setup

```bash
pnpm install                    # instala deps dos apps (exceto agnvendas interno)
cd apps/agnvendas && pnpm install  # instala deps internas do agnvendas
```

## Comandos

```bash
pnpm --filter @sbr/agnvendas dev
pnpm --filter @sbr/pedidomobile dev
pnpm --filter @sbr/crm-sbr dev
pnpm --filter @sbr/sbr-ocomon dev
pnpm build                      # build de todos
```
EOF
```

- [ ] **Step 6: Commit**

```bash
cd /c/PROJETOS/sbr-monorepo
git add package.json pnpm-workspace.yaml turbo.json .github/ README.md
git commit -m "chore: add monorepo root scaffold (turborepo + pnpm workspaces)"
git push origin main
```

---

## Task 8: Atualizar nomes dos `package.json` de cada app

**Files:**
- Modify: `apps/agnvendas/package.json`
- Modify: `apps/pedidomobile/package.json`
- Modify: `apps/crm-sbr/package.json`
- Modify: `apps/sbr-ocomon/package.json`

- [ ] **Step 1: agnvendas**

```bash
# Substituir "agnvendas-painelsbr" por "@sbr/agnvendas"
sed -i 's/"name": "agnvendas-painelsbr"/"name": "@sbr\/agnvendas"/' \
  /c/PROJETOS/sbr-monorepo/apps/agnvendas/package.json

grep '"name"' /c/PROJETOS/sbr-monorepo/apps/agnvendas/package.json
# Expected: "name": "@sbr/agnvendas",
```

- [ ] **Step 2: pedidomobile**

```bash
sed -i 's/"name": "pedidomobile"/"name": "@sbr\/pedidomobile"/' \
  /c/PROJETOS/sbr-monorepo/apps/pedidomobile/package.json

grep '"name"' /c/PROJETOS/sbr-monorepo/apps/pedidomobile/package.json
# Expected: "name": "@sbr/pedidomobile",
```

- [ ] **Step 3: crm-sbr**

```bash
sed -i 's/"name": "@miranda\/crm-sbr"/"name": "@sbr\/crm-sbr"/' \
  /c/PROJETOS/sbr-monorepo/apps/crm-sbr/package.json

grep '"name"' /c/PROJETOS/sbr-monorepo/apps/crm-sbr/package.json
# Expected: "name": "@sbr/crm-sbr",
```

- [ ] **Step 4: sbr-ocomon**

```bash
sed -i 's/"name": "@miranda\/sbr-ocomon"/"name": "@sbr\/sbr-ocomon"/' \
  /c/PROJETOS/sbr-monorepo/apps/sbr-ocomon/package.json

grep '"name"' /c/PROJETOS/sbr-monorepo/apps/sbr-ocomon/package.json
# Expected: "name": "@sbr/sbr-ocomon",
```

- [ ] **Step 5: Deletar package-lock.json do pedidomobile**

```bash
rm /c/PROJETOS/sbr-monorepo/apps/pedidomobile/package-lock.json
```

- [ ] **Step 6: Commit**

```bash
cd /c/PROJETOS/sbr-monorepo
git add apps/agnvendas/package.json apps/pedidomobile/package.json \
        apps/crm-sbr/package.json apps/sbr-ocomon/package.json
git rm apps/pedidomobile/package-lock.json
git commit -m "chore: rename packages to @sbr/* scope"
git push origin main
```

---

## Task 9: Verificar instalação de dependências

**Files:** `sbr-monorepo/pnpm-lock.yaml` (gerado automaticamente)

- [ ] **Step 1: Instalar deps da raiz**

```bash
cd /c/PROJETOS/sbr-monorepo
pnpm install
```

Expected: sem erros. Gerado `pnpm-lock.yaml` na raiz. Turbo instalado em `node_modules/.pnpm`.

- [ ] **Step 2: Instalar deps internas do agnvendas**

```bash
cd /c/PROJETOS/sbr-monorepo/apps/agnvendas
pnpm install
```

Expected: sem erros. Instala api, web, harvester.

- [ ] **Step 3: Verificar filtros funcionam**

```bash
cd /c/PROJETOS/sbr-monorepo
pnpm --filter @sbr/crm-sbr run build
```

Expected: build do crm-sbr (Vite) roda sem erros. Output em `apps/crm-sbr/dist/`.

```bash
pnpm --filter @sbr/agnvendas run build
```

Expected: build do agnvendas roda sem erros (compila api + web internamente).

- [ ] **Step 4: Commit do lockfile**

```bash
cd /c/PROJETOS/sbr-monorepo
git add pnpm-lock.yaml
git commit -m "chore: add pnpm lockfile"
git push origin main
```

---

## Task 10: Atualizar VPS — agnvendas

> Execute via SSH na VPS Hostinger.

**Files:** nenhum arquivo de código — mudança de path na VPS.

- [ ] **Step 1: Clonar sbr-monorepo na VPS**

```bash
# Na VPS
git clone https://github.com/paulinett1508-dev/sbr-monorepo.git /opt/sbr-monorepo
```

- [ ] **Step 2: Verificar que o agnvendas está correto**

```bash
ls /opt/sbr-monorepo/apps/agnvendas/infra/
# Expected: docker-compose.yml  nginx/  (estrutura original intacta)
```

- [ ] **Step 3: Subir containers do agnvendas a partir do novo path**

```bash
cd /opt/sbr-monorepo/apps/agnvendas/infra
docker compose up -d
```

Expected:
```
Container agnvendas-api    Running
Container agnvendas-web    Running
Container agnvendas-db     Running
```

- [ ] **Step 4: Verificar que o domínio continua respondendo**

```bash
curl -I https://<seu-dominio-agnvendas>
# Expected: HTTP/2 200  (ou redirect para login)
```

- [ ] **Step 5: Remover o clone antigo (após confirmar que está tudo ok)**

```bash
# Somente após verificar que o novo path funciona
rm -rf /opt/painelsbr
```

---

## Task 11: Limpar apps não-SBR da VPS

> Remove o clone incorreto do miranda-monorepo que foi parar nesta VPS.

- [ ] **Step 1: Verificar o que está rodando dentro de sbr-ocomon**

```bash
# Na VPS
ls /home/suporte/projetos/sbr-ocomon/apps/
# Expected: sbr-ocomon/  f1-pulse/  supercartolamanager/  ... (o miranda-monorepo inteiro)
```

- [ ] **Step 2: Verificar que nenhum container dos apps indesejados está rodando**

```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "f1-pulse|supercartolamanager"
# Expected: sem output (nenhum container rodando)
```

- [ ] **Step 3: Garantir que sbr-ocomon agora roda pelo monorepo correto**

```bash
ls /opt/sbr-monorepo/apps/sbr-ocomon/
# Expected: CLAUDE.md  client/  docker-compose.yml  Dockerfile  ...

cd /opt/sbr-monorepo/apps/sbr-ocomon
docker compose up -d
```

- [ ] **Step 4: Remover o clone incorreto do miranda-monorepo**

```bash
rm -rf /home/suporte/projetos/sbr-ocomon
```

Expected: `ls /home/suporte/projetos/` não lista mais `sbr-ocomon`.

---

## Task 12: Atualizar Vercel — pedidomobile

**Files:** nenhum arquivo de código — configuração no painel Vercel.

- [ ] **Step 1: Abrir configurações do projeto no Vercel**

```
vercel.com → Dashboard → pedidomobile → Settings → General
```

- [ ] **Step 2: Atualizar Root Directory**

```
Campo "Root Directory": apps/pedidomobile
```

Salvar. O Vercel mostrará um aviso sobre mudança de diretório — confirmar.

- [ ] **Step 3: Triggerar deploy manual para validar**

```
Vercel Dashboard → pedidomobile → Deployments → Redeploy (último deploy)
```

Expected: build conclui sem erros. App acessível na URL do Vercel.

- [ ] **Step 4: Verificar que push fora de `apps/pedidomobile/` NÃO trigera deploy**

Faça um commit em `apps/agnvendas/` e verifique que o Vercel não inicia um novo deploy para pedidomobile.

---

## Task 13: Adicionar avisos nos repos originais

**Files:** README.md de cada repo original.

- [ ] **Step 1: agnvendas-painelsbr**

```bash
cd /c/PROJETOS/agnvendas-painelsbr

# Adicionar no topo do README.md existente (ou criar se não existir)
cat > /tmp/notice.md << 'EOF'
> **Este repositório foi migrado para [sbr-monorepo](https://github.com/paulinett1508-dev/sbr-monorepo).**
> Mantido como backup de referência somente leitura.

---

EOF

# Se existir README, concatenar; caso contrário criar
if [ -f README.md ]; then
  cat README.md >> /tmp/notice.md
  mv /tmp/notice.md README.md
else
  mv /tmp/notice.md README.md
fi

git add README.md
git commit -m "docs: repo migrado para sbr-monorepo"
git push
```

- [ ] **Step 2: pedidomobile**

```bash
cd /c/PROJETOS/PEDIDO-MOBILE/pedidomobile

cat > /tmp/notice.md << 'EOF'
> **Este repositório foi migrado para [sbr-monorepo](https://github.com/paulinett1508-dev/sbr-monorepo).**
> Mantido como backup de referência somente leitura.

---

EOF

if [ -f README.md ]; then
  cat README.md >> /tmp/notice.md
  mv /tmp/notice.md README.md
else
  mv /tmp/notice.md README.md
fi

git add README.md
git commit -m "docs: repo migrado para sbr-monorepo"
git push
```

- [ ] **Step 3: miranda-monorepo (nota nos apps crm-sbr e sbr-ocomon)**

```bash
cd /c/PROJETOS/miranda-monorepo

# crm-sbr
cat > /tmp/notice.md << 'EOF'
> **Este app foi migrado para [sbr-monorepo/apps/crm-sbr](https://github.com/paulinett1508-dev/sbr-monorepo).**
> Mantido como backup de referência somente leitura.

---

EOF
if [ -f apps/crm-sbr/README.md ]; then
  cat apps/crm-sbr/README.md >> /tmp/notice.md
fi
mv /tmp/notice.md apps/crm-sbr/README.md

# sbr-ocomon (criar README se não existir)
cat > apps/sbr-ocomon/MIGRATION.md << 'EOF'
> **Este app foi migrado para [sbr-monorepo/apps/sbr-ocomon](https://github.com/paulinett1508-dev/sbr-monorepo).**
> Mantido como backup de referência somente leitura.
EOF

git add apps/crm-sbr/README.md apps/sbr-ocomon/MIGRATION.md
git commit -m "docs: apps migrados para sbr-monorepo"
git push
```

---

## Checklist de Validação Final

Após todas as tasks, confirmar:

```bash
# 1. Estrutura do monorepo
ls /c/PROJETOS/sbr-monorepo/apps/
# Expected: agnvendas/  crm-sbr/  pedidomobile/  sbr-ocomon/

# 2. Histórico preservado
git -C /c/PROJETOS/sbr-monorepo log --oneline apps/agnvendas/ | wc -l
# Expected: número igual ao histórico original de agnvendas-painelsbr

git -C /c/PROJETOS/sbr-monorepo log --oneline apps/pedidomobile/ | wc -l
# Expected: número igual ao histórico original de pedidomobile

# 3. Filtros pnpm funcionam
cd /c/PROJETOS/sbr-monorepo
pnpm --filter @sbr/agnvendas build   # OK
pnpm --filter @sbr/crm-sbr build    # OK

# 4. Domínio agnvendas respondendo (confirmar na VPS)
curl -I https://<dominio-agnvendas>  # HTTP 200

# 5. pedidomobile no Vercel funcionando
# Verificar URL do Vercel

# 6. VPS limpa
# ssh na VPS: ls /home/suporte/projetos/ → sem sbr-ocomon
```
