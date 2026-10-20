import * as Sentry from '@sentry/node';
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from '@prometheus-io/client';
import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

let reportingEnabled = false;
export function configureErrorReporting(dsn: string, environment: string) {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment,
    defaultIntegrations: false,
    sendDefaultPii: false,
    maxBreadcrumbs: 0,
    beforeSend(event) {
      // Retain stack locations, not SQL, request bodies, tokens or provider messages.
      delete event.request;
      delete event.user;
      delete event.extra;
      delete event.contexts;
      delete event.breadcrumbs;
      if (event.exception?.values)
        for (const value of event.exception.values)
          value.value = 'Operational error; inspect private server logs';
      delete event.message;
      return event;
    },
  });
  reportingEnabled = true;
}
export function reportOperationalError(error: unknown) {
  if (reportingEnabled && error instanceof Error)
    Sentry.captureException(error);
}
export async function flushErrorReporting() {
  if (reportingEnabled) await Sentry.flush(2000);
}

export function createMetrics(token: string) {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });
  const requests = new Counter({
    name: 'exam_http_requests_total',
    help: 'Completed HTTP requests',
    labelNames: ['method', 'status'],
    registers: [registry],
  });
  const duration = new Histogram({
    name: 'exam_http_request_duration_seconds',
    help: 'HTTP response duration',
    labelNames: ['method'],
    buckets: [0.05, 0.1, 0.3, 1, 3, 10],
    registers: [registry],
  });
  const observe: RequestHandler = (req, res, next) => {
    const method = [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
      'HEAD',
    ].includes(req.method)
      ? req.method
      : 'OTHER';
    const end = duration.startTimer({ method });
    res.once('finish', () => {
      requests.inc({ method, status: String(res.statusCode) });
      end();
    });
    next();
  };
  const serve: RequestHandler = async (req, res, next) => {
    const actual = Buffer.from(req.get('Authorization') ?? '');
    const expected = Buffer.from(`Bearer ${token}`);
    if (!token) {
      res.sendStatus(404);
      return;
    }
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      res.sendStatus(403);
      return;
    }
    try {
      res
        .set('Cache-Control', 'no-store')
        .type(registry.contentType)
        .send(await registry.metrics());
    } catch (error) {
      next(error);
    }
  };
  return { observe, serve };
}
