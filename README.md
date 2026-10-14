# Carvio

**Dealer inventory and lead platform.** A public catalog with full-text search, lead capture, and a role-based back office to work the lead pipeline. TypeScript end to end: Next.js, NestJS, PostgreSQL + Prisma, REST (OpenAPI) and a read-only GraphQL layer, Docker, GitHub Actions.

**Live demo: <https://carvio-self.vercel.app>.** Browse the catalog, open a car and send an enquiry (please use made-up details). The staff back office is at `/admin`; its logins on the hosted demo are private and are not the local demo passwords documented below.

![Home page](docs/screenshots/home.png)

![Catalog with filters](docs/screenshots/catalog.png)

| Vehicle page and enquiry form                          | Back office leads table                          |
| ------------------------------------------------------ | ------------------------------------------------ |
| ![Vehicle detail](docs/screenshots/vehicle-detail.png) | ![Leads table](docs/screenshots/leads-table.png) |

## Architecture

```mermaid
flowchart LR
  V([Visitor]) --> W
  S([Staff: ADMIN / SALES / VIEWER]) --> W
  subgraph Docker Compose
    W["web<br/>Next.js (SSR + client back office)"] -- "REST, cookies" --> A
    A["api<br/>NestJS"] --> DB[("PostgreSQL 16<br/>tsvector + GIN")]
    A --> U[("uploads volume<br/>StorageService")]
  end
  V -. "REST / GraphQL (read-only)" .-> A
  P([Prometheus]) -. "/metrics" .-> A
  A -. "errors, if SENTRY_DSN" .-> SE([Sentry])
```

Inside the API: global guards (rate limit, JWT, roles) protect every route unless it is marked `@Public()`. REST controllers and the GraphQL resolver call the same services; only the services touch Prisma. Details and the reasoning behind each choice: [`docs/architecture.md`](docs/architecture.md) and [`docs/decisions/`](docs/decisions).

## Key design decisions

- **Secure by default:** every route needs a login unless marked public; roles are enforced in server guards, the UI only hides things. Refresh tokens are single-use with reuse detection ([0002](docs/decisions/0002-auth-and-rbac.md)).
- **Search in PostgreSQL**, not a separate engine: a generated `tsvector` column with a GIN index, plus filters. Measured timings are in the architecture doc ([0003](docs/decisions/0003-vehicles-and-search.md)).
- **Leads are a state machine:** allowed transitions are defined once in `@dealer/shared`; changes use compare-and-set and write an audit entry in the same transaction ([0004](docs/decisions/0004-leads-and-audit.md)).
- **One contract, checked on both sides:** zod response schemas shared by API tests and the web client ([0005](docs/decisions/0005-typed-api-client.md)).
- **Lead view is a table, not a kanban** ([0006](docs/decisions/0006-frontend-and-lead-view.md)).
- **GraphQL is a thin read-only view** of the catalog service, with depth and cost limits ([0007](docs/decisions/0007-graphql-catalog.md)).
- **Observability without leaking data:** JSON logs without cookies or query strings, low-cardinality metrics, optional Sentry ([0008](docs/decisions/0008-observability.md)).
- Money is integer cents everywhere.

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

- Web: http://localhost:3000
- API health: http://localhost:4000/health (liveness) and `/health/ready` (needs the database)
- Prometheus metrics: http://localhost:4000/metrics
- API docs (Swagger UI): http://localhost:4000/api/docs
- GraphQL (read-only catalog, `POST`): http://localhost:4000/graphql, see `docs/architecture.md` for an example
- Staff back office: http://localhost:3000/admin (demo logins below)

The API applies migrations on start. Seed demo data: three users (admin/sales/viewer `@carvio.test`, password `Passw0rd!Passw0rd!`, **local use only**; the hosted demo uses different, private passwords) 240 vehicles (`SEED_VEHICLES=n`) and 40 demo leads (`SEED_LEADS=n`). Safe to run repeatedly:

```bash
docker compose exec api ./node_modules/.bin/tsx prisma/seed.ts
```

## Local development

Requires Node 22 and pnpm 9 (`corepack enable`).

```bash
pnpm install
pnpm --filter @dealer/shared build
docker compose up -d db
export DATABASE_URL='postgresql://dealer:dealer_dev_password@localhost:5432/dealer?schema=public'
export JWT_ACCESS_SECRET='dev-only-change-me-dev-only-change-me'
pnpm --filter @dealer/api db:migrate && pnpm --filter @dealer/api db:seed
pnpm --filter @dealer/api start:dev   # API on :4000
pnpm --filter @dealer/web dev         # Web on :3000
```

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:int   # integration tests; needs Postgres on localhost:5432 with a `dealer_test` database
pnpm --filter @dealer/api test:int:cov   # same, with a coverage report (fails below 80%)
```

Create the test database once: `docker compose exec db psql -U dealer -d dealer -c 'CREATE DATABASE dealer_test'`.

## Try the API

```bash
curl 'http://localhost:4000/vehicles?q=golf&fuel=DIESEL&sort=price_asc&limit=5'
curl -c jar -H 'content-type: application/json' -d '{"email":"admin@carvio.test","password":"Passw0rd!Passw0rd!"}' http://localhost:4000/auth/login
curl -b jar http://localhost:4000/admin/vehicles?status=DRAFT
# submit a lead (public), then work it as sales
curl -H 'content-type: application/json' -d '{"vehicleId":"<id of a published vehicle>","name":"Erika","email":"e@example.com","message":"Still available?"}' http://localhost:4000/leads
curl -b jar 'http://localhost:4000/admin/leads?status=NEW'
curl -b jar -X PATCH -H 'content-type: application/json' -d '{"status":"CONTACTED"}' http://localhost:4000/admin/leads/<lead id>/status
```

Search performance numbers (measured, with caveats): `docs/architecture.md`.

## Using the site

- **Public:** `/` search and latest cars · `/vehicles` catalog with filters, sorting and pagination (state is in the URL) · `/vehicles/<id>` photos, specs and the enquiry form.
- **Back office** (`/admin`, log in with `admin@carvio.test`, `sales@carvio.test` or `viewer@carvio.test`, local password `Passw0rd!Passw0rd!`; the hosted demo's logins are private): dashboard with pipeline counts · **Leads** table (filter by status, search, open a lead to change status, assign, add notes; admins also see its history) · **Vehicles** (create, edit, photos, delete: admin only).
- Roles: ADMIN everything · SALES works leads and notes, reads vehicles · VIEWER read-only. The server enforces this; the UI only hides what you cannot do.

## Hosted demo

The live demo runs on free tiers of three services:

| Part | Where | Notes |
| --- | --- | --- |
| Website (Next.js) | Vercel | Calls `/backend/*` on its own domain; Next forwards that to the API, so login cookies stay first-party |
| API (NestJS, Docker) | Render | Free instances sleep when idle, so the first visit after a quiet period can take 30-60 seconds |
| Database (PostgreSQL) | Neon | Reached through Neon's connection pooler |

Settings (names only; values are kept in each service's dashboard and never committed):

- **Vercel:** `NEXT_PUBLIC_API_URL` (the site's own `/backend` path), `NEXT_PUBLIC_SITE_URL`, `API_INTERNAL_URL`, `API_PROXY_TARGET`. `NEXT_PUBLIC_*` values are baked in at build time, so redeploy after changing them.
- **Render:** `DATABASE_URL`, `JWT_ACCESS_SECRET`, `CORS_ORIGIN`, `COOKIE_SECURE`, `REFRESH_COOKIE_PATH` (`/backend/auth` behind the proxy) and `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1`. The last one is needed because Prisma's migration lock times out through a connection pooler.

Staff passwords on the hosted demo are not the local seed defaults. Seeding only creates users and never overwrites an existing password, so change a hosted password in the database, not by re-running the seed.

## Browser tests (Playwright)

They drive the real stack in Chromium and fail on any console error or unexpected HTTP error.

```bash
cp -n .env.example .env
# the tests sign in many times a minute and want uncached data:
printf 'AUTH_RATE_LIMIT=100\nLEAD_RATE_LIMIT=100\nCATALOG_REVALIDATE_SECONDS=0\n' >> .env
docker compose up --build -d
docker compose exec api ./node_modules/.bin/tsx prisma/seed.ts
pnpm exec playwright install chromium      # once
pnpm test:e2e
```

## Observability

- **Logs:** one JSON line per request (pino) with a request id (`x-request-id`, kept if the caller sends a sane one). Cookies, tokens, query strings and bodies are never logged. `LOG_LEVEL` sets the level; pipe through `pino-pretty` for colours.
- **Metrics:** `GET /metrics` (Prometheus text format): request duration histogram by method, route _pattern_ and status, plus Node process metrics. Set `METRICS_TOKEN` in production and give the scraper the same bearer token.
- **Health:** `/health` says the process is up; `/health/ready` also checks the database (503 if it fails). Docker Compose uses the latter.
- **Sentry:** only when `SENTRY_DSN` is set; reports unexpected (5xx) errors, not 4xx.

## CI

`.github/workflows/ci.yml` has two jobs. `verify`: install, lint, typecheck, unit tests, integration tests against a Postgres service with a coverage gate (80%), build. `e2e` (after `verify`): `docker compose up --wait`, seed, Playwright in Chromium, with the report uploaded on failure.

## Regenerating screenshots

With the stack running and seeded: `pnpm --filter @dealer/e2e screenshots`.

## Layout

`apps/web` · `apps/api` · `packages/shared` · `docs/` (architecture, decision records)
