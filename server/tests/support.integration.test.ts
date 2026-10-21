import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import type { Server } from 'node:http';
import { prisma } from '../src/lib/prisma';
import { redis } from '../src/lib/redis';
import { rateLimitRedis } from '../src/lib/rateLimitRedis';
import { waitForRedis } from '../src/lib/redisConnection';
import { issueTokenPair } from '../src/lib/authTokens';
import { revokeSession } from '../src/lib/session';
import support from '../src/routes/support';
import { errorHandler } from '../src/middleware/errorHandler';
import { unavailable } from './helpers/serviceGuard';
let ready = false;
let server: Server;
let base: string;
const ids: string[] = [];
before(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await waitForRedis(redis);
    await waitForRedis(rateLimitRedis);
    ready = true;
  } catch {
    return;
  }
  const app = express();
  app.use(express.json());
  app.use('/support', support);
  app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}/support`;
});
after(async () => {
  if (server)
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections();
    });
  if (ready) {
    for (const id of ids) await revokeSession(id);
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.$disconnect();
  if (redis.isOpen) redis.destroy();
  if (rateLimitRedis.isOpen) rateLimitRedis.destroy();
});
async function user(role: 'Student' | 'Instructor' | 'SuperAdmin') {
  const value = await prisma.user.create({
    data: {
      email: `support-${randomUUID()}@example.test`,
      role,
      approvalStatus: 'Approved',
    },
  });
  ids.push(value.id);
  return (await issueTokenPair(value.id, role)).accessToken;
}
async function request(
  path: string,
  token?: string,
  body?: unknown,
  method = 'POST',
) {
  return fetch(base + path, {
    method: body ? method : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
test('support isolates accounts, rejects staff impersonation, persists replies and deduplicates retries', async (t) => {
  if (!ready) return unavailable(t, 'PostgreSQL/Redis unavailable');
  const owner = await user('Student'),
    stranger = await user('Instructor'),
    admin = await user('SuperAdmin');
  assert.equal((await request('/mine')).status, 401);
  assert.equal((await request('/threads', stranger)).status, 403);
  const payload = { body: 'پیام خصوصی', clientId: randomUUID() };
  const created = await request('/mine/messages', owner, payload);
  assert.equal(created.status, 201);
  const { id } = (await created.json()) as { id: string };
  assert.equal((await request(`/${id}/messages`, stranger)).status, 404);
  assert.equal(
    (
      await request(`/${id}/messages`, stranger, {
        ...payload,
        clientId: randomUUID(),
      })
    ).status,
    404,
  );
  assert.equal(
    (await request(`/${id}`, owner, { status: 'closed' }, 'PATCH')).status,
    403,
  );
  assert.equal(
    (await request('/mine/messages', owner, { ...payload, fromStaff: true }))
      .status,
    400,
  );
  await Promise.all([
    request('/mine/messages', owner, payload),
    request('/mine/messages', owner, payload),
  ]);
  assert.equal(
    await prisma.supportMessage.count({ where: { threadId: id } }),
    1,
  );
  assert.equal(
    (
      await request(`/${id}/messages`, admin, {
        body: 'پاسخ پشتیبان',
        clientId: randomUUID(),
      })
    ).status,
    201,
  );
  const messages = (await (await request(`/${id}/messages`, owner)).json()) as {
    body: string;
    fromStaff: boolean;
  }[];
  assert.equal(messages.length, 2);
  assert.equal(messages[1].fromStaff, true);
  await request(`/${id}`, admin, { status: 'closed' }, 'PATCH');
  await request('/mine/messages', owner, {
    body: 'پیگیری',
    clientId: randomUUID(),
  });
  assert.equal(
    (await prisma.supportThread.findUniqueOrThrow({ where: { id } })).status,
    'waiting',
  );
});
test('remote assistant requires explicit consent before any provider call', async (t) => {
  if (!ready) return unavailable(t, 'PostgreSQL/Redis unavailable');
  process.env.ASSISTANT_PROVIDER = 'anthropic';
  try {
    assert.equal(
      (await request('/assistant', undefined, { message: 'سلام' })).status,
      400,
    );
  } finally {
    process.env.ASSISTANT_PROVIDER = 'local';
  }
});
