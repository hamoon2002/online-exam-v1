import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import useTheme from '../../hooks/useTheme';
import useSidebarCollapse from '../../hooks/useSidebarCollapse';
import { useAuth } from '../../context/AuthContext';
import { useExamGuard } from '../../context/ExamGuardContext';
import Sidebar from './SideBar';
import Header from './Header';

type AppLayoutProps = {
  children: ReactNode;
  title: string;
};

type PanelTab = { path: string; title: string };
const TABS_KEY = 'exam-panel-internal-tabs';

function readTabs(): PanelTab[] {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(TABS_KEY) ?? '[]');
    if (!Array.isArray(saved)) return [];
    return saved.filter((tab): tab is PanelTab =>
      typeof tab === 'object' && tab !== null &&
      typeof tab.path === 'string' && tab.path.startsWith('/') &&
      typeof tab.title === 'string'
    ).slice(-20);
  } catch {
    return [];
  }
}

function AppLayout({ children, title }: AppLayoutProps) {
  const { isDark, toggleTheme } = useTheme();
  const { isCollapsed, toggleCollapse } = useSidebarCollapse();
  const { user } = useAuth();
  const { guardNavigation } = useExamGuard();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [tabs, setTabs] = useState<PanelTab[]>(readTabs);
  const showTabs = user?.role === 'Instructor' || user?.role === 'SuperAdmin';
  const currentPath = location.pathname + location.search;

  useEffect(() => {
    if (!showTabs) return;
    setTabs(previous => {
      const next = previous.some(tab => tab.path === currentPath)
        ? previous.map(tab => tab.path === currentPath ? { ...tab, title } : tab)
        : [...previous, { path: currentPath, title }];
      sessionStorage.setItem(TABS_KEY, JSON.stringify(next.slice(-20)));
      return next.slice(-20);
    });
  }, [currentPath, title, showTabs]);

  function closeTab(path: string) {
    const index = tabs.findIndex(tab => tab.path === path);
    if (index < 0) return;
    const remaining = tabs.filter(tab => tab.path !== path);
    sessionStorage.setItem(TABS_KEY, JSON.stringify(remaining));
    setTabs(remaining);
    if (path === currentPath) {
      const next = remaining[Math.min(index, remaining.length - 1)];
      guardNavigation(() => navigate(next?.path ?? '/dashboard'));
    }
  }

  return (
    <div className="glass-app-shell min-h-screen bg-surface-light text-gray-900 transition-colors dark:bg-surface-dark dark:text-white">
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />
        <main className={`min-w-0 flex-1 transition-all duration-300 motion-reduce:transition-none ${isCollapsed ? 'md:w-[calc(100%-5rem)]' : 'md:w-[calc(100%-16rem)]'}`}>
          <Header
            title={title}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            onOpenSidebar={() => setIsSidebarOpen(true)}
          />
          {showTabs && (
            <nav aria-label="تب‌های باز پنل" className="panel-internal-tabs">
              {tabs.map(tab => (
                <div key={tab.path} className={`panel-internal-tab ${tab.path === currentPath ? 'is-active' : ''}`}>
                  <button type="button" className="panel-internal-tab-label" onClick={() => guardNavigation(() => navigate(tab.path))} aria-current={tab.path === currentPath ? 'page' : undefined} title={tab.title}>
                    {tab.title}
                  </button>
                  <button type="button" className="panel-internal-tab-close" onClick={() => closeTab(tab.path)} aria-label={`بستن تب ${tab.title}`} title="بستن تب">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </nav>
          )}
          <div className="mx-auto w-full max-w-none px-3 py-5 sm:px-4 md:px-5 md:py-7 xl:px-6 xl:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
