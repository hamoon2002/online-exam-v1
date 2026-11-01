import { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout/AppLayout';
import { Headset, MessagesSquare, ChevronRight, ChevronLeft, LockKeyhole, MessageCircle } from 'lucide-react';
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
      <div dir="rtl" className="support-page mx-auto max-w-6xl space-y-6">
        <header className="support-hero flex flex-wrap items-center justify-between gap-5 rounded-3xl px-7 py-8 text-white sm:px-9">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-white/85"><Headset size={18}/> مرکز ارتباط با پشتیبانی</div>
            <h1 className="text-2xl font-extrabold">پشتیبانی</h1>
            <p className="mt-2 max-w-md text-sm leading-7 text-white/80">سؤال یا مشکلت رو مطرح کن و گفت‌وگوها رو همین‌جا پیگیری کن.</p>
          </div>
          <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/20 bg-white/10"><MessagesSquare size={30} strokeWidth={1.6}/></div>
        </header>
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        {staff ? (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
            <section className="support-surface space-y-4 rounded-3xl p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-bold"><MessagesSquare size={18} className="text-violet-600 dark:text-violet-300"/> صندوق پیام‌ها</h2>
                <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">{threads.length.toLocaleString('fa-IR')} گفت‌وگو</span>
              </div>
              {!threads.length && <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-10 text-center dark:border-violet-500/20 dark:bg-violet-500/5"><MessageCircle size={27} className="mx-auto mb-3 text-violet-400"/><p className="text-sm text-slate-500 dark:text-slate-400">گفت‌وگویی در این صفحه نیست.</p></div>}
              <div className="max-h-[60vh] space-y-2 overflow-y-auto">
              {threads.map((t) => (
                <button key={t.id} type="button" onClick={() => setSelected(t.id)} aria-pressed={selected === t.id}
                  className={`block w-full rounded-2xl border px-4 py-3.5 text-right transition-colors ${selected === t.id ? 'border-violet-400 bg-violet-500/10 dark:border-violet-400/60 dark:bg-violet-500/15' : 'border-slate-200/70 bg-white/60 hover:border-violet-300 hover:bg-violet-50/60 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-violet-500/10'}`}>
                  <span className="block truncate text-sm font-semibold text-slate-800 dark:text-white">{t.user?.name || t.user?.username || 'کاربر'}</span>
                  <span className="mt-1 block text-xs leading-6 text-slate-500 dark:text-slate-400">{statusLabel[t.status] || t.status} · {new Date(t.updatedAt).toLocaleString('fa-IR')}</span>
                </button>
              ))}
              </div>
              <nav aria-label="صفحه‌بندی گفت‌وگوها" className="flex items-center justify-between gap-2 border-t border-slate-200/60 pt-4 dark:border-slate-700/60">
                <button type="button" disabled={!page} onClick={() => setPage(p => p-1)} className="support-pagination-button"><ChevronRight size={16}/> قبلی</button>
                <span className="text-xs text-slate-500">صفحه {(page+1).toLocaleString('fa-IR')}</span>
                <button type="button" disabled={threads.length < 30} onClick={() => setPage(p => p+1)} className="support-pagination-button">بعدی <ChevronLeft size={16}/></button>
              </nav>
            </section>
            <section className="support-surface min-h-80 rounded-3xl p-5 sm:p-7">
              {selected ? (
                <>
                  <SupportChat key={selected} threadId={selected} staff />
                  <button type="button" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-rose-500/10" onClick={() => void close()}><LockKeyhole size={16}/> بستن گفت‌وگو</button>
                </>
              ) : (
                <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300"><MessageCircle size={29}/></div><h3 className="font-bold text-slate-700 dark:text-white">یک گفت‌وگو انتخاب کن</h3><p className="text-sm text-slate-500 dark:text-slate-400">پیام‌ها و جزئیات مکالمه اینجا نمایش داده می‌شن.</p></div>
              )}
            </section>
          </div>
        ) : (
          <section className="support-surface mx-auto max-w-3xl rounded-3xl p-5 sm:p-8"><SupportChat key={user?.id}/></section>
        )}
      </div>
    </AppLayout>
  );
}
