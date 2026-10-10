# Dealer Inventory & Lead Platform

Full-stack used-car dealer platform: public catalog, lead capture, and an admin back office.
TypeScript end to end — Next.js, NestJS, PostgreSQL, Prisma (from Phase 1), Docker, GitHub Actions.

> Status: **Phase 0 (foundation)**.

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

- Web: http://localhost:3000
- API health: http://localhost:4000/health

## Local development

Requires Node 22 and pnpm 9 (`corepack enable`).

```bash
pnpm install
pnpm --filter @dealer/shared build
pnpm --filter @dealer/api start:dev   # API on :4000
pnpm --filter @dealer/web dev         # Web on :3000
```

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Layout

`apps/web` · `apps/api` · `packages/shared` · `docs/` (architecture, decision records)
