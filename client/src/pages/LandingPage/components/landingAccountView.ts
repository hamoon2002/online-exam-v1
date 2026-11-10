import type { User } from '../../../api/authApi';

export type LandingAccountView =
  | { status: 'pending' }
  | { status: 'guest' }
  | {
      status: 'authenticated';
      user: User;
      displayName: string;
      roleName: string;
      dashboardPath: '/workspace' | '/dashboard';
    };

export function getLandingAccountView({
  user,
  isSessionReady,
}: {
  user: User | null;
  isSessionReady: boolean;
}): LandingAccountView {
  // Never reveal a cached profile or flash signup actions before session validation.
  if (!isSessionReady) return { status: 'pending' };
  if (!user) return { status: 'guest' };

  const roleName = {
    SuperAdmin: 'کاربر ارشد',
    Instructor: 'مدرس',
    Student: 'دانشجو',
  }[user.role];

  return {
    status: 'authenticated',
    user,
    displayName: user.name?.trim() || user.username?.trim() || 'کاربر',
    roleName,
    dashboardPath: user.role === 'Student' ? '/dashboard' : '/workspace',
  };
}
