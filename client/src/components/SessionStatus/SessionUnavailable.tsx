import { RefreshCw, WifiOff } from 'lucide-react';

type SessionUnavailableProps = { onRetry: () => void };

// Only rendered when automatic session recovery has exhausted its first
// attempts. Never imply the user was logged out after a transient outage.
function SessionUnavailable({ onRetry }: SessionUnavailableProps) {
  return (
    <main dir="rtl" role="status" className="flex min-h-dvh items-center justify-center bg-slate-50/70 px-5 py-10 text-center dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-3xl border border-violet-200/50 bg-white/95 px-6 py-8 shadow-sm dark:border-violet-400/20 dark:bg-slate-900">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-200">
          <WifiOff size={23} />
        </div>
        <h1 className="text-base font-bold text-slate-800 dark:text-white">در حال اتصال مجدد…</h1>
        <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
          ارتباط با سرور لحظه‌ای قطع شده است. برنامه خودکار برای بازیابی نشست تلاش می‌کند و نیازی به ورود دوباره نیست.
        </p>
        <button type="button" onClick={onRetry} className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-violet-200 px-5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 dark:border-violet-400/25 dark:text-violet-200 dark:hover:bg-violet-500/10">
          <RefreshCw size={16} /> تلاش مجدد
        </button>
      </div>
    </main>
  );
}

export default SessionUnavailable;
