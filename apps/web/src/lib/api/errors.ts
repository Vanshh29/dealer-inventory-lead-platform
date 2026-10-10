import type { ApiErrorBody } from '@dealer/shared';

/** The API answered with a non-2xx status. `body` is null if the response was not our error JSON. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody | null,
  ) {
    super(body?.message ?? `Request failed with status ${status}`);
    this.name = 'ApiError';
  }

  /** One message per violated validation rule (400 responses). */
  get details(): string[] {
    return this.body?.details ?? [];
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
  get isForbidden(): boolean {
    return this.status === 403;
  }
  get isNotFound(): boolean {
    return this.status === 404;
  }
  get isConflict(): boolean {
    return this.status === 409;
  }
  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

/** The request never produced a response: offline, DNS failure, CORS, aborted. */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super('Could not reach the server');
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

/** The API answered 2xx but the body does not match the shared schema (client/server version skew). */
export class ContractError extends Error {
  constructor(
    readonly path: string,
    readonly issues: string[],
  ) {
    super(`Unexpected response shape from ${path}`);
    this.name = 'ContractError';
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

/** Text that is safe to show a user for any failure. */
export function describeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.isRateLimited) return 'Too many requests. Please wait a moment and try again.';
    if (e.status >= 500) return 'Something went wrong on our side. Please try again later.';
    return e.details.length > 0 ? e.details.join(' · ') : e.message;
  }
  if (e instanceof NetworkError) return 'Could not reach the server. Check your connection.';
  return 'Something went wrong. Please try again.';
}
