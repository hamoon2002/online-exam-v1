import PanelBack from '../../components/PanelBack/PanelBack';
import Spinner from '../../components/Spinner/Spinner';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, ClipboardList, Plus, Send, Ticket } from 'lucide-react';
import UiSelect from '../../components/UiSelect';
import AppLayout from '../../components/AppLayout/AppLayout';
import Modal from '../../components/Modal/Modal';
import DataTable from '../../components/AdminUI/DataTable';
import { useAuth } from '../../context/AuthContext';
import {
  createSupportTicket, getAdminSupportTickets, getMyTickets,
  getAssignedStudentTickets, getStudentInstructors,
  getTicket, getTicketMessages,
  postTicketMessage, updateTicketStatus,
  ticketCategoryLabels, ticketPriorityLabels, ticketStatusLabels,
  type SupportTicket, type AvailableInstructor, type TicketMessage,
  type TicketCategory, type TicketPriority,
} from '../../api/supportTicketApi';

const priorityColor: Record<TicketPriority, string> = {
  Low: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
  Normal: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  High: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  Urgent: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};
function fmt(value: string) {
  return new Date(value).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });
}
function Status({ status }: { status: SupportTicket['status'] }) {
  const color = status === 'Closed'
    ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200'
    : status === 'Answered'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
      : 'bg-violet-50 text-brand-ink dark:bg-violet-500/15';
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{ticketStatusLabels[status]}</span>;
}

export default function SupportPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SuperAdmin';
  const isTeacher = user?.role === 'Instructor';
  const isStudent = user?.role === 'Student';
  const [waitingOnly, setWaitingOnly] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [ticketView, setTicketView] = useState<'mine' | 'students'>('mine');
  const [availableInstructors, setAvailableInstructors] = useState<AvailableInstructor[]>([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('Technical');
  const [priority, setPriority] = useState<TicketPriority>('Normal');
  const [body, setBody] = useState('');
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const pendingId = useRef<string | null>(null);

  const detailRequest = useRef(0);

  useEffect(() => {
    if (!isStudent) return;
    let active = true;
    getStudentInstructors()
      .then(items => {
        if (!active) return;
        setAvailableInstructors(items);
        setAssigneeId(previous => items.some(item => item.id === previous) ? previous : items.length === 1 ? items[0].id : '');
      })
      .catch(() => { if (active) setError('دریافت فهرست مدرس‌ها ممکن نشد.'); });
    return () => { active = false; };
  }, [isStudent]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setListError('');
    const run = async () => {
      try {
        if (isAdmin) {
          const result = await getAdminSupportTickets(page, waitingOnly);
          if (!active) return;
          if (page > 0 && result.items.length === 0) {
            setPage(page - 1);
            return;
          }
          setTickets(result.items);
          setHasMore(result.hasMore);
        } else {
          const items = isTeacher && ticketView === 'students'
            ? await getAssignedStudentTickets(page)
            : await getMyTickets(page);
          if (active) setTickets(items);
        }
      } catch (err) {
        if (active) setListError(err instanceof Error ? err.message : 'دریافت تیکت‌ها انجام نشد.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => { active = false; };
  }, [isAdmin, page, waitingOnly, refreshKey, isTeacher, ticketView]);

  const openTicket = useCallback(async (ticket: SupportTicket) => {
    const request = ++detailRequest.current;
    setSelectedTicket(ticket);
    setDetailLoading(true);
    setMessages([]);
    setError('');
    try {
      const [latest, history] = await Promise.all([getTicket(ticket.id), getTicketMessages(ticket.id)]);
      if (request !== detailRequest.current) return;
      setSelectedTicket(latest);
      setMessages(history);
    } catch (err) {
      if (request === detailRequest.current) setError(err instanceof Error ? err.message : 'دریافت گفت‌وگو انجام نشد.');
    } finally {
      if (request === detailRequest.current) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedTicket) return;
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight });
  }, [messages, selectedTicket]);

  useEffect(() => {
    if (!selectedTicket) return;
    let active = true;
    const id = window.setInterval(() => {
      void getTicketMessages(selectedTicket.id).then(rows => {
        if (active) setMessages(old => {
          const lastOld = old.at(-1)?.id;
          const lastNew = rows.at(-1)?.id;
          return lastOld === lastNew && old.length === rows.length ? old : rows;
        });
      }).catch(() => {});
    }, 15000);
    return () => { active = false; window.clearInterval(id); };
  }, [selectedTicket?.id]);

  async function submitTicket(event: FormEvent) {
    event.preventDefault();
    if (saving || subject.trim().length < 3 || body.trim().length < 5 || (isStudent && !assigneeId)) return;
    setSaving(true);
    setError('');
    try {
      const created = await createSupportTicket({ subject: subject.trim(), category, priority, body: body.trim(), ...(isStudent ? { assignedInstructorId: assigneeId } : {}) });
      setCreateOpen(false);
      setSubject(''); setBody(''); setPriority('Normal'); setCategory('Technical');
      setPage(0);
      setRefreshKey(key => key + 1);
      await openTicket(created);
    } catch (err) { setError(err instanceof Error ? err.message : 'ثبت تیکت ناموفق بود.'); }
    finally { setSaving(false); }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!selectedTicket || detailLoading || saving || sending || !draft.trim()) return;
    const id = pendingId.current ?? crypto.randomUUID();
    pendingId.current = id;
    setSending(true);
    setError('');
    try {
      await postTicketMessage(selectedTicket.id, draft.trim(), id);
      pendingId.current = null;
      setDraft('');
      await openTicket(selectedTicket);
      setRefreshKey(key => key + 1);
    } catch (err) { setError(err instanceof Error ? err.message : 'ارسال پیام ناموفق بود.'); }
    finally { setSending(false); }
  }

  async function toggleTicketStatus() {
    if (!selectedTicket || detailLoading || saving || sending) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateTicketStatus(selectedTicket.id, selectedTicket.status === 'Closed' ? 'Open' : 'Closed');
      setSelectedTicket(updated);
      setTickets(old => old.map(item => item.id === updated.id ? updated : item));
      if (isAdmin) setRefreshKey(key => key + 1);
    } catch (err) { setError(err instanceof Error ? err.message : 'تغییر وضعیت انجام نشد.'); }
    finally { setSaving(false); }
  }

  function closeTicket() {
    if (sending || saving) return;
    detailRequest.current += 1;
    pendingId.current = null;
    setSelectedTicket(null);
    setDraft('');
    setError('');
  }

  const sectionTitle = isAdmin ? 'صندوق تیکت‌های مدرس‌ها' : selectedTicket ? 'جزئیات تیکت'
    : isTeacher && ticketView === 'students' ? 'تیکت‌های دانشجویان من' : 'تیکت‌های من';
  const pagination = (
    <div className="flex items-center justify-center gap-3">
      <button type="button" disabled={page === 0 || loading} onClick={() => setPage(p => Math.max(0, p - 1))} className="rounded-xl border border-violet-200 px-4 py-2 text-sm text-brand-ink disabled:opacity-40 dark:border-violet-400/25">قبلی</button>
      <span className="text-xs text-slate-500">صفحه {(page + 1).toLocaleString('fa-IR')}</span>
      <button type="button" disabled={loading || (isAdmin ? !hasMore : tickets.length < 50)} onClick={() => setPage(p => p + 1)} className="rounded-xl border border-violet-200 px-4 py-2 text-sm text-brand-ink disabled:opacity-40 dark:border-violet-400/25">بعدی</button>
    </div>
  );
  const conversation = selectedTicket && (
    <section className="overflow-hidden rounded-2xl border border-violet-200/50 bg-white/90 shadow-sm dark:border-violet-400/20 dark:bg-slate-900/85">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-violet-100 px-5 py-5 dark:border-violet-400/15 sm:px-7">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-brand-ink" dir="ltr">{selectedTicket.trackingCode}</p>
          {(isAdmin || isTeacher) && selectedTicket.user && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isAdmin ? 'مدرس' : 'دانشجو'}: {selectedTicket.user.name || selectedTicket.user.username || 'بدون نام'}</p>}
          <h2 className="mt-1 break-words text-lg font-bold text-slate-900 dark:text-white">{selectedTicket.subject}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{ticketCategoryLabels[selectedTicket.category]}</span>
            <span>·</span>
            <span className={`rounded-full px-2.5 py-1 ${priorityColor[selectedTicket.priority]}`}>اولویت {ticketPriorityLabels[selectedTicket.priority]}</span>
            <span>·</span><span>{fmt(selectedTicket.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2"><Status status={selectedTicket.status}/><button type="button" disabled={saving || sending || detailLoading} onClick={() => void toggleTicketStatus()} className="rounded-xl border border-violet-200 px-3 py-2 text-xs font-semibold text-brand-ink hover:bg-violet-50 disabled:opacity-50 dark:border-violet-400/25">{selectedTicket.status === 'Closed' ? 'بازکردن تیکت' : 'بستن تیکت'}</button></div>
      </div>
      <div ref={chatRef} role="log" aria-label="پیام‌های تیکت" className="max-h-[55dvh] min-h-72 space-y-4 overflow-y-auto bg-violet-50/20 px-5 py-5 dark:bg-slate-950/20 sm:px-7">
        {detailLoading ? <Spinner label="در حال دریافت پیام‌ها…" compact /> : messages.map(message => {
          const mine = isAdmin ? message.fromStaff : !message.fromStaff;
          return <div key={message.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] rounded-2xl border px-4 py-3 shadow-sm sm:max-w-[75%] ${mine ? 'border-violet-200 bg-violet-100 text-slate-800 dark:border-violet-400/25 dark:bg-violet-500/20 dark:text-white' : 'border-slate-200 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-white'}`}>
              <p className="mb-2 text-[11px] font-bold opacity-70">{message.fromStaff ? 'پشتیبانی' : 'کاربر'}</p>
              <p className="whitespace-pre-wrap break-words text-sm leading-7">{message.body}</p>
              <time className="mt-2 block text-left text-[10px] opacity-60" dateTime={message.createdAt}>{fmt(message.createdAt)}</time>
            </div>
          </div>;
        })}
      </div>
      <form onSubmit={e => void sendMessage(e)} className="border-t border-violet-100 px-5 py-4 dark:border-violet-400/15 sm:px-7">
        {selectedTicket.status === 'Closed' ? <p className="text-sm text-slate-500">این تیکت بسته شده است. برای ادامه گفتگو ابتدا آن را باز کنید.</p> : <div className="flex items-end gap-3">
          <textarea aria-label="پاسخ به تیکت" value={draft} onChange={e => { setDraft(e.target.value); pendingId.current = null; }} maxLength={2000} rows={2} placeholder="پاسخ خود را بنویسید…" className="min-h-20 min-w-0 flex-1 resize-none rounded-xl border border-violet-200 bg-slate-50/70 px-4 py-3 text-sm outline-none focus:border-violet-400 dark:border-violet-400/25 dark:bg-slate-800 dark:text-white"/>
          <button type="submit" disabled={sending || saving || detailLoading || !draft.trim()} className="ui-primary-gradient inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-40"><Send size={16}/>{sending ? 'ارسال…' : 'ارسال'}</button>
        </div>}
      </form>
    </section>
  );

  return (
    <AppLayout title="پشتیبانی">
      <div dir="rtl" className="mx-auto w-full max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {!isAdmin && selectedTicket && <PanelBack label="بازگشت" iconOnly onClick={closeTicket} />}
            <div>
              <p className="text-xs font-medium text-brand-ink">مرکز پشتیبانی</p>
              <h1 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{sectionTitle}</h1>
            </div>
          </div>
          {!isAdmin && !selectedTicket && <button type="button" onClick={() => setCreateOpen(true)} className="ui-primary-gradient inline-flex min-h-10 items-center gap-2 rounded-xl px-5 text-sm font-semibold"><Plus size={17}/> ثبت تیکت جدید</button>}
        </div>

        {isTeacher && !selectedTicket && (
          <div role="group" aria-label="نمایش تیکت‌ها" className="inline-flex rounded-xl border border-violet-200/60 bg-white/80 p-1 dark:border-violet-400/20 dark:bg-slate-900/80">
            <button type="button" aria-pressed={ticketView === 'mine'} onClick={() => { setTicketView('mine'); setPage(0); }} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${ticketView === 'mine' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-violet-50 dark:text-slate-300 dark:hover:bg-violet-500/10'}`}>تیکت‌های من</button>
            <button type="button" aria-pressed={ticketView === 'students'} onClick={() => { setTicketView('students'); setPage(0); }} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${ticketView === 'students' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-violet-50 dark:text-slate-300 dark:hover:bg-violet-500/10'}`}>تیکت‌های دانشجویان</button>
          </div>
        )}
        {listError && !selectedTicket && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{listError} <button type="button" onClick={() => setRefreshKey(key => key + 1)} className="font-semibold underline">تلاش مجدد</button></p>}
        {error && (!isAdmin || !selectedTicket) && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

        {isAdmin ? (
          <>
            <div role="group" aria-label="وضعیت تیکت‌ها" className="inline-flex gap-1 rounded-xl border border-violet-200/60 bg-white/85 p-1 dark:border-violet-400/20 dark:bg-slate-900/80">
              {([{ label: 'همه', waiting: false }, { label: 'در انتظار پاسخ', waiting: true }]).map(({ label, waiting }) => (
                <button key={label} type="button" aria-pressed={waitingOnly === waiting}
                  onClick={() => { if (waitingOnly !== waiting) { setWaitingOnly(waiting); setPage(0); } }}
                  className="min-h-10 rounded-lg px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-500 aria-pressed:bg-violet-100 aria-pressed:text-brand-ink dark:text-slate-300 dark:hover:bg-violet-500/10 dark:aria-pressed:bg-violet-500/20">
                  {label}
                </button>
              ))}
            </div>
            {loading && !selectedTicket ? <Spinner label="در حال دریافت تیکت‌ها…" /> : !listError && (
              tickets.length ? (
                <ul className="space-y-2">
                  {tickets.map(ticket => (
                    <li key={ticket.id}>
                      <button type="button" onClick={() => void openTicket(ticket)}
                        className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-200/65 bg-white/85 px-4 py-3 text-start shadow-sm transition-colors hover:border-violet-400/70 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-violet-400/25 dark:bg-slate-900/85 dark:hover:bg-violet-500/10">
                        <span className="min-w-0">
                          <span className="block break-words text-sm font-semibold text-slate-900 dark:text-white">{ticket.subject}</span>
                          <span className="mt-1 block text-xs text-slate-600 dark:text-slate-300">{ticket.user?.name || ticket.user?.username || 'مدرس بدون نام'} · {fmt(ticket.updatedAt)}</span>
                        </span>
                        <Status status={ticket.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="rounded-xl border border-violet-200/50 bg-white/75 p-5 text-sm text-slate-600 dark:border-violet-400/20 dark:bg-slate-900/80 dark:text-slate-300">{waitingOnly ? 'تیکتی در انتظار پاسخ نیست.' : 'هنوز هیچ مدرسی تیکت ثبت نکرده است.'}</p>
            )}
            {(page > 0 || hasMore) && pagination}
          </>
        ) : selectedTicket ? conversation : (
          <>
            <DataTable items={tickets} loading={loading} empty="تیکتی ثبت نشده است." onSelect={item => void openTicket(item)}
              columns={[
                { key: 'code', label: 'کد رهگیری', render: item => <span dir="ltr" className="font-mono text-xs font-semibold text-brand-ink">{item.trackingCode}</span> },
                ...(isTeacher && ticketView === 'students' ? [{ key: 'student', label: 'دانشجو', render: (item: SupportTicket) => item.user?.name || item.user?.username || 'دانشجو' }] : []),
                { key: 'subject', label: 'موضوع', render: item => <span className="font-semibold">{item.subject}</span> },
                { key: 'category', label: 'دسته‌بندی', render: item => ticketCategoryLabels[item.category] },
                { key: 'priority', label: 'اهمیت', render: item => <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${priorityColor[item.priority]}`}>{ticketPriorityLabels[item.priority]}</span> },
                { key: 'status', label: 'وضعیت', render: item => <Status status={item.status}/> },
                { key: 'date', label: 'آخرین تغییر', render: item => <span className="whitespace-nowrap text-xs">{fmt(item.updatedAt)}</span> },
                { key: 'action', label: 'عملیات', render: item => <button type="button" onClick={() => void openTicket(item)} className="rounded-lg px-3 py-2 text-xs font-semibold text-brand-ink hover:bg-violet-50">جزئیات</button> },
              ]}
            />
            {pagination}
          </>
        )}
      </div>

      {isAdmin && (
        <Modal isOpen={Boolean(selectedTicket)} onClose={closeTicket} label="گفت‌وگوی تیکت" wide>
          <div dir="rtl" className="space-y-3">
            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
            {conversation}
          </div>
        </Modal>
      )}
      <Modal isOpen={createOpen} onClose={() => { if (!saving) setCreateOpen(false); }} wide label="ثبت تیکت پشتیبانی">
        <div dir="rtl">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-brand-ink"><Ticket size={20}/><h2 className="text-lg font-bold text-slate-900 dark:text-white">ثبت تیکت جدید</h2></div>

          </div>
          <form onSubmit={e => void submitTicket(e)} className="space-y-4">
            <div><label htmlFor="ticket-subject" className="mb-1.5 block text-sm font-semibold dark:text-white">موضوع</label><input id="ticket-subject" required minLength={3} maxLength={160} value={subject} onChange={e => setSubject(e.target.value)} placeholder="مثلاً مشکل نمایش نتایج آزمون" className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"/></div>
            {isStudent && <div>
              <label htmlFor="ticket-assignee" className="mb-1.5 block text-sm font-semibold dark:text-white">مدرس مربوطه</label>
              {availableInstructors.length ? (
                <UiSelect id="ticket-assignee" aria-label="مدرس مربوطه" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                  <option value="">انتخاب مدرس</option>
                  {availableInstructors.map(instructor => <option key={instructor.id} value={instructor.id}>{instructor.name || instructor.username || 'مدرس'}</option>)}
                </UiSelect>
              ) : <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">برای ارسال تیکت به مدرس، ابتدا باید عضو یکی از گروه‌های آموزشی باشید.</p>}
            </div>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label htmlFor="ticket-category" className="mb-1.5 block text-sm font-semibold dark:text-white">دسته‌بندی</label><UiSelect id="ticket-category" value={category} onChange={e => setCategory(e.target.value as TicketCategory)} className="min-h-11 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm dark:border-violet-400/25 dark:bg-slate-800 dark:text-white">{(Object.keys(ticketCategoryLabels) as TicketCategory[]).map(key => <option key={key} value={key}>{ticketCategoryLabels[key]}</option>)}</UiSelect></div>
              <div><label htmlFor="ticket-priority" className="mb-1.5 block text-sm font-semibold dark:text-white">درجه اهمیت</label><UiSelect id="ticket-priority" value={priority} onChange={e => setPriority(e.target.value as TicketPriority)} className="min-h-11 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm dark:border-violet-400/25 dark:bg-slate-800 dark:text-white">{(Object.keys(ticketPriorityLabels) as TicketPriority[]).map(key => <option key={key} value={key}>{ticketPriorityLabels[key]}</option>)}</UiSelect></div>
            </div>
            <div><label htmlFor="ticket-body" className="mb-1.5 block text-sm font-semibold dark:text-white">شرح درخواست</label><textarea id="ticket-body" required minLength={5} maxLength={2000} rows={5} value={body} onChange={e => setBody(e.target.value)} placeholder="مشکل یا درخواست خود را با جزئیات توضیح دهید…" className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"/></div>
            <p className="flex items-center gap-2 text-xs text-slate-500"><ClipboardList size={15}/> پس از ثبت، کد رهگیری یکتا دریافت می‌کنید.</p>
            <button type="submit" disabled={saving || subject.trim().length < 3 || body.trim().length < 5 || (isStudent && !assigneeId)} className="ui-primary-gradient inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl font-bold disabled:opacity-40"><CheckCircle2 size={17}/>{saving ? 'در حال ثبت…' : 'ثبت تیکت'}</button>
          </form>
        </div>
      </Modal>
    </AppLayout>
  );
}
