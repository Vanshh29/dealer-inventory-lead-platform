/** @jest-environment node */
import { z } from 'zod';
import { ApiError, ContractError, NetworkError, describeError } from './errors';
import { buildUrl, createHttp } from './http';

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
  });

type Call = { url: string; init: RequestInit };

function setup(responses: (Response | Error)[], config: { autoRefresh?: boolean } = {}) {
  const calls: Call[] = [];
  const queue = [...responses];
  const fetchMock = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = queue.shift();
    if (!next) throw new Error(`unexpected fetch ${String(url)}`);
    if (next instanceof Error) throw next;
    return next;
  }) as unknown as typeof fetch;
  const http = createHttp({ baseUrl: 'http://api.test', fetch: fetchMock, ...config });
  return { http, calls };
}

const itemSchema = z.object({ id: z.string() });

describe('buildUrl', () => {
  it('serialises query params and skips empty values', () => {
    const url = buildUrl('http://api.test', '/vehicles', {
      q: 'golf gti',
      page: 2,
      make: '',
      fuel: undefined,
      mileageMax: 0,
      flag: false,
      none: null,
    });
    expect(url).toBe('http://api.test/vehicles?q=golf+gti&page=2&mileageMax=0&flag=false');
  });

  it('works with a trailing slash on the base URL', () => {
    expect(buildUrl('http://api.test/', '/health')).toBe('http://api.test/health');
  });

  it('keeps a path prefix on the base, as used behind the /backend proxy', () => {
    expect(buildUrl('https://site.test/backend', '/auth/login')).toBe(
      'https://site.test/backend/auth/login',
    );
  });
});

describe('request', () => {
  it('sends credentials, JSON body and content type, and returns validated data', async () => {
    const { http, calls } = setup([json(200, { id: 'a' })]);
    const out = await http.request('/x', { method: 'POST', body: { a: 1 }, schema: itemSchema });
    expect(out).toEqual({ id: 'a' });
    expect(calls[0].init.credentials).toBe('include');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.body).toBe('{"a":1}');
    expect((calls[0].init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json',
    );
  });

  it('does not set Content-Type for FormData (the runtime adds the multipart boundary)', async () => {
    const { http, calls } = setup([json(200, { id: 'a' })]);
    const form = new FormData();
    form.append('file', new Blob(['x']), 'a.png');
    await http.request('/upload', { method: 'POST', form, schema: itemSchema });
    expect(calls[0].init.body).toBe(form);
    expect((calls[0].init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  it('adds per-request headers (cookie forwarding on the server)', async () => {
    const calls: Call[] = [];
    const http = createHttp({
      baseUrl: 'http://api.test',
      headers: () => ({ cookie: 'access_token=abc' }),
      fetch: (async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        return json(204);
      }) as unknown as typeof fetch,
    });
    await http.request('/admin/leads');
    expect((calls[0].init.headers as Record<string, string>).cookie).toBe('access_token=abc');
  });

  it('handles 204 without a schema', async () => {
    const { http } = setup([json(204)]);
    await expect(http.request('/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('maps API error bodies to ApiError with status helpers and validation details', async () => {
    const body = {
      statusCode: 400,
      error: 'BadRequest',
      message: 'Validation failed',
      details: ['email must be an email'],
    };
    const { http } = setup([json(400, body)]);
    const err = await http.request('/x').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.details).toEqual(['email must be an email']);
    expect(describeError(err)).toBe('email must be an email');
  });

  it.each([
    [401, 'isUnauthorized'],
    [403, 'isForbidden'],
    [404, 'isNotFound'],
    [409, 'isConflict'],
    [429, 'isRateLimited'],
  ] as const)('status %i sets %s', async (status, flag) => {
    const { http } = setup([json(status, { statusCode: status, error: 'E', message: 'm' })]);
    const err = (await http.request('/x').catch((e) => e)) as ApiError;
    expect(err[flag]).toBe(true);
  });

  it('copes with non-JSON error bodies (e.g. a proxy 502)', async () => {
    const { http } = setup([new Response('<html>Bad gateway</html>', { status: 502 })]);
    const err = (await http.request('/x').catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.body).toBeNull();
    expect(describeError(err)).toMatch(/our side/);
  });

  it('wraps fetch failures in NetworkError', async () => {
    const { http } = setup([new TypeError('fetch failed')]);
    const err = await http.request('/x').catch((e) => e);
    expect(err).toBeInstanceOf(NetworkError);
    expect(describeError(err)).toMatch(/reach the server/);
  });

  it('rejects responses that violate the shared schema with a ContractError', async () => {
    const { http } = setup([json(200, { id: 123 })]);
    const err = await http.request('/x', { schema: itemSchema }).catch((e) => e);
    expect(err).toBeInstanceOf(ContractError);
    expect(err.issues[0]).toMatch(/^id:/);
  });
});

describe('automatic token refresh (browser mode)', () => {
  const unauthorized = () =>
    json(401, { statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired token' });

  it('refreshes once on 401 and replays the request', async () => {
    const { http, calls } = setup(
      [unauthorized(), json(200, { id: 'ok' }), json(200, { id: 'a' })],
      { autoRefresh: true },
    );
    const out = await http.request('/admin/leads', { schema: itemSchema });
    expect(out).toEqual({ id: 'a' });
    expect(calls.map((c) => c.url)).toEqual([
      'http://api.test/admin/leads',
      'http://api.test/auth/refresh',
      'http://api.test/admin/leads',
    ]);
    expect(calls[1].init.method).toBe('POST');
  });

  it('throws the original 401 when the refresh fails, and does not loop', async () => {
    const { http, calls } = setup([unauthorized(), unauthorized()], { autoRefresh: true });
    const err = (await http.request('/admin/leads').catch((e) => e)) as ApiError;
    expect(err.isUnauthorized).toBe(true);
    expect(calls).toHaveLength(2);
  });

  it('retries only once even if the replay is also 401', async () => {
    const { http, calls } = setup([unauthorized(), json(200, {}), unauthorized()], {
      autoRefresh: true,
    });
    const err = (await http.request('/admin/leads').catch((e) => e)) as ApiError;
    expect(err.isUnauthorized).toBe(true);
    expect(calls).toHaveLength(3);
  });

  it('shares one refresh between concurrent 401s (refresh tokens are single-use)', async () => {
    const calls: string[] = [];
    let refreshes = 0;
    const attempts = new Map<string, number>();
    const http = createHttp({
      baseUrl: 'http://api.test',
      autoRefresh: true,
      fetch: (async (url: string) => {
        calls.push(url);
        if (url.endsWith('/auth/refresh')) {
          refreshes++;
          await new Promise((r) => setTimeout(r, 10));
          return json(200, {});
        }
        const n = (attempts.get(url) ?? 0) + 1;
        attempts.set(url, n);
        return n === 1 ? unauthorized() : json(200, { id: url });
      }) as unknown as typeof fetch,
    });
    const [a, b, c] = await Promise.all([
      http.request('/admin/a', { schema: itemSchema }),
      http.request('/admin/b', { schema: itemSchema }),
      http.request('/admin/c', { schema: itemSchema }),
    ]);
    expect([a.id, b.id, c.id]).toEqual([
      'http://api.test/admin/a',
      'http://api.test/admin/b',
      'http://api.test/admin/c',
    ]);
    expect(refreshes).toBe(1);
  });

  it('never refreshes for /auth/* (a wrong password must stay a wrong password)', async () => {
    const { http, calls } = setup([unauthorized()], { autoRefresh: true });
    const err = (await http
      .request('/auth/login', { method: 'POST', body: {} })
      .catch((e) => e)) as ApiError;
    expect(err.isUnauthorized).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it('does not refresh when autoRefresh is off (server rendering)', async () => {
    const { http, calls } = setup([unauthorized()]);
    await http.request('/admin/leads').catch(() => undefined);
    expect(calls).toHaveLength(1);
  });
});
