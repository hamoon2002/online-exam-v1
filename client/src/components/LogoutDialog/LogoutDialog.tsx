import { useEffect, useRef } from 'react';
import { LogOut } from 'lucide-react';

type Props = { open: boolean; onCancel: () => void; onConfirm: () => void };

export default function LogoutDialog({ open, onCancel, onConfirm }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const previous = document.activeElement as HTMLElement | null;
    element.showModal();
    cancel.current?.focus();
    return () => {
      element.close();
      previous?.focus();
    };
  }, [open]);

  return (
    <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); onCancel(); }}
      aria-labelledby="logout-title" aria-describedby="logout-description"
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-xl backdrop:bg-black/50 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300"><LogOut size={22} aria-hidden="true" /></div>
      <h2 id="logout-title" className="text-lg font-bold">از حساب خارج می‌شوید؟</h2>
      <p id="logout-description" className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">برای استفاده دوباره از پنل، باید وارد حساب شوید.</p>
      <div className="mt-6 flex gap-3">
        <button ref={cancel} type="button" onClick={onCancel} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-gray-600 dark:hover:bg-gray-800">انصراف</button>
        <button type="button" onClick={onConfirm} className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm text-white transition-colors hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500">خروج از حساب</button>
      </div>
    </dialog>
  );
}
