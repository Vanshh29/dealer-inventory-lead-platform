import { Writable } from 'node:stream';
import { IncomingMessage, ServerResponse } from 'node:http';
import pino from 'pino';
import { loggerParams, requestId } from './logger';

const opts = () => loggerParams().pinoHttp as { serializers: any; redact: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- pino-http option bag

describe('request logging', () => {
  it('logs method, path and status but never the query string', () => {
    const { serializers } = opts();
    expect(
      serializers.req({ id: 'r1', method: 'GET', url: '/admin/leads?q=erika%40example.com' }),
    ).toEqual({
      id: 'r1',
      method: 'GET',
      url: '/admin/leads',
    });
    expect(serializers.res({ statusCode: 404, getHeaders: () => ({ 'set-cookie': 'x' }) })).toEqual(
      {
        statusCode: 404,
      },
    );
  });

  it('redacts cookies and tokens if a raw request is ever logged', () => {
    const lines: string[] = [];
    const sink = new Writable({
      write(chunk: Buffer, _enc, done) {
        lines.push(chunk.toString());
        done();
      },
    });
    pino({ redact: opts().redact }, sink).info({
      req: { headers: { cookie: 'access_token=SECRET', authorization: 'Bearer SECRET' } },
      res: { headers: { 'set-cookie': 'refresh_token=SECRET' } },
    });
    expect(lines.join('')).not.toContain('SECRET');
    expect(lines.join('')).toContain('[redacted]');
  });

  describe('request id', () => {
    const res = () => {
      const headers: Record<string, string> = {};
      return {
        headers,
        setHeader: (k: string, v: string) => (headers[k] = v),
      } as unknown as ServerResponse & {
        headers: Record<string, string>;
      };
    };
    const req = (id?: string) =>
      ({ headers: id ? { 'x-request-id': id } : {} }) as unknown as IncomingMessage;

    it('keeps a sane id from the caller and echoes it', () => {
      const r = res();
      expect(requestId(req('abc-123'), r)).toBe('abc-123');
      expect(r.headers['x-request-id']).toBe('abc-123');
    });

    it.each(['has space', 'x'.repeat(65), 'line\nbreak', '<script>'])('replaces %j', (bad) => {
      const id = requestId(req(bad), res());
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('generates an id when none is sent', () => {
      expect(requestId(req(), res())).toMatch(/^[0-9a-f-]{36}$/);
    });
  });
});
