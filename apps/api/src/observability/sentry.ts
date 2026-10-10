import * as Sentry from '@sentry/node';

/** Off unless SENTRY_DSN is set. No PII options are enabled, so the SDK's defaults apply. */
export function initSentry(): boolean {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    tracesSampleRate: 0, // errors only; tracing would be a separate, deliberate decision
  });
  return true;
}
