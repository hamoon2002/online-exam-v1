import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterFromSelection,
  getAdminStudents,
  UNGROUPED_SELECTION,
} from '../src/api/adminStudentApi';
import { navigationItems } from '../src/components/AppLayout/navigationItems';
import { routes } from '../src/routes/routeConfig';

test('admin students request sends exactly one server-side filter', async () => {
  const original = globalThis.fetch;
  const urls: URL[] = [];
  globalThis.fetch = (async (input) => {
    urls.push(new URL(String(input), 'http://localhost'));
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
  try {
    await getAdminStudents({ page: 2, q: 'Ali' }, { instructorId: 'I 1' });
    await getAdminStudents({ page: 1 }, { ungrouped: true });
    await getAdminStudents({ page: 1 }, { instructorId: 'I1', ungrouped: true });
    await getAdminStudents({ page: 1 });
    assert.equal(urls[0].pathname, '/admin/users/students');
    assert.equal(urls[0].searchParams.get('instructorId'), 'I 1');
    assert.equal(urls[0].searchParams.get('page'), '2');
    assert.equal(urls[0].searchParams.get('q'), 'Ali');
    assert.equal(urls[0].searchParams.has('ungrouped'), false);
    assert.equal(urls[1].searchParams.get('ungrouped'), 'true');
    assert.equal(urls[1].searchParams.has('instructorId'), false);
    assert.equal(urls[2].searchParams.has('instructorId'), false);
    assert.equal(urls[3].searchParams.has('ungrouped'), false);
    assert.equal(urls[3].searchParams.has('instructorId'), false);
  } finally {
    globalThis.fetch = original;
  }
});

test('select values map to API filters', () => {
  assert.deepEqual(filterFromSelection(''), {});
  assert.deepEqual(filterFromSelection(UNGROUPED_SELECTION), { ungrouped: true });
  assert.deepEqual(filterFromSelection('abc'), { instructorId: 'abc' });
});

test('SuperAdmin students view has its own menu entry and stays SuperAdmin-only', () => {
  const entries = navigationItems.filter((i) => i.to === '/instructor-students');
  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0].roles, ['SuperAdmin']);
  const route = routes.find((r) => r.path === '/instructor-students');
  assert.equal(route?.protected, true);
  assert.deepEqual(route?.allowedRoles, ['SuperAdmin']);
  assert.deepEqual(navigationItems.find((i) => i.to === '/students')?.roles, ['Instructor']);
});
