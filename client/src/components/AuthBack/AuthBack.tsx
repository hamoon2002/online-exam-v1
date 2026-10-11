import { ArrowRight } from 'lucide-react';
export default function AuthBack({
  onClick,
  disabled = false,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="بازگشت به مرحله قبل"
      title="بازگشت"
      className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      <ArrowRight size={20} />
    </button>
  );
}
