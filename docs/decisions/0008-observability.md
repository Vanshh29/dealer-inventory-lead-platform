# 0008 – Logging, metrics, health and error reporting

**Status:** accepted

## Decisions

| Concern            | Choice                                                                                                      | Why                                                                                                                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logs               | `nestjs-pino`: one JSON line per request, to stdout                                                         | Container platforms collect stdout; JSON is searchable. Request id per line (from a sane `x-request-id` or generated) so one request can be followed across lines and services.                            |
| What is not logged | Headers, query strings, bodies                                                                              | Cookies and tokens are secrets. Admin lead search puts names and emails in the query string, which is personal data under GDPR. A custom serializer logs method and path only; `redact` is a second guard. |
| Log noise          | `/health*` and `/metrics` are not logged                                                                    | Probes every few seconds would bury real traffic.                                                                                                                                                          |
| Log level          | 5xx error, 4xx warn, otherwise info                                                                         | So an alert on `level >= 50` means a server fault, not a typo in a URL.                                                                                                                                    |
| Metrics            | `prom-client`, own registry per app instance, `GET /metrics`                                                | The global registry throws when tests boot several apps.                                                                                                                                                   |
| Metric labels      | Route **pattern** (`/vehicles/:id`), method, status; unmatched paths share one label                        | Raw URLs or ids would create one time series per vehicle (cardinality explosion) and scanners would fill memory.                                                                                           |
| Metrics access     | Optional `METRICS_TOKEN` (bearer, constant-time compare); not rate limited, hidden from OpenAPI             | Metrics describe internals. Unset keeps local use simple; production must set it or block the path at the proxy.                                                                                           |
| Health             | `/health` liveness (no DB), `/health/ready` readiness (one cheap Prisma query, 503 on failure)              | A DB outage should take the instance out of rotation, not restart it in a loop. Using Prisma instead of `SELECT 1` keeps the "no raw SQL except search" rule.                                              |
| Errors             | `@sentry/node`, initialised only if `SENTRY_DSN` is set; only unexpected (non-HTTP) exceptions are captured | 4xx are client mistakes, not incidents. With no DSN nothing leaves the server. No tracing, no PII options.                                                                                                 |

## Known gaps

- Sentry covers the API only, not the Next.js app. Adding it is a separate decision (it affects bundle size and what browser data is sent).
- No dashboards or alert rules are shipped; the metrics are there to be scraped.
- Request ids are not yet forwarded from the web server to the API on server-side fetches.
- No distributed tracing.

## Ops notes

- No Prometheus configuration ships in this repository (docker-compose has none). When a scraper is added, set `METRICS_TOKEN` on the API and configure the job with `authorization: { type: Bearer, credentials: <same token> }`, or leave the token unset only on a private network.
- Error shape: an oversized JSON body (over 100 kb) answers 413 `PayloadTooLarge` and malformed JSON 400, both without a Sentry report; throttling answers 429 `TooManyRequests` ("Too many requests") with the `Retry-After` header.
