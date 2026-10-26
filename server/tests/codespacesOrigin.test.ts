import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isCodespacesClientOrigin,
  isCodespacesFrontendRequest,
} from '../src/lib/codespacesOrigin';

test('accepts only HTTPS Codespaces frontend origins on port 5173', () => {
  assert.equal(
    isCodespacesClientOrigin('https://quiet-river-5173.app.github.dev'),
    true,
  );
  assert.equal(
    isCodespacesClientOrigin('http://quiet-river-5173.app.github.dev'),
    false,
  );
  assert.equal(
    isCodespacesClientOrigin('https://quiet-river-4000.app.github.dev'),
    false,
  );
  assert.equal(
    isCodespacesClientOrigin('https://quiet-river-5173.app.github.dev.evil.test'),
    false,
  );
  assert.equal(isCodespacesClientOrigin('null'), false);
});

test(
  'only accepts the frontend origin paired with the same Codespace API host',
  () => {
  assert.equal(
    isCodespacesFrontendRequest(
      'https://quiet-river-5173.app.github.dev',
      'quiet-river-4000.app.github.dev',
    ),
    true,
  );
  assert.equal(
    isCodespacesFrontendRequest(
      'https://quiet-river-5173.app.github.dev',
      'other-space-4000.app.github.dev',
    ),
    false,
  );
  assert.equal(
    isCodespacesFrontendRequest(
      'https://quiet-river-5173.app.github.dev',
      'quiet-river-5173.app.github.dev',
    ),
    false,
  );
  },
);
