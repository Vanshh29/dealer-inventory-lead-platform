# Architecture

Work in progress — filled in as phases land. Planned: system diagram, data model, index rationale (Phase 2), auth flow (Phase 1).

| Layer  | Tech                                         |
| ------ | -------------------------------------------- |
| Web    | Next.js App Router, React, Tailwind          |
| API    | NestJS (REST first, GraphQL read-only later) |
| DB     | PostgreSQL 16 (+ Prisma from Phase 1)        |
| Shared | `@dealer/shared` types and constants         |
