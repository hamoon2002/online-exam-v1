import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';

import {
  detectIdentifierType,
  normalizeIdentifier,
} from '../../utils/identifier';

import Button from '../Button/Button';
import PasswordField from '../PasswordField/PasswordField';
import TextBox from '../TextBox/TextBox';

import {
  identityFieldsFor,
  validateIdentity,
  validateIdentityField,
  type IdentityErrors,
  type IdentityField,
  type IdentityValues,
} from './signup.validation';

type IdentityStepProps = {
  identifier: string;
  password: string;
  confirmPassword: string;
  loading: boolean;

  onIdentifierChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;

  onBack: () => void;
  /** شناسه‌ی معتبر و نرمال‌شده را تحویل می‌دهد */
  onNext: (normalizedIdentifier: string) => void;

  /** مثلاً کپچا؛ بالای دکمه‌ها نمایش داده می‌شود */
  children?: ReactNode;
};

function IdentityStep({
  identifier,
  password,
  confirmPassword,
  loading,
  onIdentifierChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onBack,
  onNext,
  children,
}: IdentityStepProps) {
  const [errors, setErrors] = useState<IdentityErrors>({});
  const [submitted, setSubmitted] = useState(false);

  // وقتی شناسه از مرحله‌ی ورود پر آمده، فوکوس باید روی رمز برود؛ اما فیلد رمز
  // وسط تایپ ایمیل ظاهر می‌شود و نباید فوکوس را از فیلد شناسه بدزدد
  const [startedWithIdentifier] = useState(() => Boolean(identifier.trim()));

  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const fieldRefs: Record<IdentityField, React.RefObject<HTMLInputElement | null>> = {
    identifier: identifierRef,
    password: passwordRef,
    confirmPassword: confirmPasswordRef,
  };

  const values: IdentityValues = { identifier, password, confirmPassword };

  const identifierType = detectIdentifierType(identifier);
  const needsPassword = identifierType === 'EMAIL';

  function setFieldError(field: IdentityField, message: string | null) {
    setErrors((current) => {
      const next = { ...current };

      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }

      return next;
    });
  }

  // با شروع تایپ، خطای همان فیلد پاک می‌شود
  function clearFieldError(field: IdentityField) {
    if (errors[field]) {
      setFieldError(field, null);
    }
  }

  // با خروج از فیلدِ پرشده (یا بعد از اولین ارسال) دوباره بررسی می‌شود؛
  // پس مثلاً «یکسان نیست» همان لحظه‌ی خروج از فیلد تکرار رمز دیده می‌شود
  function handleBlur(field: IdentityField) {
    if (!submitted && !values[field]) {
      return;
    }

    setFieldError(field, validateIdentityField(field, values));
  }

  function handleChange(
    field: IdentityField,
    onChange: (value: string) => void
  ) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
      clearFieldError(field);

      // تغییر رمز، خطای «یکسان نیست» در فیلد تکرار را کهنه می‌کند
      if (field === 'password') {
        clearFieldError('confirmPassword');
      }
    };
  }

  function handleSubmit() {
    if (loading) {
      return;
    }

    setSubmitted(true);

    const nextErrors = validateIdentity(values);
    setErrors(nextErrors);

    const firstInvalid = identityFieldsFor(identifier).find(
      (field) => nextErrors[field]
    );

    if (firstInvalid) {
      fieldRefs[firstInvalid].current?.focus();
      return;
    }

    const type = detectIdentifierType(identifier);

    if (!type) {
      return;
    }

    onNext(normalizeIdentifier(identifier, type));
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <TextBox
          ref={identifierRef}
          type="text"
          id="signup-identifier"
          name="username"
          autoComplete="username"
          autoFocus={!startedWithIdentifier}
          placeholder="مثلاً ali@example.com یا 09121234567"
          value={identifier}
          disabled={loading}
          onChange={handleChange('identifier', onIdentifierChange)}
          onBlur={() => handleBlur('identifier')}
          floatingLabel="شماره تماس یا پست الکترونیکی"
          error={errors.identifier}
          reserveErrorSpace
          ltrInput
        />
      </div>

      {identifierType === 'PHONE' && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          با شماره موبایل فقط به کد تأیید پیامکی نیاز دارید. رمز عبور را بعداً
          می‌توانید در تنظیمات پروفایل تعیین کنید.
        </p>
      )}

      {needsPassword && (
        <>
          <PasswordField
            floatingLabel
            ref={passwordRef}
            label="رمز عبور"
            id="signup-password"
            name="new-password"
            autoComplete="new-password"
            autoFocus={startedWithIdentifier}
            placeholder="یک رمز قوی انتخاب کنید"
            value={password}
            disabled={loading}
            onChange={handleChange('password', onPasswordChange)}
            onBlur={() => handleBlur('password')}
            error={errors.password}
            reserveErrorSpace
            showStrength
            showRequirements
          />

          <PasswordField
            floatingLabel
            ref={confirmPasswordRef}
            label="تکرار رمز عبور"
            id="signup-confirm-password"
            name="confirm-password"
            autoComplete="new-password"
            placeholder="رمز عبور را دوباره وارد کنید"
            value={confirmPassword}
            disabled={loading}
            onChange={handleChange('confirmPassword', onConfirmPasswordChange)}
            onBlur={() => handleBlur('confirmPassword')}
            error={errors.confirmPassword}
            reserveErrorSpace
          />
        </>
      )}

      {children}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex-1 cursor-pointer rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          قبلی
        </button>

        <div className="flex-[2]">
          <Button type="submit" disabled={loading}>
            {loading ? 'در حال ارسال کد تأیید…' : 'ارسال کد تأیید'}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default IdentityStep;
