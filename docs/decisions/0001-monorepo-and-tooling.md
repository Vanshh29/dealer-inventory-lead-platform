# 0001 – Monorepo and tooling

**Status:** accepted

- **pnpm workspaces** (`apps/*`, `packages/*`): strict dependency isolation, fast installs, shared types without publishing.
- **`@dealer/shared` compiled to CommonJS** (`dist/`): NestJS runs CommonJS; Next.js consumes it via `transpilePackages`. Trade-off: shared must be built before dependents, handled by `pnpm -r` topological order and an explicit CI step.
- **ESLint flat config + typescript-eslint, Prettier** at the root; `no-explicit-any` is an error per the code standards.
- **Node 22 LTS** pinned in `.nvmrc`, used by Docker and CI.
- **Husky/lint-staged skipped** (optional in the brief); CI enforces the same checks.
- **Docker**: multi-stage builds; web uses Next `standalone` output for a small runtime image.
- **Version pins:** TypeScript `~5.9` (typescript-eslint does not support TS 7 yet) and NestJS `^11` (Nest 12 is ESM-only; the rest of the stack — Jest, Prisma client, swagger/graphql plugins — is simplest on CommonJS). Revisit when the ecosystem catches up.
