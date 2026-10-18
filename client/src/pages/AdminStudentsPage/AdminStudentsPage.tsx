import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import EmptyState from '../../components/EmptyState/EmptyState';
import ListPagination from '../../components/ListPagination/ListPagination';
import Spinner from '../../components/Spinner/Spinner';
import usePagedList from '../../hooks/usePagedList';
import { collectListPages } from '../../lib/listPagination';
import { userDisplayName } from '../../lib/userDisplayName';
import { getAdminInstructors, type InstructorSummary } from '../../api/adminInstructorApi';
import {
  UNGROUPED_SELECTION,
  filterFromSelection,
  getAdminStudents,
} from '../../api/adminStudentApi';

// نمای فقط‌خواندنیِ دانشجوها برای SuperAdmin: همه، به تفکیک مدرس، یا بدون گروه.
// فیلتر و صفحه‌بندی سمت سرور است (/admin/users/students)
function AdminStudentsPage() {
  const [selection, setSelection] = useState('');
  const [instructors, setInstructors] = useState<InstructorSummary[]>([]);
  const [instructorsError, setInstructorsError] = useState(false);

  useEffect(() => {
    let active = true;
    collectListPages((query) => getAdminInstructors(query, 'Approved'))
      .then((items) => {
        if (active) setInstructors(items);
      })
      .catch(() => {
        if (active) setInstructorsError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const list = usePagedList(
    (query) => getAdminStudents(query, filterFromSelection(selection)),
    selection
  );

  return (
    <AppLayout title="دانشجویان">
      <h1 className="mb-1 text-2xl font-bold dark:text-white">دانشجویان</h1>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        هر دانشجو از طریق گروه‌هایش به مدرس وصل است. می‌توانی بر اساس مدرس فیلتر کنی
        یا دانشجوهای بدون گروه را ببینی.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          aria-label="فیلتر دانشجوها"
          value={selection}
          onChange={(event) => setSelection(event.target.value)}
          className="rounded border bg-transparent px-3 py-2 dark:text-gray-200"
        >
          <option value="">همهٔ دانشجوها</option>
          <option value={UNGROUPED_SELECTION}>بدون گروه</option>
          {instructors.map((instructor) => (
            <option key={instructor.id} value={instructor.id}>
              {userDisplayName(instructor)}
            </option>
          ))}
        </select>
        {instructorsError && (
          <span role="alert" className="text-sm text-danger-600">
            فهرست مدرس‌ها بارگذاری نشد
          </span>
        )}
      </div>

      <ListPagination {...list} maxSearchLength={100} />
      {list.error && (
        <p role="alert" className="mb-3 text-danger-600">
          {list.error}
        </p>
      )}

      {list.loading ? (
        <Spinner />
      ) : list.items.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="دانشجویی پیدا نشد"
          description="با این فیلتر و جستجو دانشجویی وجود ندارد."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full min-w-150 text-right text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-800/40 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3 font-medium">دانشجو</th>
                <th className="px-5 py-3 font-medium">ایمیل/شماره</th>
                <th className="px-5 py-3 font-medium">مدرس و گروه‌ها</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {list.items.map((student) => (
                <tr key={student.id} className="align-top text-gray-700 dark:text-gray-200">
                  <td className="px-5 py-3.5 font-medium">{userDisplayName(student)}</td>
                  <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">
                    {student.email || student.phone || '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    {student.instructors.length === 0 ? (
                      <span className="text-gray-400">بدون گروه</span>
                    ) : (
                      <ul className="space-y-1">
                        {student.instructors.map((instructor) => (
                          <li key={instructor.id}>
                            <span className="font-medium">
                              {instructor.name || 'بدون نام'}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {' — '}
                              {instructor.groups.map((group) => group.name).join('، ')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}

export default AdminStudentsPage;
