import { env } from '../config/env';
import { createManagedRedis } from './redisConnection';

// Keep a dedicated connection for the distributed rate limiter.
export const rateLimitRedis = createManagedRedis(env.REDIS_URL, 'rate-limit');
