# 0005 – Typed API client and response contracts

**Status:** accepted

## Decision

Response shapes are defined once as **zod schemas in `@dealer/shared`** (`api-schemas.ts`). TypeScript types are inferred from them. The web app uses a small hand-written client (`apps/web/src/lib/api`) that validates every response against those schemas. The API's integration tests parse real responses with the same schemas (`apps/api/test/contract.int.spec.ts`).

## Why not generate the client from the OpenAPI spec?

The project brief allows either. I evaluated generation (e.g. `openapi-typescript`) and chose against it for now:

- Controllers return Prisma-typed values. `@nestjs/swagger` cannot infer response schemas from those, so a generated client would type every response as `unknown` until each endpoint is annotated with a response DTO class (a lot of duplication of the Prisma shapes).
- With shared zod schemas the contract is **checked on both sides**: the server in tests, the client at runtime. A generated client only protects the compile-time half.
- Trade-off accepted: new endpoints need a schema + client method written by hand. If the API grows a lot, annotating DTOs and generating becomes worth it; the schemas would then become the thing the generator is checked against.

## Client behaviour

- `createApiClient(config)` is a factory (injectable `fetch`), so it is unit-tested without a server. `api` is the ready-made instance; `serverApi(cookieHeader)` forwards the visitor's cookies for server components calling the back office.
- **Two base URLs:** `NEXT_PUBLIC_API_URL` for the browser (and image URLs); `API_INTERNAL_URL` for the Next.js server inside Docker, where the API is only reachable by service name.
- **Auth:** httpOnly cookies via `credentials: 'include'` (JS never sees tokens). In the browser, a 401 triggers one `POST /auth/refresh` and a single replay. Concurrent 401s share one refresh (refresh tokens are single-use, so parallel refreshes would trip reuse detection and log the user out). Never for `/auth/*` and never on the server.
- **Errors are typed:** `ApiError` (status helpers, validation `details`), `NetworkError` (no response), `ContractError` (2xx but wrong shape = version skew). `describeError()` yields user-safe text and never leaks server internals for 5xx.
- Responses tolerate extra fields (rolling deploys); sensitive-field leaks are guarded by API tests instead.
- Money stays integer cents end to end; `formatEuro()` from shared is the only formatter.
- Honeypot: `leads.submit` always sends `website: ""`; the form must render that input hidden from humans and assistive tech.

## Verified

Unit tests (33 in the web app, run with `pnpm test`), the API contract tests, and a live run of the real client against the Docker stack (login, typed search, invalid transition → `ApiError 409`, transparent refresh after the access cookie was dropped, logout → 401).
