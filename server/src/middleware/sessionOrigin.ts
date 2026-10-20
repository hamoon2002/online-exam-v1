import type { RequestHandler } from 'express';

// Cookie mutations require the configured frontend origin, even on same-site subdomains.
export function sessionOrigin(clientUrl: string): RequestHandler {
  const allowed = new URL(clientUrl).origin;
  return (req, res, next) => {
    const origin = req.get('Origin');
    if (origin !== allowed) {
      res
        .status(403)
        .json({ error: 'مبدأ درخواست معتبر نیست؛ صفحه را تازه‌سازی کنید.' });
      return;
    }
    next();
  };
}
