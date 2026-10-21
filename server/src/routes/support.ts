import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { RedisRateLimitStore } from '../lib/redisRateLimitStore';
import { rateLimitRedis } from '../lib/rateLimitRedis';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import { asyncHandler } from '../lib/asyncHandler';
import { notFound, badRequest } from '../lib/errors';
import {
  assistantAnswer,
  assistantConfig,
  assistantInput,
} from '../lib/supportAssistant';
const router = Router();
const limit = (name: string, max: number, global = false) =>
  rateLimit({
    store: new RedisRateLimitStore(rateLimitRedis, name),
    windowMs: 60 * 1000,
    max,
    passOnStoreError: false,
    standardHeaders: true,
    legacyHeaders: false,
    ...(global ? { keyGenerator: () => 'global' } : {}),
    message: { error: 'تعداد پیام‌ها زیاد است؛ یک دقیقه بعد تلاش کنید.' },
  });
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
router.get('/assistant', (_req, res) => res.json(assistantConfig()));
const dailyLimit = rateLimit({
  store: new RedisRateLimitStore(rateLimitRedis, 'assistant-daily'),
  windowMs: 24 * 60 * 60 * 1000,
  max: z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .parse(process.env.ASSISTANT_DAILY_LIMIT || '100'),
  keyGenerator: () => 'global',
  skip: () => !assistantConfig().remote,
  passOnStoreError: false,
  message: { error: 'سهمیهٔ روزانهٔ دستیار تمام شده؛ از پشتیبان کمک بگیرید.' },
});
router.post(
  '/assistant',
  dailyLimit,
  limit('assistant-ip', 10),
  limit('assistant-global', 60, true),
  asyncHandler(async (req, res) => {
    const input = assistantInput.parse(req.body);
    if (assistantConfig().remote && !input.consent)
      throw badRequest(
        'برای ارسال متن به سرویس هوش مصنوعی، موافقت شما لازم است.',
      );
    res.json(await assistantAnswer(input.message));
  }),
);
router.use(requireAuth);
router.get(
  '/threads',
  requireRole('SuperAdmin'),
  asyncHandler(async (req, res) => {
    const page = z.coerce
      .number()
      .int()
      .min(0)
      .max(10000)
      .parse(req.query.page ?? 0);
    res.json(
      await prisma.supportThread.findMany({
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: page * 30,
        take: 30,
        include: { user: { select: { name: true, username: true } } },
      }),
    );
  }),
);
router.get(
  '/mine',
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.supportThread.findUnique({
        where: { userId: req.user!.sub },
      }),
    );
  }),
);
async function access(id: string, sub: string, role: string) {
  const thread = await prisma.supportThread.findFirst({
    where: { id, ...(role === 'SuperAdmin' ? {} : { userId: sub }) },
  });
  if (!thread) throw notFound('گفت‌وگو پیدا نشد');
  return thread;
}
router.get(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    await access(req.params.id, req.user!.sub, req.user!.role);
    const before = z.string().datetime().optional().parse(req.query.before);
    const messages = await prisma.supportMessage.findMany({
      where: {
        threadId: req.params.id,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    res.json(messages.reverse());
  }),
);
const messageSchema = z
  .object({
    body: z.string().trim().min(1).max(2000),
    clientId: z.string().uuid(),
  })
  .strict();
router.post(
  '/:id/messages',
  limit('support-message', 20),
  asyncHandler(async (req, res) => {
    const input = messageSchema.parse(req.body);
    const staff = req.user!.role === 'SuperAdmin';
    const thread =
      req.params.id === 'mine'
        ? await prisma.supportThread.upsert({
            where: { userId: req.user!.sub },
            create: { userId: req.user!.sub },
            update: {},
          })
        : await access(req.params.id, req.user!.sub, req.user!.role);
    await prisma.$transaction(async (tx) => {
      const result = await tx.supportMessage.createMany({
        data: [{ ...input, threadId: thread.id, fromStaff: staff }],
        skipDuplicates: true,
      });
      if (result.count)
        await tx.supportThread.update({
          where: { id: thread.id },
          data: {
            status: staff ? 'replied' : 'waiting',
            updatedAt: new Date(),
          },
        });
    });
    res.status(201).json({ id: thread.id });
  }),
);
router.patch(
  '/:id',
  requireRole('SuperAdmin'),
  asyncHandler(async (req, res) => {
    const { status } = z
      .object({ status: z.enum(['closed', 'waiting']) })
      .strict()
      .parse(req.body);
    await access(req.params.id, req.user!.sub, req.user!.role);
    res.json(
      await prisma.supportThread.update({
        where: { id: req.params.id },
        data: { status },
      }),
    );
  }),
);
export default router;
