import { useEffect, useState } from 'react';

type AvatarProps = {
  /** نام (یا نام کاربری) برای حرف اولِ جایگزین */
  name?: string;
  /** آدرس تصویر پروفایل؛ اگر نبود یا بارگذاری نشد، حرف اول نمایش داده می‌شود */
  src?: string;
  /** اندازه‌ی ضلع به پیکسل */
  size?: number;
  className?: string;
};

function Avatar({ name, src, size = 36, className = '' }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  // با عوض‌شدن آدرس (تصویر تازه) دوباره امتحان می‌کنیم
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const initial = name?.trim()?.[0]?.toUpperCase() ?? '؟';
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        style={style}
        onError={() => setFailed(true)}
        className={`shrink-0 rounded-full object-cover shadow-sm ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      style={style}
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-white shadow-sm shadow-brand-600/30 ${className}`}
    >
      {initial}
    </div>
  );
}

export default Avatar;
