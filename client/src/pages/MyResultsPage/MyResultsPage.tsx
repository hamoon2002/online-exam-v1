import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  TrendingUp,
  ListChecks,
  TimerOff,
  Eye,
  Inbox,
  XCircle,
} from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import EmptyState from '../../components/EmptyState/EmptyState';
import Spinner from '../../components/Spinner/Spinner';
import Toast from '../../components/Toast/Toast';
import { getCurrentUser } from '../../api/authApi';
import {
  getMyResultsHistory,
  type FinishedAttemptWithExam,
} from '../../api/examAttemptApi';

function scoreTone(percent: number): {
  text: string;
  bg: string;
} {
  if (percent >= 70) {
    return {
      text: 'text-success-600 dark:text-success-500',
      bg: 'bg-success-500/10 dark:bg-success-500/15',
    };
  }
  if (percent >= 40) {
    return {
      text: 'text-accent-600 dark:text-accent-400',
      bg: 'bg-accent-500/10 dark:bg-accent-500/15',
    };
  }
  return {
    text: 'text-danger-600 dark:text-danger-400',
    bg: 'bg-danger-500/10 dark:bg-danger-500/15',
  };
}

function MyResultsPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [records, setRecords] = useState<FinishedAttemptWithExam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const userId = currentUser?.id;

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const data = await getMyResultsHistory();
        if (cancelled) return;
        setRecords(data);
      } catch {
        if (!cancelled) setError('دریافت نتایج با خطا مواجه شد');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const sortedAttempts = [...records].sort(
    (a, b) =>
      new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
  );

  const averagePercent =
    records.length > 0
      ? Math.round(
          (records.reduce(
            (sum, a) => sum + a.correctCount / (a.totalQuestions || 1),
            0
          ) /
            records.length) *
            100
        )
      : 0;

  const bestPercent =
    records.length > 0
      ? Math.round(
          Math.max(
            ...records.map(
              (a) => (a.correctCount / (a.totalQuestions || 1)) * 100
            )
          )
        )
      : 0;

  const stats = [
    {
      label: 'آزمون‌های داده‌شده',
      value: records.length.toLocaleString('fa-IR'),
      icon: ListChecks,
      bg: 'bg-violet-500/12 text-violet-600 dark:text-violet-300',
    },
    {
      label: 'میانگین نمره',
      value:
        records.length > 0 ? `${averagePercent.toLocaleString('fa-IR')}٪` : '—',
      icon: TrendingUp,
      bg: 'bg-cyan-500/12 text-cyan-600 dark:text-cyan-300',
    },
    {
      label: 'بهترین نمره',
      value:
        records.length > 0 ? `${bestPercent.toLocaleString('fa-IR')}٪` : '—',
      icon: Award,
      bg: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300',
    },
  ];

  return (
    <AppLayout title="نتایج من">
      {error && (
        <Toast
          message={error}
          tone="danger"
          icon={XCircle}
          onDismiss={() => setError(null)}
        />
      )}
      {loading ? (
        <Spinner />
      ) : (
        <div className="glass-dashboard results-dashboard">
          <div className="glass-welcome mb-7 rounded-3xl px-7 py-7 text-white"><p className="text-sm text-white/80">عملکرد آموزشی شما</p><h1 className="mt-2 text-2xl font-extrabold">نتایج من</h1><p className="mt-2 text-sm text-white/80">آمار، پیشرفت و تاریخچه آزمون‌های شما در یک نگاه</p></div>

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map(({ label, value, icon: Icon, bg }) => (
              <div
                key={label}
                className="glass-stat glass-kpi results-kpi flex min-h-36 flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${bg}`}
                >
                  <Icon size={20} />
                </div>
                <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                  {label}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="glass-panel rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
              تاریخچه‌ی آزمون‌ها
            </h2>

            {sortedAttempts.length === 0 ? (
              <EmptyState icon={Inbox} title="هنوز آزمونی نداده‌ای" description="بعد از شرکت در اولین آزمون، نتیجه و روند پیشرفتت اینجا نمایش داده می‌شود." action={{label:"مشاهده آزمون‌ها",onClick:()=>navigate('/exams')}} />
            ) : (
              <div className="flex flex-col gap-3">
                {sortedAttempts.map((attempt) => {
                  const percent = Math.round(
                    (attempt.correctCount / (attempt.totalQuestions || 1)) * 100
                  );
                  const tone = scoreTone(percent);

                  return (
                    <div
                      key={attempt.id}
                      className="flex flex-col gap-3 rounded-xl border border-gray-100 p-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          {attempt.exam.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                          <span>
                            {new Date(attempt.finishedAt).toLocaleDateString(
                              'fa-IR'
                            )}
                          </span>
                          <span>
                            {attempt.correctCount.toLocaleString('fa-IR')} از{' '}
                            {attempt.totalQuestions.toLocaleString('fa-IR')}{' '}
                            پاسخ درست
                          </span>
                          {attempt.endedByTimeout && (
                            <span
                              title="با اتمام وقت به پایان رسید"
                              className="flex items-center gap-1 text-danger-500"
                            >
                              <TimerOff size={12} />
                              اتمام وقت
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-bold ${tone.bg} ${tone.text}`}
                        >
                          {percent.toLocaleString('fa-IR')}٪
                        </span>

                        {attempt.exam.allowReview && (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/exams/${attempt.exam.id}/review`)
                            }
                            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition"
                          >
                            <Eye size={13} />
                            مرور پاسخ‌ها
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default MyResultsPage;
