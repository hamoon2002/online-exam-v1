#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if ! docker info >/dev/null 2>&1; then
  echo 'Docker is not ready. Start/reopen the Codespace and retry.' >&2
  exit 1
fi
if ! docker compose -p online-exam-v1 up -d postgres redis minio; then
  echo 'Docker startup failed. If the error was RWLayer unexpectedly nil, run:' >&2
  echo 'docker compose -p online-exam-v1 up -d --force-recreate postgres redis minio' >&2
  exit 1
fi
ready=false
for ((i=0; i<30; i++)); do
  if docker compose -p online-exam-v1 exec -T redis redis-cli ping 2>/dev/null | grep -qx PONG &&
     docker compose -p online-exam-v1 exec -T postgres pg_isready -U examuser -d examdb >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done
if [[ "$ready" != true ]]; then
  echo 'Redis or PostgreSQL did not become ready. Inspect docker compose ps/logs.' >&2
  exit 1
fi
# A PONG inside the container is insufficient: verify the URL used by Node too.
node server/scripts/check-redis.cjs
exec npm run dev -w server
