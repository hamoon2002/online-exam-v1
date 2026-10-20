import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createMetrics } from '../src/lib/monitoring';

test('metrics require a bearer secret and never label raw paths or identifiers', async () => {
  const app = express();
  const metrics = createMetrics('test-metrics-token-that-is-long-enough');
  app.use(metrics.observe);
  app.get('/metrics', metrics.serve);
  app.get('/users/:id', (_req, res) => res.sendStatus(200));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    await fetch(base + '/users/private-user-id');
    assert.equal((await fetch(base + '/metrics')).status, 403);
    const response = await fetch(base + '/metrics', {
      headers: {
        Authorization: 'Bearer test-metrics-token-that-is-long-enough',
      },
    });
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.match(body, /exam_http_requests_total/);
    assert.match(body, /exam_http_request_duration_seconds/);
    assert.ok(!body.includes('private-user-id'));
    assert.ok(!body.includes('test-metrics-token'));
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('Sentry retains stack locations while dropping sensitive event fields', async () => {
  const Sentry = await import('@sentry/node');
  const { configureErrorReporting } = await import('../src/lib/monitoring');
  configureErrorReporting('https://test@example.invalid/1', 'test');
  const options = Sentry.getClient()!.getOptions();
  assert.equal(options.sendDefaultPii, false);
  const clean = await options.beforeSend!(
    {
      message: 'secret',
      request: { data: { password: 'secret' } },
      user: { email: 'private@example.test' },
      extra: { token: 'secret' },
      contexts: { custom: { code: '123456' } },
      breadcrumbs: [{ message: 'secret' }],
      exception: {
        values: [
          {
            type: 'Error',
            value: 'SQL contains private data',
            stacktrace: {
              frames: [{ filename: 'server.ts', function: 'handler' }],
            },
          },
        ],
      },
    },
    {},
  );
  assert.ok(clean);
  for (const field of [
    'message',
    'request',
    'user',
    'extra',
    'contexts',
    'breadcrumbs',
  ])
    assert.equal((clean as Record<string, unknown>)[field], undefined);
  assert.equal(
    clean.exception?.values?.[0]?.stacktrace?.frames?.[0]?.function,
    'handler',
  );
  assert.ok(!JSON.stringify(clean).includes('SQL contains'));
  assert.ok(!JSON.stringify(clean).includes('123456'));
  await Sentry.close();
});
