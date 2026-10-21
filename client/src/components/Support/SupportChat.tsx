import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../lib/apiClient';
export type Thread = {
  id: string;
  status: string;
  updatedAt: string;
  user?: { name: string | null; username: string | null };
};
type Message = {
  id: string;
  body: string;
  fromStaff: boolean;
  createdAt: string;
};
export const statusLabel: Record<string, string> = {
  waiting: 'منتظر پاسخ پشتیبان',
  replied: 'پشتیبان پاسخ داده',
  closed: 'گفت‌وگو بسته شده',
};
export default function SupportChat({
  threadId,
  staff = false,
}: {
  threadId?: string;
  staff?: boolean;
}) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pending = useRef<{ body: string; clientId: string } | null>(null);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const current = threadId
        ? { id: threadId, status: '', updatedAt: '' }
        : await apiRequest<Thread | null>('/support/mine', { signal });
      const items = current
        ? await apiRequest<Message[]>(`/support/${current.id}/messages`, {
            signal,
          })
        : [];
      if (!signal?.aborted) {
        setThread(current);
        setMessages(items);
        setLoading(false);
      }
    },
    [threadId],
  );
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        await load(controller.signal);
        setError('');
      } catch {
        if (!controller.signal.aborted) {
          setError('دریافت پیام‌ها ممکن نشد؛ اتصال را بررسی کنید.');
          setLoading(false);
        }
      }
      if (!controller.signal.aborted) timer = setTimeout(tick, 10000);
    };
    void tick();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [load]);
  async function send() {
    if (!draft.trim() || busy) return;
    const body = draft.trim();
    if (pending.current?.body !== body)
      pending.current = { body, clientId: crypto.randomUUID() };
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/support/${threadId || 'mine'}/messages`, {
        method: 'POST',
        body: pending.current,
      });
      pending.current = null;
      setDraft('');
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'ارسال ناموفق؛ دوباره تلاش کنید.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section dir="rtl" className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        {staff
          ? 'پاسخ شما در حساب کاربر نمایش داده می‌شود.'
          : 'پیام‌ها ذخیره می‌شوند؛ پاسخ فوری تضمین نمی‌شود. رمز، کد تأیید یا اطلاعات بانکی نفرستید.'}
      </p>
      {thread?.status && (
        <p className="text-sm font-bold">{statusLabel[thread.status]}</p>
      )}
      <div
        role="log"
        aria-label="پیام‌های پشتیبانی"
        className="max-h-[40dvh] min-h-24 space-y-3 overflow-y-auto rounded-xl bg-gray-50 p-3 dark:bg-gray-800"
      >
        {loading ? (
          <p>در حال دریافت پیام‌ها…</p>
        ) : (
          !messages.length && <p>هنوز پیامی ثبت نشده است.</p>
        )}
        {messages.length === 100 && <p>۱۰۰ پیام آخر نمایش داده می‌شود.</p>}
        {messages.map((m) => (
          <article
            key={m.id}
            className="rounded-lg border border-gray-300 bg-white p-3 dark:border-gray-600 dark:bg-gray-900"
          >
            <p className="text-xs font-bold">
              {m.fromStaff ? 'پشتیبان' : 'کاربر'} ·{' '}
              {new Date(m.createdAt).toLocaleString('fa-IR')}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
          </article>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="space-y-2"
      >
        <label htmlFor="support-message" className="block text-sm">
          پیام به {staff ? 'کاربر' : 'پشتیبان'}
        </label>
        <textarea
          id="support-message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
          maxLength={2000}
          rows={3}
          className="w-full rounded-xl border border-gray-400 bg-transparent p-3"
        />
        <button
          disabled={busy || !draft.trim()}
          className="rounded-xl bg-blue-700 px-4 py-2 text-white disabled:opacity-60"
        >
          {busy ? 'در حال ارسال…' : 'ارسال پیام'}
        </button>
      </form>
    </section>
  );
}
