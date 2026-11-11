import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PracticeBackLink() {
  return (
    <Link
      to="/practice"
      className="inline-flex min-h-11 w-fit items-center gap-2.5 rounded-xl border border-violet-200/70 bg-white/65 py-1.5 ps-1.5 pe-3.5 text-sm font-semibold text-brand-ink transition-colors hover:border-violet-300 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-violet-400/25 dark:bg-violet-500/10 dark:hover:bg-violet-500/20"
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-violet-100/80 dark:bg-violet-400/15">
        <ArrowRight size={16} aria-hidden="true" />
      </span>
      بازگشت به تمرین‌ها
    </Link>
  );
}
