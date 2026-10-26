import type { RequestHandler } from 'express';
import { isCodespacesFrontendRequest } from '../lib/codespacesOrigin';

// Cookie mutations require the configured frontend origin, even on same-site subdomains.
export function sessionOrigin(
  clientUrl: string,
  allowCodespacesDevelopment = false,
): RequestHandler {
  const allowed = new URL(clientUrl).origin;
  return (req, res, next) => {
    const origin = req.get('Origin');
    const allowedCodespacesOrigin =
      allowCodespacesDevelopment &&
      isCodespacesFrontendRequest(origin, req.hostname);
    if (origin !== allowed && !allowedCodespacesOrigin) {
      res
        .status(403)
        .json({ error: 'مبدأ درخواست معتبر نیست؛ صفحه را تازه‌سازی کنید.' });
      return;
    }
    next();
  };
}
