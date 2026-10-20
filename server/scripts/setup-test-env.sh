#!/usr/bin/env bash
# One-time (idempotent) setup of the isolated test database.
# Usage (from repo root or server/):  npm run test:setup -w server
set -euo pipefail
cd "$(dirname "$0")/.."

# Derive isolated test URLs from the local credentials; never replace an existing test file.
if [ ! -f .env.test ]; then
  node <<'JS'
const fs = require('node:fs');
const config = require('dotenv').parse(fs.readFileSync('.env'));
const db = new URL(config.DATABASE_URL); db.pathname = '/examdb_test';
const redis = new URL(config.REDIS_URL); redis.pathname = '/1';
fs.writeFileSync('.env.test', `DATABASE_URL=${db}\nREDIS_URL=${redis}\n`, {mode:0o600});
JS
fi

COMPOSE=(docker compose --env-file ../.env -p online-exam-v1 -f ../docker-compose.yml)
"${COMPOSE[@]}" up -d postgres redis

# wait for Postgres
for _ in $(seq 1 30); do
  "${COMPOSE[@]}" exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d postgres' >/dev/null 2>&1 && break
  sleep 1
done

"${COMPOSE[@]}" exec -T postgres sh -c '
  psql -U "$POSTGRES_USER" -d postgres -lqt | cut -d "|" -f 1 | grep -qw examdb_test || createdb -U "$POSTGRES_USER" examdb_test
'
node <<'JS'
require('dotenv').config({path: '.env.test', override: true});
require('node:child_process').execFileSync('npx', ['prisma', 'migrate', 'deploy'], {stdio:'inherit', env:process.env});
JS
echo "Test database ready: examdb_test (Redis DB 1)."
