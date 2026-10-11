import type { ContentTab } from '../../api/adminInstructorApi';

export const instructorTabs: { key: ContentTab; label: string }[] = [
  { key: 'groups', label: 'گروه‌ها' }, { key: 'students', label: 'دانشجوها' },
  { key: 'lessons', label: 'درس‌ها' }, { key: 'handouts', label: 'جزوه‌ها' },
  { key: 'attachments', label: 'پیوست‌های درس' }, { key: 'banks', label: 'بانک سوال' },
  { key: 'questions', label: 'سوال‌ها' }, { key: 'exams', label: 'آزمون‌ها' },
  { key: 'results', label: 'نتایج' },
];

// مقدار نامعتبر یا خالیِ ?tab= به تب پیش‌فرض (گروه‌ها) برمی‌گردد
export function parseInstructorTab(value: string | null): ContentTab {
  return instructorTabs.find((t) => t.key === value)?.key ?? 'groups';
}
