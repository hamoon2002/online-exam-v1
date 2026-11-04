import Spinner from '../../../components/Spinner/Spinner';
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, X, LibraryBig } from "lucide-react";
import UiSelect from "../../../components/UiSelect";
import {
  getBankQuestionsPage,
  type BankQuestion,
  type QuestionBank,
} from "../../../api/questionBankApi";
import usePagedList from "../../../hooks/usePagedList";
import ListPagination from "../../../components/ListPagination/ListPagination";
import Difficulty from "../../../components/QuestionDifficultyBadge/QuestionDifficultyBadge";
import { panel } from "../practiceUi";
export type PickedQuestion = Pick<BankQuestion, "id" | "text" | "difficulty">;
type Props = {
  banks: QuestionBank[];
  selected: PickedQuestion[];
  onChange: (items: PickedQuestion[]) => void;
  disabled: boolean;
};
export default function PracticeQuestionPicker({
  banks,
  selected,
  onChange,
  disabled,
}: Props) {
  const [bankId, setBankId] = useState(banks[0]?.id ?? "");
  useEffect(() => {
    if (banks.length && !banks.some(bank => bank.id === bankId)) setBankId(banks[0].id);
  }, [banks, bankId]);
  const list = usePagedList(
    (query) => getBankQuestionsPage(bankId, query),
    bankId,
    !!bankId,
  );
  const ids = new Set(selected.map((q) => q.id));
  return (
    <section className={panel}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="inline-flex items-center gap-2 text-lg font-bold"><LibraryBig size={19} className="text-violet-600"/>۲. انتخاب سؤال‌ها</h2><span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">{selected.length.toLocaleString("fa-IR")} / ۱۰۰ سؤال</span></div>
      <p className="mb-5 text-sm text-gray-500">
        حداکثر ۱۰۰ سؤال از بانک‌های خود انتخاب کنید؛ انتخاب‌ها هنگام جابه‌جایی
        بین بانک‌ها باقی می‌مانند.
      </p>
      {!banks.length ? (
        <p>ابتدا در بخش «بانک سؤال» سؤال بسازید یا فایل اکسل وارد کنید.</p>
      ) : (
        <fieldset
          disabled={disabled}
          className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]"
        >
          <div className="min-w-0">
            <label className="mb-4 block text-sm">
              بانک سؤال
              <UiSelect
                className="mt-2 w-full"
                aria-label="بانک سؤال"
                value={bankId}
                onChange={(e) => setBankId(e.target.value)}
              >
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </UiSelect>
            </label>
            <ListPagination {...list} />
            {list.error ? (
              <p role="alert">
                {list.error}
                <button
                  type="button"
                  onClick={list.reload}
                  className="mr-2 underline"
                >
                  تلاش مجدد
                </button>
              </p>
            ) : list.loading ? (
              <Spinner label="در حال دریافت سؤال‌ها…" />
            ) : !list.items.length ? (
              <p className="rounded-2xl border border-dashed border-violet-200 p-8 text-center text-sm text-slate-500 dark:border-violet-400/25">در این بانک سؤالی پیدا نشد. از بخش بانک سؤال، سؤال جدید اضافه کنید.</p>
            ) : (
              <div className="max-h-[32rem] space-y-3 overflow-y-auto">
                {list.items.map((q) => (
                  <label
                    key={q.id}
                    className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${ids.has(q.id) ? "border-violet-500 bg-violet-50 dark:border-violet-400/50 dark:bg-violet-500/10" : "border-slate-200 hover:border-violet-300 hover:bg-violet-50/30 dark:border-slate-700"}`}
                  >
                    <input
                      type="checkbox"
                      checked={ids.has(q.id)}
                      disabled={!ids.has(q.id) && selected.length >= 100}
                      onChange={() =>
                        onChange(
                          ids.has(q.id)
                            ? selected.filter((item) => item.id !== q.id)
                            : [
                                ...selected,
                                {
                                  id: q.id,
                                  text: q.text,
                                  difficulty: q.difficulty,
                                },
                              ],
                        )
                      }
                      className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="mb-2 block break-words text-sm leading-7">
                        {q.text}
                      </span>
                      <Difficulty difficulty={q.difficulty} />
                      <span className="mt-2 block text-xs text-slate-500">
                        پاسخ صحیح: {q.options[q.correctOptionIndex]}
                      </span>
                    </span>
                    {ids.has(q.id) && <CheckCircle2 size={19} className="mt-1 shrink-0 text-violet-600"/>}
                  </label>
                ))}
              </div>
            )}
          </div>
          <aside className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4 dark:border-violet-400/20 dark:bg-violet-500/5">
            <h3 className="font-bold">
              انتخاب‌شده‌ها ({selected.length.toLocaleString("fa-IR")})
            </h3>
            <p className="my-3 text-xs leading-6 text-gray-500">
              ترتیب این فهرست، ترتیب سؤال‌های تمرین است.
            </p>
            {!selected.length && <p className="rounded-xl border border-dashed border-violet-200 p-5 text-center text-xs text-slate-500 dark:border-violet-400/20">با تیک‌زدن سؤال‌ها، فهرست انتخاب‌شده‌ها اینجا نمایش داده می‌شود.</p>}
            <ol className="max-h-[32rem] space-y-2 overflow-y-auto">
              {selected.map((q, i) => (
                <li key={q.id} className="flex items-start gap-2 rounded-xl border border-violet-100 bg-white p-2 text-sm dark:border-violet-400/15 dark:bg-slate-800">
                  <span className="min-w-0 flex-1 break-words">
                    {(i + 1).toLocaleString("fa-IR")}. {q.text}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" disabled={disabled || i === 0} aria-label={`بالا بردن سؤال ${i + 1}`} onClick={() => { const next = [...selected]; [next[i-1], next[i]] = [next[i], next[i-1]]; onChange(next); }} className="rounded p-1 text-violet-600 disabled:opacity-25"><ArrowUp size={15}/></button>
                    <button type="button" disabled={disabled || i === selected.length - 1} aria-label={`پایین بردن سؤال ${i + 1}`} onClick={() => { const next = [...selected]; [next[i+1], next[i]] = [next[i], next[i+1]]; onChange(next); }} className="rounded p-1 text-violet-600 disabled:opacity-25"><ArrowDown size={15}/></button>
                    <button type="button" disabled={disabled} aria-label={`حذف سؤال ${i + 1} از انتخاب`} onClick={() => onChange(selected.filter(item => item.id !== q.id))} className="rounded p-1 text-rose-500"><X size={15}/></button>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </fieldset>
      )}
    </section>
  );
}
