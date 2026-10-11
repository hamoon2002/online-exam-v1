import { prisma } from '../../../lib/prisma';
import { badRequest } from '../../../lib/errors';
import { resolveIdentifier } from '../auth.helpers';

// Only navigation information is public; no profile, role or approval state is returned.
export async function resolveAuthEntry(identifier: string) {
  const resolved = resolveIdentifier(identifier);
  if (!resolved) throw badRequest('شماره تماس یا پست الکترونیکی معتبر نیست');
  const user = await prisma.user.findFirst({
    where:
      resolved.type === 'EMAIL'
        ? { email: resolved.value }
        : { phone: resolved.value },
    select: { id: true, emailVerifiedAt: true, phoneVerifiedAt: true },
  });
  const verified =
    resolved.type === 'EMAIL' ? user?.emailVerifiedAt : user?.phoneVerifiedAt;
  return {
    identifier: resolved.value,
    next: !verified
      ? ('signup' as const)
      : resolved.type === 'PHONE'
        ? ('otp' as const)
        : ('password' as const),
  };
}
