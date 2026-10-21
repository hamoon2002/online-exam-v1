import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../Modal/Modal';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/apiClient';
import SupportChat from './SupportChat';
function Assistant() {
  const [remote, setRemote] = useState<boolean | null>(null);
  const [consent, setConsent] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<{ text: string; bot: boolean }[]>(
    [],
  );
  useEffect(() => {
    let active = true;
    apiRequest<{ remote: boolean }>('/support/assistant')
      .then((x) => {
        if (active) setRemote(x.remote);
      })
      .catch(() => {
        if (active) setError('راهنما فعلاً در دسترس نیست.');
      });
    return () => {
      active = false;
    };
  }, []);
  async function ask(text: string) {
    if (busy || remote === null || (remote && !consent) || !text.trim()) return;
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest<{ answer: string; mode: string }>(
        '/support/assistant',
        { method: 'POST', body: { message: text.trim(), consent } },
      );
      setMessages((old) => [
        ...old.slice(-18),
        { text, bot: false },
        { text: result.answer, bot: true },
      ]);
      setInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'پاسخ دریافت نشد.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        {remote
          ? 'دستیار هوش مصنوعی؛ پاسخ ممکن است اشتباه باشد. فقط متن سؤال شما و راهنمای عمومی سایت ارسال می‌شود.'
          : 'راهنمای رایگان موقت؛ پاسخ‌ها از راهنمای داخلی سایت هستند و مدل زبانی فعال نیست.'}{' '}
        رمز یا اطلاعات خصوصی نفرستید.
      </p>
      {remote && (
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          با ارسال متن سؤال به سرویس هوش مصنوعی موافقم.
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {['ثبت‌نام', 'کد تأیید', 'پرداخت', 'آزمون'].map((text) => (
          <button
            key={text}
            disabled={busy || remote === null || (remote && !consent)}
            onClick={() => void ask(text)}
            className="rounded-full border border-gray-400 px-3 py-1 text-sm"
          >
            {text}
          </button>
        ))}
      </div>
      <div
        role="log"
        aria-label="گفت‌وگو با راهنما"
        className="max-h-[35dvh] space-y-3 overflow-y-auto"
      >
        {messages.map((m, i) => (
          <div key={i} className="rounded-xl bg-gray-100 p-3 dark:bg-gray-800">
            <p className="text-xs font-bold">{m.bot ? 'راهنما' : 'شما'}</p>
            <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p>
          </div>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
        className="space-y-2"
      >
        <label htmlFor="assistant-question" className="block text-sm">
          سؤال شما
        </label>
        <textarea
          id="assistant-question"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={2000}
          disabled={busy}
          className="w-full rounded-xl border border-gray-400 bg-transparent p-3"
        />
        <button
          disabled={
            busy || !input.trim() || remote === null || (remote && !consent)
          }
          className="rounded-xl bg-blue-700 px-4 py-2 text-white disabled:opacity-60"
        >
          {busy ? 'در حال پاسخ…' : 'پرسیدن سؤال'}
        </button>
      </form>
    </section>
  );
}
export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'assistant' | 'support'>('assistant');
  const { user, isSessionReady } = useAuth();
  return (
    <div dir="rtl">
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-4 z-40 rounded-full bg-blue-700 px-5 py-3 font-bold text-white shadow-lg"
        aria-haspopup="dialog"
      >
        راهنما و پشتیبانی
      </button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        label="راهنما و پشتیبانی"
      >
        <h2 className="mb-4 text-xl font-bold">چطور کمکتان کنیم؟</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {(['assistant', 'support'] as const).map((t) => (
            <button
              key={t}
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-xl border px-3 py-2 text-sm ${tab === t ? 'bg-blue-700 text-white' : 'border-gray-400'}`}
            >
              {t === 'assistant' ? 'دستیار راهنما' : 'گفت‌وگو با پشتیبان'}
            </button>
          ))}
        </div>
        {tab === 'assistant' ? (
          <Assistant />
        ) : user && isSessionReady ? (
          <SupportChat key={user.id} />
        ) : (
          <p>
            برای ثبت و پیگیری امن پیام‌ها،{' '}
            <Link
              className="text-blue-700 underline dark:text-blue-300"
              to="/login"
            >
              وارد حساب شوید
            </Link>
            . پس از ورود از بخش پشتیبانی پیام بدهید.
          </p>
        )}
      </Modal>
    </div>
  );
}
