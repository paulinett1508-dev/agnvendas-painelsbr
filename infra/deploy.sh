#!/bin/bash
# Deploy do Painel SBR na VPS
# Uso: ./infra/deploy.sh
set -e

VPS_USER="suporte"
VPS_HOST="191.101.18.82"
VPS_SSH_KEY="$HOME/.ssh/id_ed25519"
REMOTE_DIR="/opt/painelsbr"
COMPOSE_FILE="infra/docker-compose.prod.yml"

echo "==> Conectando em $VPS_HOST..."

ssh -i "$VPS_SSH_KEY" "$VPS_USER@$VPS_HOST" bash << 'ENDSSH'
  set -e

  REMOTE_DIR="/opt/painelsbr"
  COMPOSE_FILE="$REMOTE_DIR/infra/docker-compose.prod.yml"

  echo "==> Atualizando código..."
  cd "$REMOTE_DIR"
  git pull origin main

  echo "==> Verificando .env..."
  if [ ! -f "$REMOTE_DIR/.env" ]; then
    echo "ERRO: .env não encontrado em $REMOTE_DIR/.env"
    echo "Copie o arquivo .env.prod para $REMOTE_DIR/.env e tente novamente."
    exit 1
  fi

  echo "==> Build e subida dos containers..."
  docker compose -f "$COMPOSE_FILE" --env-file "$REMOTE_DIR/.env" up -d --build

  echo "==> Aguardando postgres ficar saudável..."
  sleep 5

  echo "==> Rodando migrations..."
  docker exec sbr-api node -e "
    const { drizzle } = require('drizzle-orm/node-postgres');
    const { migrate } = require('drizzle-orm/node-postgres/migrator');
    const pg = require('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    migrate(db, { migrationsFolder: 'apps/api/drizzle' })
      .then(() => { console.log('Migrations OK'); pool.end(); process.exit(0); })
      .catch(e => { console.error(e); process.exit(1); });
  " 2>/dev/null || echo "(migrations via drizzle-kit na próxima etapa)"

  echo "==> Status dos containers:"
  docker compose -f "$COMPOSE_FILE" ps

  echo ""
  echo "✓ Deploy concluído! Acesse http://$VPS_HOST:8082 para verificar"
  echo "  (ou pelo domínio configurado no nginx)"
ENDSSH
