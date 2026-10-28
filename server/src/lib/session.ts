import { logEvent } from './logger';
import crypto from 'crypto';
import { redis } from './redis';
import { env } from '../config/env';
import { durationToSeconds } from './duration';
import { AppError } from './errors';

const sessionsKey = (userId: string) => `sessions:v2:${userId}`;
const legacySessionKey = (userId: string) => `session:${userId}`;
const legacyRotatedKey = (userId: string) => `session:${userId}:rotated`;
const rotationKeyPrefix = (userId: string) => `sessions:v2:${userId}:rotated:`;
const REFRESH_TTL_SECONDS = durationToSeconds(env.JWT_REFRESH_EXPIRES_IN);
const GRACE_WINDOW_SECONDS = 10;
const SESSION_STORE_TIMEOUT_MS = 2_000;
export const MAX_SESSIONS_PER_USER = 5;

export async function withSessionStore<T>(op: () => Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      op(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('session store timeout')),
          SESSION_STORE_TIMEOUT_MS,
        );
      }),
    ]);
  } catch (err) {
    logEvent('error', 'session store unavailable:', err);
    throw new AppError(503, 'سرویس نشست موقتاً در دسترس نیست');
  } finally {
    clearTimeout(timer);
  }
}

const LEGACY_MIGRATION_LUA = [
  "local legacy = redis.call('GET', KEYS[3])",
  'if legacy then',
  "  if not redis.call('ZSCORE', KEYS[1], legacy) then",
  "    local ttl = redis.call('TTL', KEYS[3])",
  '    if ttl < 1 then ttl = tonumber(ARGV[2]) end',
  "    redis.call('ZADD', KEYS[1], tonumber(ARGV[1]) + ttl, legacy)",
  '  end',
  "  local mappings = redis.call('HGETALL', KEYS[4])",
  '  for i = 1, #mappings, 2 do',
  "    local ttl = redis.call('TTL', KEYS[4])",
  '    if ttl < 1 then ttl = tonumber(ARGV[3]) end',
  "    redis.call('SET', ARGV[4] .. mappings[i], mappings[i + 1], 'EX', ttl)",
  '  end',
  "  redis.call('DEL', KEYS[3], KEYS[4])",
  'end',
].join('\n');

export const CREATE_SESSION_SCRIPT = [
  LEGACY_MIGRATION_LUA,
  "redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', tonumber(ARGV[1]))",
  "redis.call('ZADD', KEYS[1], tonumber(ARGV[1]) + tonumber(ARGV[2]), ARGV[5])",
  "while redis.call('ZCARD', KEYS[1]) > tonumber(ARGV[6]) do",
  "  local oldest = redis.call('ZRANGE', KEYS[1], 0, 0)",
  '  if #oldest == 0 then break end',
  "  redis.call('ZREM', KEYS[1], oldest[1])",
  'end',
  "redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))",
  'return ARGV[5]',
].join('\n');

export async function createSession(userId: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  const now = Date.now() / 1000;
  await withSessionStore(() =>
    redis.eval(CREATE_SESSION_SCRIPT, {
      keys: [
        sessionsKey(userId),
        rotationKeyPrefix(userId),
        legacySessionKey(userId),
        legacyRotatedKey(userId),
      ],
      arguments: [
        String(now),
        String(REFRESH_TTL_SECONDS),
        String(GRACE_WINDOW_SECONDS),
        rotationKeyPrefix(userId),
        sessionId,
        String(MAX_SESSIONS_PER_USER),
      ],
    }),
  );
  return sessionId;
}

export async function getActiveSessionId(
  userId: string,
): Promise<string | null> {
  const now = Date.now() / 1000;
  return withSessionStore(async () => {
    const key = sessionsKey(userId);
    await redis.zRemRangeByScore(key, '-inf', now);
    const sessions = await redis.zRange(key, 0, 0, { REV: true });
    return sessions[0] ?? null;
  });
}

export const VALIDATE_SESSION_SCRIPT = [
  LEGACY_MIGRATION_LUA,
  "redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', tonumber(ARGV[1]))",
  'local current = ARGV[5]',
  'for i = 1, 10 do',
  "  local expiry = redis.call('ZSCORE', KEYS[1], current)",
  '  if expiry and tonumber(expiry) > tonumber(ARGV[1]) then return 1 end',
  "  if expiry then redis.call('ZREM', KEYS[1], current) end",
  "  local nextSid = redis.call('GET', ARGV[4] .. current)",
  '  if not nextSid then return 0 end',
  '  current = nextSid',
  'end',
  'return 0',
].join('\n');

export async function isSessionValid(
  userId: string,
  sessionId: string,
): Promise<boolean> {
  const now = Date.now() / 1000;
  const result = await withSessionStore(() =>
    redis.eval(VALIDATE_SESSION_SCRIPT, {
      keys: [
        sessionsKey(userId),
        rotationKeyPrefix(userId),
        legacySessionKey(userId),
        legacyRotatedKey(userId),
      ],
      arguments: [
        String(now),
        String(REFRESH_TTL_SECONDS),
        String(GRACE_WINDOW_SECONDS),
        rotationKeyPrefix(userId),
        sessionId,
      ],
    }),
  );
  return Number(result) === 1;
}

export const ROTATE_SESSION_SCRIPT = [
  LEGACY_MIGRATION_LUA,
  "redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', tonumber(ARGV[1]))",
  'local current = ARGV[5]',
  'local followedAlias = false',
  'for i = 1, 10 do',
  "  local expiry = redis.call('ZSCORE', KEYS[1], current)",
  '  if expiry and tonumber(expiry) > tonumber(ARGV[1]) then',
  '    if followedAlias then return current end',
  "    redis.call('ZREM', KEYS[1], current)",
  "    redis.call('ZADD', KEYS[1], tonumber(ARGV[1]) + tonumber(ARGV[2]), ARGV[6])",
  "    redis.call('SET', ARGV[4] .. current, ARGV[6], 'EX', tonumber(ARGV[3]))",
  "    redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))",
  '    return ARGV[6]',
  '  end',
  "  if expiry then redis.call('ZREM', KEYS[1], current) end",
  "  local nextSid = redis.call('GET', ARGV[4] .. current)",
  '  if not nextSid then return false end',
  '  current = nextSid',
  '  followedAlias = true',
  'end',
  'return false',
].join('\n');

export async function rotateSessionWithGrace(
  userId: string,
  currentSessionId: string,
): Promise<string | null> {
  const candidateSessionId = crypto.randomUUID();
  const now = Date.now() / 1000;
  const result = await withSessionStore(() =>
    redis.eval(ROTATE_SESSION_SCRIPT, {
      keys: [
        sessionsKey(userId),
        rotationKeyPrefix(userId),
        legacySessionKey(userId),
        legacyRotatedKey(userId),
      ],
      arguments: [
        String(now),
        String(REFRESH_TTL_SECONDS),
        String(GRACE_WINDOW_SECONDS),
        rotationKeyPrefix(userId),
        currentSessionId,
        candidateSessionId,
      ],
    }),
  );
  return typeof result === 'string' && result.length > 0 ? result : null;
}

export const REVOKE_ONE_SESSION_SCRIPT = [
  LEGACY_MIGRATION_LUA,
  'local current = ARGV[5]',
  'for i = 1, 10 do',
  "  local expiry = redis.call('ZSCORE', KEYS[1], current)",
  '  if expiry and tonumber(expiry) > tonumber(ARGV[1]) then',
  "    redis.call('ZREM', KEYS[1], current)",
  "    redis.call('DEL', ARGV[4] .. current)",
  "    redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))",
  '    return current',
  '  end',
  "  if expiry then redis.call('ZREM', KEYS[1], current) end",
  "  local nextSid = redis.call('GET', ARGV[4] .. current)",
  '  if not nextSid then return false end',
  '  current = nextSid',
  'end',
  'return false',
].join('\n');

// With a SID, revoke only that logical device session (following its rotation aliases).
// Without a SID, revoke every device session for password reset or account rejection.
export async function revokeSession(
  userId: string,
  sessionId?: string,
): Promise<string | null> {
  if (!sessionId) {
    await withSessionStore(() =>
      redis.del([
        sessionsKey(userId),
        legacySessionKey(userId),
        legacyRotatedKey(userId),
      ]),
    );
    return null;
  }

  const now = Date.now() / 1000;
  const result = await withSessionStore(() =>
    redis.eval(REVOKE_ONE_SESSION_SCRIPT, {
      keys: [
        sessionsKey(userId),
        rotationKeyPrefix(userId),
        legacySessionKey(userId),
        legacyRotatedKey(userId),
      ],
      arguments: [
        String(now),
        String(REFRESH_TTL_SECONDS),
        String(GRACE_WINDOW_SECONDS),
        rotationKeyPrefix(userId),
        sessionId,
      ],
    }),
  );
  return typeof result === 'string' && result.length > 0 ? result : null;
}
