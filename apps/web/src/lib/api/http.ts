import { apiErrorSchema } from '@dealer/shared';
import type { ZodType } from 'zod';
import { ApiError, ContractError, NetworkError } from './errors';

export type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions<T> {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  query?: Query;
  /** JSON body. */
  body?: unknown;
  /** Multipart body (the browser sets the boundary header itself). */
  form?: FormData;
  /** Response contract. Omit for 204 / empty responses. */
  schema?: ZodType<T>;
  signal?: AbortSignal;
  /** Passed to fetch (Next.js caching/revalidation controls for server components). */
  init?: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } };
  /** @internal set on the retry after a token refresh. */
  retried?: boolean;
}

export interface HttpConfig {
  baseUrl: string;
  fetch?: typeof fetch;
  /** Extra headers per request, e.g. { cookie } when rendering on the server. */
  headers?: () => Record<string, string>;
  /**
   * Browser only: on a 401, try POST /auth/refresh once and replay the request. The refresh token
   * is an httpOnly cookie, so on the server there is nothing we could refresh with.
   */
  autoRefresh?: boolean;
}

export function buildUrl(baseUrl: string, path: string, query?: Query): string {
  const url = new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export interface Http {
  request<T = void>(path: string, options?: RequestOptions<T>): Promise<T>;
}

export function createHttp(config: HttpConfig): Http {
  const doFetch = config.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  // One refresh at a time: concurrent 401s share the same attempt (refresh tokens are single-use).
  let refreshing: Promise<boolean> | null = null;

  const refresh = (): Promise<boolean> => {
    refreshing ??= doFetch(buildUrl(config.baseUrl, '/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
    return refreshing;
  };

  async function request<T>(path: string, o: RequestOptions<T> = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json', ...config.headers?.() };
    let body: BodyInit | undefined;
    if (o.form) {
      body = o.form;
    } else if (o.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(o.body);
    }

    let res: Response;
    try {
      res = await doFetch(buildUrl(config.baseUrl, path, o.query), {
        ...o.init,
        method: o.method ?? 'GET',
        headers,
        body,
        credentials: 'include',
        signal: o.signal,
      });
    } catch (cause) {
      throw new NetworkError(cause);
    }

    // Never try to refresh for /auth/* itself: a failed login must stay a failed login.
    if (res.status === 401 && config.autoRefresh && !o.retried && !path.startsWith('/auth/')) {
      if (await refresh()) return request<T>(path, { ...o, retried: true });
    }

    if (!res.ok) {
      const parsed = apiErrorSchema.safeParse(await res.json().catch(() => null));
      throw new ApiError(res.status, parsed.success ? parsed.data : null);
    }
    if (!o.schema) return undefined as T;

    const json: unknown = await res.json().catch(() => undefined);
    const result = o.schema.safeParse(json);
    if (!result.success) {
      throw new ContractError(
        path,
        result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
      );
    }
    return result.data;
  }

  return { request };
}
