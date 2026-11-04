import { ApiError } from '../../lib/apiClient';
import type { MeResponse, User } from './auth.types';

export function userFromMe(data: MeResponse): User {
  return {
    id: data.id,
    role: data.role,
    name: data.name ?? undefined,
    username: data.username ?? undefined,
    onboardingCompleted: data.onboardingCompleted,
    organizationName: data.organizationName ?? undefined,
    avatarUrl: data.avatarUrl ?? undefined,
  };
}

export function messageOf(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) {
      return 'ارتباط با API قطع است. در Codespaces باید بک‌اند روی پورت ۴۰۰۰ اجرا باشد.';
    }
    return err.message;
  }
  return 'خطای غیرمنتظره‌ای رخ داد';
}

export function captchaRequiredOf(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  const body = err.body as { captchaRequired?: boolean } | null;
  return body?.captchaRequired === true;
}
