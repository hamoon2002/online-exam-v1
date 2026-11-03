import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, TimerOff, CheckCircle2, X, type LucideIcon } from 'lucide-react';

interface ToastProps {
  message: string;
  tone?: 'warning' | 'danger' | 'success';
  duration?: number;
  icon?: LucideIcon;
  onDismiss: () => void;
}

function ToastNotification({ message, tone = 'warning', duration = tone === 'danger' ? 4500 : 4000, icon, onDismiss }: ToastProps) {
  const [closing, setClosing] = useState(false);
  const dismissed = useRef(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const lifetime = Number.isFinite(duration) ? Math.max(0, duration) : 4000;
  const toneStyles = tone === 'danger' ? 'toast-danger' : tone === 'success' ? 'toast-success' : 'toast-warning';
  const Icon = icon ?? (tone === 'danger' ? TimerOff : tone === 'success' ? CheckCircle2 : AlertTriangle);

  useEffect(() => {
    if (lifetime === 0) return;
    const timer = window.setTimeout(() => setClosing(true), lifetime);
    return () => window.clearTimeout(timer);
  }, [lifetime]);

  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => {
      if (!dismissed.current) {
        dismissed.current = true;
        onDismissRef.current();
      }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [closing]);

  return (
    <div
      className={`site-toast site-toast-css fixed bottom-6 left-4 right-4 z-50 overflow-hidden rounded-2xl text-sm font-semibold shadow-xl sm:left-6 sm:right-auto sm:w-[min(420px,calc(100%-3rem))] ${toneStyles} ${closing ? 'is-closing' : ''}`}
      dir="rtl"
    >
      <div className="flex items-start gap-2.5 px-4 py-3">
        <Icon size={18} className="mt-1 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1 break-words leading-6" role={tone === 'danger' ? 'alert' : 'status'}>{message}</p>
        <button
          type="button"
          aria-label="بستن اعلان"
          onClick={() => setClosing(true)}
          disabled={closing}
          className="-mt-1 -me-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {lifetime > 0 && (
        <div className="site-toast-track" aria-hidden="true">
          <div className="site-toast-progress site-toast-progress-css h-full origin-right" style={{ animationDuration: `${lifetime}ms` }}/>
        </div>
      )}
    </div>
  );
}

export default function Toast(props: ToastProps) {
  return <ToastNotification key={`${props.tone}:${props.duration}:${props.message}`} {...props} />;
}

/** Emit only after the server confirms a successful save. */
export function notifySaveSuccess(message = 'تغییرات با موفقیت ذخیره شد') {
  window.dispatchEvent(new CustomEvent<string>('app:save-success', { detail: message }));
}

/** Emit a save error for the global bottom-left notification. */
export function notifySaveError(message: string) {
  window.dispatchEvent(new CustomEvent<string>('app:save-error', { detail: message }));
}
