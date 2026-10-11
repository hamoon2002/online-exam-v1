import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../../lib/asyncHandler';
import { badRequest } from '../../../lib/errors';
import { authEntryLimiter } from '../../../middleware/rateLimiters';
import { resolveAuthEntry } from './entry.service';
const router = Router();
const schema = z.object({ identifier: z.string().trim().min(3).max(254) });
router.post(
  '/entry',
  authEntryLimiter,
  asyncHandler(async (req, res) => {
    const input = schema.safeParse(req.body);
    if (!input.success)
      throw badRequest('شماره تماس یا پست الکترونیکی معتبر نیست');
    res.setHeader('Cache-Control', 'no-store');
    res.json(await resolveAuthEntry(input.data.identifier));
  }),
);
export default router;
