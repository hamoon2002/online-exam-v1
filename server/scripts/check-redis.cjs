const path = require('node:path');
const { createClient } = require('redis');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function main() {
  const raw = process.env.REDIS_URL;
  if (!raw) throw new Error('REDIS_URL is missing in server/.env or the shell environment.');
  let url;
  try { url = new URL(raw); } catch { throw new Error('REDIS_URL is not a valid URL.'); }
  if (!['redis:', 'rediss:'].includes(url.protocol)) throw new Error('REDIS_URL must start with redis:// or rediss:// (not an HTTPS forwarded port).');
  const target = `${url.protocol}//${url.hostname}:${url.port || '6379'}`;
  console.log(`Checking Redis from Node at ${target} (credentials hidden)`);
  const client = createClient({ url: raw, disableOfflineQueue: true, socket: { connectTimeout: 5_000, reconnectStrategy: false } });
  client.on('error', () => {});
  let timer;
  try {
    await Promise.race([
      (async () => { await client.connect(); if (await client.ping() !== 'PONG') throw new Error(); })(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error()), 7_000); }),
    ]);
    console.log('Redis: PONG — ready');
  } catch {
    throw new Error(`Cannot connect/authenticate to Redis at ${target}. For Node running in Codespaces with this Docker Compose, check REDIS_URL=redis://127.0.0.1:6379 and the published port. Do not change a remote Redis URL to localhost unless you intend to use local Redis.`);
  } finally {
    clearTimeout(timer);
    if (client.isOpen) client.destroy();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
