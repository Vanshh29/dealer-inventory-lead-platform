import { createApiClient, type ApiClient } from './client';

export * from './errors';
export { createApiClient, type ApiClient } from './client';
export { buildUrl } from './http';

const isBrowser = typeof window !== 'undefined';

/** Where the browser reaches the API (also used to build image URLs). Inlined at build time. */
export const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Where *this process* reaches the API. In the browser that is the public URL. On the Next.js
 * server inside Docker the API is only reachable by its service name, hence API_INTERNAL_URL.
 */
export const API_URL = isBrowser
  ? PUBLIC_API_URL
  : (process.env.API_INTERNAL_URL ?? PUBLIC_API_URL);

/**
 * Client for client components and for public server components (catalog).
 * Browser: cookies are sent automatically and an expired session is refreshed transparently.
 */
export const api: ApiClient = createApiClient({ baseUrl: API_URL, autoRefresh: isBrowser });

/**
 * Client for server components that call the back office: forwards the visitor's cookies.
 *   const api = serverApi((await cookies()).toString());
 */
export const serverApi = (cookieHeader: string): ApiClient =>
  createApiClient({
    baseUrl: API_URL,
    autoRefresh: false,
    headers: () => ({ cookie: cookieHeader }),
  });

/** Image URLs from the API are relative to the API origin; the browser needs the public origin. */
export function assetUrl(url: string): string {
  return url.startsWith('/') ? `${PUBLIC_API_URL}${url}` : url;
}
export type { Stats, LeadSource } from '@dealer/shared';
