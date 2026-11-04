import { CheckCircle2, Save, X } from 'lucide-react';
import UiSelect from '../../../components/UiSelect';
import type { BankQuestionInput, QuestionDifficulty } from '../../../api/questionBankApi';

type BankQuestionFormProps = {
  form: BankQuestionInput;
  isEditing: boolean;
  saving: boolean;
  error: string;
  canSubmit: boolean;
  onTextChange: (value: string) => void;
  onOptionChange: (index: number, value: string) => void;
  onCorrectOptionChange: (index: number) => void;
  onDifficultyChange: (value: QuestionDifficulty) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
};

export default function BankQuestionForm({
  form, isEditing, saving, error, canSubmit,
  onTextChange, onOptionChange, onCorrectOptionChange, onDifficultyChange,
  onSubmit, onCancel,
}: BankQuestionFormProps) {
  return (
    <form onSubmit={onSubmit} dir="rtl" className="space-y-5">
      <header>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{isEditing ? 'ویرایش سؤال' : 'سؤال جدید'}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">صورت سؤال و گزینه‌ها را وارد کنید. با انتخاب دایره کنار یک گزینه، پاسخ درست را مشخص کنید.</p>
      </header>
      <fieldset disabled={saving} className="space-y-4">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">متن سؤال
          <textarea value={form.text} onChange={event => onTextChange(event.target.value)} placeholder="صورت سؤال را اینجا بنویسید…" aria-label="متن سوال" required rows={3} maxLength={2000}
            className="mt-2 w-full resize-y rounded-xl border border-violet-200 bg-white p-3 text-sm leading-7 text-slate-800 outline-none focus:border-violet-400 dark:border-violet-400/25 dark:bg-slate-800 dark:text-white"/>
        </label>
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">گزینه‌های پاسخ <span className="text-xs font-normal text-slate-500">(گزینه درست را علامت بزنید)</span></p>
          <div className="space-y-2.5">
            {form.options.map((option, index) => {
              const correct = form.correctOptionIndex === index;
              return (
                <label key={index} className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 transition-colors ${correct ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-500/40 dark:bg-emerald-500/10' : 'border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/50'}`}>
                  <input type="radio" name="correct-option" aria-label={`گزینه ${index + 1} جواب درست است`} checked={correct} onChange={() => onCorrectOptionChange(index)} className="h-4 w-4 shrink-0 accent-emerald-600"/>
                  <span className="w-10 shrink-0 text-xs text-slate-500">گزینه {(index + 1).toLocaleString('fa-IR')}</span>
                  <input value={option} onChange={event => onOptionChange(index, event.target.value)} placeholder={`متن گزینه ${index + 1}`} aria-label={`گزینه ${index + 1}`} required maxLength={500}
                    className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-violet-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white"/>
                  {correct && <CheckCircle2 aria-label="پاسخ صحیح" size={18} className="shrink-0 text-emerald-600"/>}
                </label>
              );
            })}
          </div>
        </div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">سطح سختی
          <UiSelect className="mt-2 w-full" aria-label="سطح سختی" value={form.difficulty ?? 'Medium'} onChange={event => onDifficultyChange(event.target.value as QuestionDifficulty)}>
            <option value="Easy">آسان</option><option value="Medium">متوسط</option><option value="Hard">سخت</option>
          </UiSelect>
        </label>
      </fieldset>
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
      <footer className="flex flex-wrap gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
        <button type="button" onClick={onCancel} disabled={saving} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-violet-200 px-4 text-sm font-semibold text-violet-700 disabled:opacity-50 dark:border-violet-400/25 dark:text-violet-200"><X size={16}/> انصراف</button>
        <button type="submit" disabled={saving || !canSubmit} className="ui-primary-gradient inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-40"><Save size={16}/>{saving ? 'در حال ذخیره…' : isEditing ? 'ذخیره تغییرات' : 'افزودن سؤال'}</button>
      </footer>
    </form>
  );
}
