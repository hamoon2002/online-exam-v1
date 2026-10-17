#!/usr/bin/env bash
# One-time (idempotent) setup of the isolated test database.
# Usage (from repo root or server/):  npm run test:setup -w server
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env.test ] || cp .env.test.example .env.test

COMPOSE=(docker compose -p online-exam-v1 -f ../docker-compose.yml)
"${COMPOSE[@]}" up -d postgres redis

# wait for Postgres
for _ in $(seq 1 30); do
  "${COMPOSE[@]}" exec -T postgres pg_isready -U examuser -d postgres >/dev/null 2>&1 && break
  sleep 1
done

"${COMPOSE[@]}" exec -T postgres sh -c \
  "psql -U examuser -d postgres -tAc \"SELECT 1 FROM pg_database WHERE datname='examdb_test'\" | grep -q 1 \
   || createdb -U examuser examdb_test"

set -a
# shellcheck disable=SC1091
. ./.env.test
set +a
npx prisma migrate deploy
echo "Test database ready: examdb_test (Redis DB 1)."
