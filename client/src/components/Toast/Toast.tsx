import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  TimerOff,
  CheckCircle2,
  X,
  type LucideIcon,
} from 'lucide-react';

interface ToastProps {
  message: string;
  tone?: 'warning' | 'danger' | 'success';
  duration?: number;
  icon?: LucideIcon;
  onDismiss: () => void;
}

function ToastNotification({
  message,
  tone = 'warning',
  duration = 4500,
  icon,
  onDismiss,
}: ToastProps) {
  const [closing, setClosing] = useState(false);
  const dismissed = useRef(false);
  const reduceMotion = useReducedMotion();
  const lifetime = Number.isFinite(duration) ? Math.max(0, duration) : 4500;
  const toneStyles =
    tone === 'danger'
      ? 'bg-danger-600 shadow-danger-600/30'
      : tone === 'success'
      ? 'bg-success-600 shadow-success-600/30'
      : 'bg-accent-500 shadow-accent-500/30';
  const Icon = icon ?? (tone === 'danger' ? TimerOff : tone === 'success' ? CheckCircle2 : AlertTriangle);

  return (
    <motion.div
      initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
      animate={{ opacity: closing ? 0 : 1, y: closing && !reduceMotion ? 12 : 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
      onAnimationComplete={() => {
        if (closing && !dismissed.current) {
          dismissed.current = true;
          onDismiss();
        }
      }}
      className={`fixed bottom-6 left-4 right-4 z-50 overflow-hidden rounded-2xl text-sm font-semibold text-white shadow-xl sm:left-6 sm:right-auto sm:max-w-md ${toneStyles}`}
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
      <div className="h-1 bg-white/20" aria-hidden="true">
        <motion.div
          className="h-full origin-right bg-white/90"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: lifetime / 1000, ease: 'linear' }}
          onAnimationComplete={() => setClosing(true)}
        />
      </div>
    </motion.div>
  );
}

export default function Toast(props: ToastProps) {
  // A new message receives its full lifetime; unrelated parent renders do not restart it.
  return <ToastNotification key={`${props.tone}:${props.duration}:${props.message}`} {...props} />;
}
