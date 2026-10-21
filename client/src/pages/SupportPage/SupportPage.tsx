import { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout/AppLayout';
import SupportChat, {
  statusLabel,
  type Thread,
} from '../../components/Support/SupportChat';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/apiClient';
export default function SupportPage() {
  const { user } = useAuth();
  const staff = user?.role === 'SuperAdmin';
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<string>();
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!staff) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const data = await apiRequest<Thread[]>(
          `/support/threads?page=${page}`,
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) {
          setThreads(data);
          setError('');
        }
      } catch {
        if (!controller.signal.aborted) setError('دریافت فهرست ناموفق بود.');
      }
      if (!controller.signal.aborted) timer = setTimeout(tick, 10000);
    };
    void tick();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [staff, page, revision]);
  async function close() {
    try {
      await apiRequest(`/support/${selected}`, {
        method: 'PATCH',
        body: { status: 'closed' },
      });
      setRevision((x) => x + 1);
    } catch {
      setError('بستن گفت‌وگو ناموفق بود.');
    }
  }
  return (
    <AppLayout title="پشتیبانی">
      <div
        dir="rtl"
        className="mx-auto max-w-5xl space-y-5 p-4 text-gray-900 dark:text-gray-100"
      >
        <h1 className="text-2xl font-bold">پشتیبانی</h1>
        {error && <p role="alert">{error}</p>}
        {staff ? (
          <div className="grid gap-5 md:grid-cols-2">
            <section className="space-y-2">
              <h2 className="font-bold">صندوق پیام‌ها</h2>
              {!threads.length && <p>گفت‌وگویی در این صفحه نیست.</p>}
              {threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t.id)}
                  aria-pressed={selected === t.id}
                  className={`block w-full rounded-xl border p-3 text-right ${selected === t.id ? 'border-blue-600 bg-blue-50 dark:bg-gray-800' : 'border-gray-400'}`}
                >
                  <span className="block">
                    {t.user?.name || t.user?.username || 'کاربر'}
                  </span>
                  <span className="text-sm">
                    {statusLabel[t.status]} ·{' '}
                    {new Date(t.updatedAt).toLocaleString('fa-IR')}
                  </span>
                </button>
              ))}
              <div className="flex gap-4">
                <button disabled={!page} onClick={() => setPage((p) => p - 1)}>
                  قبلی
                </button>
                <button
                  disabled={threads.length < 30}
                  onClick={() => setPage((p) => p + 1)}
                >
                  بعدی
                </button>
              </div>
            </section>
            <section>
              {selected ? (
                <>
                  <SupportChat key={selected} threadId={selected} staff />
                  <button
                    className="mt-4 rounded-xl border border-gray-400 px-4 py-2"
                    onClick={() => void close()}
                  >
                    بستن گفت‌وگو
                  </button>
                </>
              ) : (
                <p>یک گفت‌وگو را انتخاب کنید.</p>
              )}
            </section>
          </div>
        ) : (
          <SupportChat key={user?.id} />
        )}
      </div>
    </AppLayout>
  );
}
