// Preloaded by `npm test` (node --require) BEFORE src/config/env.ts runs.
// Goal: integration tests must not touch the dev Postgres/Redis.
// dotenv never overrides variables that are already set, so values from
// server/.env.test win over server/.env, and CI (which sets real env vars)
// is left untouched. Only DATABASE_URL and REDIS_URL are expected in .env.test;
// everything else (JWT secrets, ...) still comes from server/.env.
const fs = require('node:fs');
const path = require('node:path');

if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';

const file = path.resolve(__dirname, '..', '.env.test');
if (fs.existsSync(file)) {
  require('dotenv').config({ path: file });
} else if (!process.env.REQUIRE_SERVICES) {
  console.warn(
    '[tests] server/.env.test not found: tests will use the dev DATABASE_URL/REDIS_URL from server/.env.\n' +
      '        Run `npm run test:setup -w server` once to create an isolated test database.',
  );
}
