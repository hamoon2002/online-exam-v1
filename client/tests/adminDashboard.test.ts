import test from 'node:test';
import assert from 'node:assert/strict';
import { getAdminDashboard } from '../src/api/adminDashboardApi';
import { parseInstructorTab } from '../src/pages/AdminInstructorsPage/instructorTabs';
import { navigationItems } from '../src/components/AppLayout/navigationItems';

test('?tab= opens the requested instructor tab and falls back to groups', () => {
  assert.equal(parseInstructorTab('exams'), 'exams');
  assert.equal(parseInstructorTab('results'), 'results');
  assert.equal(parseInstructorTab('nope'), 'groups');
  assert.equal(parseInstructorTab(null), 'groups');
});

test('admin dashboard API is a single GET to /admin/dashboard', async () => {
  const original = globalThis.fetch;
  const calls: { url: URL; method?: string }[] = [];
  globalThis.fetch = (async (input, init) => {
    calls.push({ url: new URL(String(input)), method: init?.method });
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
  try {
    await getAdminDashboard();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url.pathname, '/admin/dashboard');
    assert.ok(!calls[0].method || calls[0].method === 'GET');
  } finally {
    globalThis.fetch = original;
  }
});

test('sidebar admin labels no longer start with «همهٔ»', () => {
  assert.ok(navigationItems.every((i) => !(i.adminLabel ?? i.label).startsWith('همهٔ')));
});
