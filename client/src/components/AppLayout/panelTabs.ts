export type PanelTab = { path: string; title: string };

const INITIAL_WORKSPACE_TAB: PanelTab = {
  path: '/workspace',
  title: 'میز کار',
};

export function restorePanelTabs(saved: string | null): PanelTab[] {
  if (saved === null) return [{ ...INITIAL_WORKSPACE_TAB }];
  try {
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter(
      (tab): tab is PanelTab =>
        typeof tab === 'object' &&
        tab !== null &&
        typeof tab.path === 'string' &&
        tab.path.startsWith('/') &&
        !tab.path.startsWith('//') &&
        typeof tab.title === 'string',
    );
    return Array.from(
      new Map(
        valid.map((tab) => [
          tab.path.split('?')[0],
          { ...tab, path: tab.path.split('?')[0] },
        ]),
      ).values(),
    ).slice(-20);
  } catch {
    return [];
  }
}

export function upsertPanelTab(
  tabs: PanelTab[],
  path: string,
  title: string,
): PanelTab[] {
  const next = tabs.some((tab) => tab.path === path)
    ? tabs.map((tab) => (tab.path === path ? { ...tab, title } : tab))
    : [...tabs, { path, title }];
  return next.slice(-20);
}
