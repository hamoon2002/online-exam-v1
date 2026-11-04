import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizedDevProxyOrigin } from '../src/lib/proxyOrigin';

test('normalizes matching Codespaces HTTPS Origin for local API session checks', () => {
  assert.equal(
    normalizedDevProxyOrigin(
      'https://quiet-river-5173.app.github.dev',
      'quiet-river-5173.app.github.dev',
    ),
    'http://localhost:5173',
  );
  assert.equal(
    normalizedDevProxyOrigin('http://localhost:5173', 'localhost:5173'),
    'http://localhost:5173',
  );
});

test('does not normalize third-party or opaque Origins', () => {
  const host = 'quiet-river-5173.app.github.dev';
  for (const origin of [
    undefined,
    'null',
    'https://evil.example.com',
    'https://quiet-river-5173.app.github.dev.evil.test',
    'https://quiet-river-4000.app.github.dev',
    'https://quiet-river-5173.app.github.dev/path',
  ]) {
    assert.equal(normalizedDevProxyOrigin(origin, host), undefined);
  }
  assert.equal(
    normalizedDevProxyOrigin('https://quiet-river-5173.app.github.dev', undefined),
    undefined,
  );
});
