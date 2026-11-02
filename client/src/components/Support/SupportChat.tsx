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
const formatMessageDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
};
const formatMessageTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(date);
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
        {messages.map((m, index) => {
          const mine = staff ? m.fromStaff : !m.fromStaff;
          const day = formatMessageDate(m.createdAt);
          const showDate = index === 0 || day !== formatMessageDate(messages[index - 1].createdAt);
          const previous = messages[index - 1];
          const showSender = showDate || !previous || previous.fromStaff !== m.fromStaff;
          return (
            <div key={m.id}>
              {showDate && <div className="support-chat-day" role="separator"><span>{day}</span></div>}
              <article className={`support-message-bubble ${mine ? 'support-message-own' : 'support-message-other'} ${m.fromStaff ? 'support-message-staff' : 'support-message-user'}`}>
                {showSender && <div className="support-message-sender">{m.fromStaff ? 'پشتیبان' : 'کاربر'}</div>}
                <p className="support-message-text whitespace-pre-wrap break-words text-sm">{m.body}</p>
                <time dateTime={m.createdAt} className="support-message-time" title={new Date(m.createdAt).toLocaleString('fa-IR')}>{formatMessageTime(m.createdAt)}</time>
              </article>
            </div>
          );
        })}
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
          className="ui-purple-gradient rounded-xl px-4 py-2 font-semibold text-white transition-[filter,box-shadow] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? 'در حال ارسال…' : 'ارسال پیام'}
        </button>
      </form>
    </section>
  );
}
