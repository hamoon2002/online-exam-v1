import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { sessionOrigin } from '../src/middleware/sessionOrigin';

test('cookie session endpoints reject foreign, missing and opaque origins before mutation', async () => {
  const app = express();
  let mutations = 0;
  for (const path of ['/auth/refresh', '/auth/logout']) {
    app.post(path, sessionOrigin('https://exam.example.com'), (_req, res) => {
      mutations++;
      res.cookie('refreshToken', 'replacement').json({ ok: true });
    });
  }
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as { port: number };
  try {
    for (const path of ['/auth/refresh', '/auth/logout']) {
      for (const origin of [
        undefined,
        'null',
        'https://evil.example.com',
        'https://exam.example.com.evil.test',
        'http://exam.example.com',
        'https://exam.example.com/path',
      ]) {
        const response = await fetch(`http://127.0.0.1:${port}${path}`, {
          method: 'POST',
          headers: {
            Cookie: 'refreshToken=existing',
            ...(origin ? { Origin: origin } : {}),
          },
        });
        assert.equal(response.status, 403);
        assert.equal(response.headers.get('set-cookie'), null);
      }
      assert.equal(mutations, path.endsWith('refresh') ? 0 : 1);
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method: 'POST',
        headers: { Origin: 'https://exam.example.com' },
      });
      assert.equal(response.status, 200);
    }
    assert.equal(mutations, 2);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
