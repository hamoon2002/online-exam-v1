import {
  detectIdentifierType,
  validateIdentifier,
} from '../../utils/identifier';

import { PASSWORD_REGEX } from './signup.types';

export type IdentityField = 'identifier' | 'password' | 'confirmPassword';

export type IdentityValues = Record<IdentityField, string>;

export type IdentityErrors = Partial<Record<IdentityField, string>>;

// ترتیب نمایش فیلدها؛ فوکوس بعد از ارسال روی اولین فیلد خطادار می‌رود
export const IDENTITY_FIELD_ORDER: IdentityField[] = [
  'identifier',
  'password',
  'confirmPassword',
];

// ثبت‌نام با ایمیل رمز می‌خواهد؛ با موبایل فقط کد یکبارمصرف لازم است
export function identityFieldsFor(identifier: string): IdentityField[] {
  return detectIdentifierType(identifier) === 'EMAIL'
    ? IDENTITY_FIELD_ORDER
    : ['identifier'];
}

// پیام خطای کوتاه برای یک فیلد؛ null یعنی مقدار درست است
export function validateIdentityField(
  field: IdentityField,
  values: IdentityValues
): string | null {
  switch (field) {
    case 'identifier':
      return validateIdentifier(values.identifier);

    case 'password':
      if (!values.password) {
        return 'رمز عبور را وارد کنید';
      }

      if (values.password.length > 72) return 'رمز نباید بیشتر از ۷۲ کاراکتر باشد';
      // جزئیات شرط‌ها در چک‌لیست زیر فیلد دیده می‌شود
      return PASSWORD_REGEX.test(values.password)
        ? null
        : 'رمز عبور شرایط لازم را ندارد';

    case 'confirmPassword':
      if (!values.confirmPassword) {
        return 'تکرار رمز عبور را وارد کنید';
      }

      return values.confirmPassword === values.password
        ? null
        : 'با رمز عبور بالا یکسان نیست';
  }
}

// فقط فیلدهایی که برای این نوع شناسه لازم‌اند را هم‌زمان بررسی می‌کند
export function validateIdentity(values: IdentityValues): IdentityErrors {
  const errors: IdentityErrors = {};

  for (const field of identityFieldsFor(values.identifier)) {
    const message = validateIdentityField(field, values);

    if (message) {
      errors[field] = message;
    }
  }

  return errors;
}
