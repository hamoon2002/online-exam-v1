import { env } from '../../config/env';
import { sessionOrigin } from '../../middleware/sessionOrigin';
import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { AppError } from '../../lib/errors';
import {
  setRefreshCookie,
  clearRefreshCookie,
  getRefreshCookieName,
} from '../../lib/authTokens';
import { revokeSession } from '../../lib/session';
import { forceLogoutSession } from '../../realtime/socket';
import { refreshUserSession, resolveLogoutSubject } from './session.service';

const router = Router();

router.post(
  '/refresh',
  sessionOrigin(env.CLIENT_URL, env.NODE_ENV === 'development'),
  asyncHandler(async (req, res) => {
    try {
      const tokens = await refreshUserSession(
        req.cookies?.[getRefreshCookieName()],
      );
      setRefreshCookie(res, tokens.refreshToken, tokens.rememberMe);
      res.json({ accessToken: tokens.accessToken });
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 401) {
        clearRefreshCookie(res);
      }
      throw error;
    }
  }),
);

router.post(
  '/logout',
  sessionOrigin(env.CLIENT_URL, env.NODE_ENV === 'development'),
  asyncHandler(async (req, res) => {
    try {
      const session = await resolveLogoutSubject(req);
      if (session) {
        const revokedSessionId = await revokeSession(
          session.userId,
          session.sessionId,
        );
        if (revokedSessionId) {
          await forceLogoutSession(
            session.userId,
            revokedSessionId,
            'logged-out',
          );
        }
      }
    } finally {
      clearRefreshCookie(res);
    }
    res.json({ message: 'خارج شدی' });
  }),
);

export default router;
