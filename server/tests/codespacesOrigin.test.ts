import test from 'node:test';
import assert from 'node:assert/strict';
import { isCodespacesClientOrigin } from '../src/lib/codespacesOrigin';

const codespaceName = 'quiet-river-example';

test('accepts only the active Codespace HTTPS frontend origin on port 5173', () => {
  assert.equal(
    isCodespacesClientOrigin(
      'https://quiet-river-example-5173.app.github.dev',
      codespaceName,
      'app.github.dev',
    ),
    true,
  );
  assert.equal(
    isCodespacesClientOrigin(
      'http://quiet-river-example-5173.app.github.dev',
      codespaceName,
      'app.github.dev',
    ),
    false,
  );
  assert.equal(
    isCodespacesClientOrigin(
      'https://quiet-river-example-4000.app.github.dev',
      codespaceName,
      'app.github.dev',
    ),
    false,
  );
  assert.equal(
    isCodespacesClientOrigin(
      'https://other-space-5173.app.github.dev',
      codespaceName,
      'app.github.dev',
    ),
    false,
  );
  assert.equal(
    isCodespacesClientOrigin(
      'https://quiet-river-example-5173.app.github.dev.evil.test',
      codespaceName,
      'app.github.dev',
    ),
    false,
  );
  assert.equal(
    isCodespacesClientOrigin(
      'https://quiet-river-example-5173.app.github.dev',
      codespaceName,
      'example.test',
    ),
    false,
  );
  assert.equal(
    isCodespacesClientOrigin(
      'https://quiet-river-example-5173.app.github.dev',
      undefined,
      'app.github.dev',
    ),
    false,
  );
});
