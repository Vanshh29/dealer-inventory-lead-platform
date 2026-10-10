# 0007 – Read-only GraphQL catalog

**Status:** accepted

## Decision

`POST /graphql` exposes two public queries, `vehicles(filter)` and `vehicle(id)`. Both call the existing `CatalogService`, the same code path as `GET /vehicles` and `GET /vehicles/:id`. The REST API is unchanged. The schema is code-first (`@nestjs/graphql` + Apollo Server), generated in memory.

## Why a thin layer over the same service

The point of the second API is to show that transport and domain logic are separate. Filters, full-text search, ranking and the "published only" rule live in one place. An integration test sends the same filters through both APIs and requires identical ids and totals.

## Safety limits

| Risk                  | Control                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Writes                | The schema has no `Mutation` or `Subscription` type. A validation rule (`queries-only.ts`) rejects them with a clear message instead of Apollo's generic internal error.                                                                                                                                                                                                             |
| Deeply nested queries | `depthLimit(6)` validation rule, written by hand (about 50 lines, unit tested). It follows fragments and tolerates cycles. The current schema is only 4 levels deep and has no recursive type, so today this is a guard for future schema changes (e.g. "similar vehicles"), not a fix for a present problem.                                                                        |
| Expensive queries     | `graphql-query-complexity`: each field costs 1; `vehicles` costs `limit x cost of the selected fields`. Budget 2,500. One full page of 100 vehicles with every field and all images is about 2,200 and passes; two of them (the usual alias trick) are rejected before any SQL runs. The estimate is conservative: the page-size factor also multiplies `page`, `limit` and `total`. |
| Oversized pages       | Same bounds as REST (`limit` 1 to 100, price/year/mileage ranges, `q` at most 100 characters), enforced by the global `ValidationPipe` on the input type. The input classes repeat REST's decorators because GraphQL needs its own; the tests exercise the boundaries.                                                                                                               |
| Abuse                 | Same global rate limit as REST. `ThrottlerGuard` reads the HTTP request, so a small subclass (`AppThrottlerGuard`) fetches it from the GraphQL context. Throttling counts resolver calls, so a query with several root fields counts several times.                                                                                                                                  |
| Error leaks           | No stack traces; unexpected errors are logged server-side and returned as "Internal server error".                                                                                                                                                                                                                                                                                   |
| CSRF                  | Apollo's `csrfPrevention` stays on: `GET /graphql` and form-style POSTs are refused. Only JSON POSTs (or requests with a preflight-triggering header) work. No cookies are used by this API anyway.                                                                                                                                                                                  |

## Choices and trade-offs

- **Nullable `vehicle(id)`:** an unknown or unpublished id returns `null`, which is idiomatic GraphQL. REST returns 404. A malformed id is an error.
- **Prices are `Int` cents**, not floats, as everywhere else. `status` is not exposed because only `PUBLISHED` vehicles are reachable.
- **Explicit `null` filters mean "not set"** (stripped in the resolver). Without that, `priceMin: null` would filter on `>= null`.
- **Introspection stays on**, and depth is not applied to it. The schema describes a public read-only catalog and the REST docs are public too. The Apollo landing page is disabled (it needs a relaxed CSP); use curl or any GraphQL client.
- **No DataLoader:** images come with the vehicle in one Prisma query, so there is no N+1 to fix. If vehicles gain relations resolved per item, add one.
- **Versions:** `@nestjs/graphql` and `@nestjs/apollo` 13.x (14 needs Nest 12), `@apollo/server` 5 with `@as-integrations/express5`, `graphql` 16. `pnpm` prints an unmet-peer warning from a transitive, unused Apollo 4 landing-page package inside `@nestjs/apollo`; it is not loaded.

## Not done

- Cursor pagination (the catalog is page/limit; this matches REST).
- Persisted queries and per-client cost accounting; unnecessary for a read-only public catalog at this size.
