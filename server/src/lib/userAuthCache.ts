import { prisma } from './prisma';
import { redis } from './redis';

export type UserAuthSnapshot = {
  role: 'SuperAdmin' | 'Instructor' | 'Student';
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
};

const AUTH_CACHE_TTL_SECONDS = 30;
const GENERATION_TTL_SECONDS = 30 * 24 * 60 * 60;
const generationKey = (userId: string) =>
  'authz:user:' + userId + ':generation';
const snapshotKey = (userId: string, generation: string) =>
  'authz:user:' + userId + ':snapshot:' + generation;

function parseSnapshot(value: string): UserAuthSnapshot | null | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed === null) return null;
    if (!parsed || typeof parsed !== 'object') return undefined;

    const row = parsed as Record<string, unknown>;
    const validRole = ['SuperAdmin', 'Instructor', 'Student'].includes(
      String(row.role),
    );
    const validApproval = ['Pending', 'Approved', 'Rejected'].includes(
      String(row.approvalStatus),
    );
    if (!validRole || !validApproval) return undefined;

    return {
      role: row.role as UserAuthSnapshot['role'],
      approvalStatus: row.approvalStatus as UserAuthSnapshot['approvalStatus'],
    };
  } catch {
    return undefined;
  }
}

/**
 * Cache only authorization fields; generation changes make stale cache fills
 * unreachable.
 */
export async function getUserAuthSnapshot(
  userId: string,
): Promise<UserAuthSnapshot | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const versionKey = generationKey(userId);
    const generation = (await redis.get(versionKey)) ?? '0';
    const key = snapshotKey(userId, generation);
    const cached = await redis.get(key);

    if (cached !== null) {
      const parsed = parseSnapshot(cached);
      const currentGeneration = (await redis.get(versionKey)) ?? '0';
      if (currentGeneration !== generation) continue;
      if (parsed !== undefined) return parsed;
      await redis.del(key);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, approvalStatus: true },
    });

    const currentGeneration = (await redis.get(versionKey)) ?? '0';
    if (currentGeneration !== generation) continue;

    const snapshot: UserAuthSnapshot | null = user
      ? { role: user.role, approvalStatus: user.approvalStatus }
      : null;
    await redis.set(key, JSON.stringify(snapshot), {
      EX: AUTH_CACHE_TTL_SECONDS,
    });
    return snapshot;
  }

  throw new Error('account authorization changed during lookup');
}

const INVALIDATE_AUTH_CACHE_SCRIPT = [
  "local generation = redis.call('INCR', KEYS[1])",
  "redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))",
  'return generation',
].join('; ');

export async function invalidateUserAuthCache(userId: string): Promise<void> {
  await redis.eval(INVALIDATE_AUTH_CACHE_SCRIPT, {
    keys: [generationKey(userId)],
    arguments: [String(GENERATION_TTL_SECONDS)],
  });
}
