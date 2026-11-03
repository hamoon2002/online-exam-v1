import { Users, Pencil, Trash2, Copy, Check, RotateCw, KeyRound } from 'lucide-react';
import type { Group } from '../../../api/groupApi';

type GroupCardProps = {
  group: Group;
  isCopied: boolean;
  isRegenerating: boolean;
  onCopyCode: (group: Group) => void;
  onRegenerateCode: (group: Group) => void;
  onEdit: (group: Group) => void;
  onDelete: (group: Group) => void;
};

function GroupCard({
  group,
  isCopied,
  isRegenerating,
  onCopyCode,
  onRegenerateCode,
  onEdit,
  onDelete,
}: GroupCardProps) {
  return (
    <article className="group-premium-card flex flex-col gap-3 rounded-xl border border-violet-200/50 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900 sm:p-4">
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-400">
          <Users size={17} />
        </div>
        <div className="min-w-0 flex-1 text-right">
          <h2 className="truncate text-sm font-bold leading-6 text-gray-900 dark:text-white" title={group.name}>{group.name}</h2>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400" title={group.category}>{group.category}</p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button type="button" onClick={() => onEdit(group)} aria-label={`ویرایش گروه ${group.name}`} title="ویرایش" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-brand-50 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-brand-950/40 dark:hover:text-brand-400"><Pencil size={15} /></button>
          <button type="button" onClick={() => onDelete(group)} aria-label={`حذف گروه ${group.name}`} title="حذف" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-danger-50 hover:text-danger-600 dark:text-gray-400 dark:hover:bg-danger-950/40 dark:hover:text-danger-400"><Trash2 size={15} /></button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="rounded-md bg-violet-50 px-2 py-1 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">{group.studentIds.length.toLocaleString('fa-IR')} دانشجو</span>
        {group.approvalStatus && group.approvalStatus !== 'Approved' && (
          <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            {group.approvalStatus === 'Pending' ? 'در انتظار تأیید مدیر' : 'تأیید نشده'}
          </span>
        )}
      </div>
      {group.approvalStatus && group.approvalStatus !== 'Approved' && (
        <p className="text-xs leading-5 text-amber-700 dark:text-amber-300">
          {group.approvalStatus === 'Pending' ? 'عضویت و استفاده از گروه پس از تأیید مدیر فعال می‌شود.' : 'برای بررسی مجدد با مدیر تماس بگیرید.'}
        </p>
      )}
      {(!group.approvalStatus || group.approvalStatus === 'Approved') && (
        <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-2.5 py-2 dark:border-gray-700/50 dark:bg-gray-800/50">
          <KeyRound size={14} className="shrink-0 text-gray-400" />
          <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">کد عضویت</span>
          <span dir="ltr" className="min-w-0 flex-1 select-all truncate text-center font-mono text-xs font-bold tracking-wide text-gray-800 dark:text-white" title={group.joinCode}>{group.joinCode}</span>
          <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" onClick={() => onCopyCode(group)} aria-label="کپی کد عضویت" title="کپی کد" className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition hover:bg-white hover:text-brand-600 dark:text-gray-400 dark:hover:bg-gray-700">
              {isCopied ? <Check size={14} className="text-success-600" /> : <Copy size={14} />}
            </button>
            <button type="button" onClick={() => onRegenerateCode(group)} aria-label="ساخت کد عضویت جدید" title="تولید کد جدید (کد قبلی دیگر کار نمی‌کند)" disabled={isRegenerating} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition hover:bg-white hover:text-brand-600 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700">
              <RotateCw size={14} className={isRegenerating ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default GroupCard;