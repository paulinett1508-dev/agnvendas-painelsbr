# Roteiro de Deploy — Painel SBR

## 1. Primeira vez: clonar o repositório na VPS

```bash
ssh VPS-SBR
sudo mkdir -p /opt/painelsbr
sudo chown suporte:suporte /opt/painelsbr
git clone <URL_DO_REPO> /opt/painelsbr
```

## 2. Criar o .env de produção

```bash
cp /opt/painelsbr/.env.prod.example /opt/painelsbr/.env
nano /opt/painelsbr/.env   # editar a senha do Postgres
```

## 3. Subir os containers

```bash
cd /opt/painelsbr
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d --build
```

## 4. Rodar as migrations (primeira vez)

```bash
docker exec sbr-api sh -c "DATABASE_URL=\$DATABASE_URL npx drizzle-kit migrate --config apps/api/drizzle.config.ts" 2>/dev/null
# ou direto no container:
docker exec -it sbr-api sh
# dentro do container:
node -e "require('./apps/api/dist/db/migrate')"
```

Alternativa mais simples: rodar a migration de fora via DATABASE_URL:
```bash
DATABASE_URL="postgresql://painelsbr:SENHA@localhost:5433/painelsbr" \
  cd /opt/painelsbr && pnpm db:migrate
```

## 5. Configurar o nginx do host

```bash
sudo cp /opt/painelsbr/infra/nginx/vps-host.conf /etc/nginx/sites-available/painel-sbr
# editar o server_name para o domínio real
sudo nano /etc/nginx/sites-available/painel-sbr
sudo ln -sf /etc/nginx/sites-available/painel-sbr /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 6. SSL com Certbot (após apontar o DNS)

```bash
sudo certbot --nginx -d painel.laboratoriosobral.com.br
```

## Atualizações futuras

```bash
ssh VPS-SBR
cd /opt/painelsbr
git pull
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d --build
```

## Verificar logs

```bash
docker logs sbr-harvester -f       # logs do harvester (coletas)
docker logs sbr-api -f             # logs da API
docker compose -f infra/docker-compose.prod.yml ps  # status de todos
```
