import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Params } from 'nestjs-pino';

const REQUEST_ID = /^[\w.-]{1,64}$/;

/** Keep a caller's request id if it is sane (traceability across services); otherwise make one. */
export function requestId(req: IncomingMessage, res: ServerResponse): string {
  const given = req.headers['x-request-id'];
  const id = typeof given === 'string' && REQUEST_ID.test(given) ? given : randomUUID();
  res.setHeader('x-request-id', id);
  return id;
}

/**
 * One JSON line per request (pino). What is deliberately NOT logged: headers (cookies and tokens),
 * query strings (admin lead search puts people's names and emails there) and bodies.
 */
export function loggerParams(): Params {
  return {
    pinoHttp: {
      level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
      genReqId: requestId,
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url.split('?')[0],
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      // Second line of defence if someone ever logs a raw request or response.
      redact: {
        paths: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
        censor: '[redacted]',
      },
      autoLogging: {
        // Probes and scrapes every few seconds would drown the real traffic.
        ignore: (req) => req.url === '/metrics' || (req.url ?? '').startsWith('/health'),
      },
      customLogLevel: (_req, res, err) =>
        err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
    },
  };
}
