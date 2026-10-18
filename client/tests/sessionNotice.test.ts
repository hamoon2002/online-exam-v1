import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionLogoutUrl, sessionNotice } from '../src/lib/sessionNotice';
test('only a confirmed replacement reports a new login; expiration and unknown reasons remain neutral', () => {
  assert.equal(sessionLogoutUrl('new-session-started'), '/login?sessionReplaced=1');
  for (const reason of ['session-ended', 'account-rejected', undefined, null]) {
    assert.equal(sessionLogoutUrl(reason), '/login?sessionExpired=1');
  }
  assert.match(sessionNotice(new URLSearchParams('sessionReplaced=1')), /ورود جدیدی/);
  for (const query of ['sessionExpired=1', 'forceLogout=1']) {
    const message = sessionNotice(new URLSearchParams(query));
    assert.match(message, /نشست شما پایان یافته/);
    assert.doesNotMatch(message, /دستگاه|ورود جدید/);
  }
  assert.equal(sessionNotice(new URLSearchParams()), '');
});
