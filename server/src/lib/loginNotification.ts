import { isIP } from 'node:net';
import { notifyUser } from './notifications';
import { logEvent } from './logger';

export function loginNotificationTitle(ip?: string): string {
  const normalized = ip?.startsWith('::ffff:') ? ip.slice(7) : ip;
  const address = normalized && isIP(normalized) ? normalized : 'نامشخص';
  return `ورود موفق به حساب شما · IP اتصال: ${address}`;
}

export async function notifyLogin(userId: string, ip?: string): Promise<void> {
  try {
    // req.ip follows Express trust-proxy configuration; never trust a raw forwarded header.
    await notifyUser(userId, loginNotificationTitle(ip), 'info');
  } catch (error) {
    // Notification delivery must not turn a successful login into an authentication failure.
    logEvent('error', 'login_notification_failed', error);
  }
}
