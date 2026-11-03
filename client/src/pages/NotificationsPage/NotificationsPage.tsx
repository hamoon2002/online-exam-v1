import { useState } from 'react';
import { Bell, BellRing, CheckCheck, Trash2, RefreshCw, Info, Users, Award } from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import useNotifications from '../../hooks/useNotifications';
import type { Notification } from '../../api/notificationApi';

const ICONS = { info: Info, people: Users, award: Award };

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, deleteError, deletingIds, deletingAll, markOneRead, markAllRead, removeNotification, removeAllNotifications, refresh } = useNotifications();
  const [filter, setFilter] = useState<'all'|'unread'|'read'>('all');
  const items = notifications.filter(n => filter === 'all' || (filter === 'unread' ? !n.read : n.read));

  return (
    <AppLayout title="همه اعلان‌ها">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white"><BellRing size={25} className="text-violet-600 dark:text-violet-300"/> همه اعلان‌ها</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{notifications.length.toLocaleString('fa-IR')} اعلان · {unreadCount.toLocaleString('fa-IR')} خوانده‌نشده</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" aria-label="تازه‌سازی اعلان‌ها" onClick={refresh} disabled={loading} className="rounded-xl border border-violet-200 bg-white/75 p-2.5 text-violet-700 disabled:opacity-50 dark:border-violet-400/25 dark:bg-gray-900 dark:text-violet-200"><RefreshCw size={17}/></button>
          <button type="button" disabled={loading || !unreadCount} onClick={markAllRead} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white/75 px-4 py-2.5 text-sm font-medium text-violet-700 disabled:opacity-40 dark:border-violet-400/25 dark:bg-gray-900 dark:text-violet-200"><CheckCheck size={17}/>خواندن همه</button>
          <button type="button" disabled={loading || deletingAll || !notifications.length} onClick={() => { if (window.confirm('همه اعلان‌های این حساب پاک شوند؟')) void removeAllNotifications(); }} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white/75 px-4 py-2.5 text-sm font-medium text-rose-700 disabled:opacity-40 dark:border-rose-400/25 dark:bg-gray-900 dark:text-rose-300"><Trash2 size={16}/>{deletingAll ? 'در حال پاک کردن…' : 'پاک کردن همه'}</button>
        </div>
      </div>
      {deleteError && <p role="alert" className="form-inline-error mb-4">{deleteError}</p>}
      <div role="group" aria-label="فیلتر وضعیت اعلان‌ها" className="mb-5 flex flex-wrap gap-2">
        {(['all', 'unread', 'read'] as const).map(key => (
          <button type="button" key={key} onClick={() => setFilter(key)} aria-pressed={filter === key} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${filter === key ? 'border-violet-500 bg-violet-600 text-white' : 'border-violet-200 bg-white/70 text-violet-700 dark:border-violet-400/25 dark:bg-gray-900 dark:text-violet-200'}`}>
            {key === 'all' ? 'همه' : key === 'unread' ? 'خوانده‌نشده' : 'خوانده‌شده'}
          </button>
        ))}
      </div>
      {loading && <p role="status" className="py-6 text-sm text-gray-500">در حال دریافت اعلان‌ها…</p>}
      {!loading && !items.length && (
        <div className="rounded-2xl border border-violet-200/50 bg-white/70 px-6 py-14 text-center dark:border-violet-400/15 dark:bg-gray-900/70">
          <Bell size={28} className="mx-auto text-violet-400"/>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-300">اعلانی در این بخش وجود ندارد.</p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((notification: Notification) => {
          const Icon = ICONS[notification.icon] ?? Info;
          return (
            <article key={notification.id} className={`flex min-w-0 flex-col rounded-2xl border p-4 shadow-sm transition-colors ${notification.read ? 'border-gray-200 bg-white/80 dark:border-gray-700 dark:bg-gray-900/75' : 'border-violet-300/70 bg-violet-50/80 dark:border-violet-400/30 dark:bg-violet-500/10'}`}>
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200"><Icon size={21}/></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-7 text-gray-800 dark:text-gray-100">{notification.title}</p>
                  <time dateTime={notification.createdAt} className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{new Date(notification.createdAt).toLocaleString('fa-IR')}</time>
                </div>
                {!notification.read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-violet-600" aria-label="خوانده‌نشده"/>}
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-violet-200/40 pt-3 dark:border-violet-400/15">
                <span className="text-xs text-gray-500 dark:text-gray-400">{notification.read ? 'خوانده‌شده' : 'جدید'}</span>
                <div className="flex items-center gap-1">
                  {!notification.read && <button type="button" onClick={() => markOneRead(notification.id)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 dark:text-violet-200 dark:hover:bg-violet-500/15">علامت‌گذاری به‌عنوان خوانده‌شده</button>}
                  <button type="button" aria-label={`حذف اعلان ${notification.title}`} disabled={deletingIds.includes(notification.id) || deletingAll} onClick={() => void removeNotification(notification.id)} className="rounded-lg p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-500/10"><Trash2 size={16}/></button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </AppLayout>
  );
}
