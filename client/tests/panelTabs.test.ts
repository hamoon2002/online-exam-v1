import test from 'node:test';
import assert from 'node:assert/strict';
import { restorePanelTabs, upsertPanelTab } from '../src/components/AppLayout/panelTabs';

test('a fresh login opens the workspace tab by default', () => {
  assert.deepEqual(restorePanelTabs(null), [{ path: '/workspace', title: 'میز کار' }]);
});

test('closing every tab stays closed on refresh rather than reopening workspace', () => {
  assert.deepEqual(restorePanelTabs('[]'), []);
});

test('workspace is restored like any other closable tab', () => {
  const tabs = [
    { path: '/workspace', title: 'میز کار' },
    { path: '/exams', title: 'آزمون‌ها' },
  ];
  assert.deepEqual(restorePanelTabs(JSON.stringify(tabs)), tabs);
});

test('opening workspace from navigation creates the tab once', () => {
  const opened = upsertPanelTab([], '/workspace', 'میز کار');
  assert.deepEqual(opened, [{ path: '/workspace', title: 'میز کار' }]);
  assert.deepEqual(upsertPanelTab(opened, '/workspace', 'میز کار'), opened);
});

test('normal navigation preserves workspace and keeps independent page tabs', () => {
  const workspace = restorePanelTabs(null);
  const next = upsertPanelTab(workspace, '/exams', 'آزمون‌ها');
  assert.deepEqual(next.map(tab => tab.path), ['/workspace', '/exams']);
});

test('invalid stored tabs cannot inject unauthorized relative paths', () => {
  assert.deepEqual(restorePanelTabs('[{"path":"javascript:alert(1)","title":"Bad"}]'), []);
});
