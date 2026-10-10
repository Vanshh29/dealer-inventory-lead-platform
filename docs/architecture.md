# Architecture

Work in progress — filled in as phases land. Planned: system diagram, data model, index rationale (Phase 2), auth flow (Phase 1).

| Layer  | Tech                                         |
| ------ | -------------------------------------------- |
| Web    | Next.js App Router, React, Tailwind          |
| API    | NestJS (REST first, GraphQL read-only later) |
| DB     | PostgreSQL 16 (+ Prisma from Phase 1)        |
| Shared | `@dealer/shared` types and constants         |

## Auth and RBAC (Phase 1)

```
Browser ──cookie: access_token (15m JWT)──▶ ThrottlerGuard ▶ JwtAuthGuard ▶ RolesGuard ▶ controller
        ──cookie: refresh_token (opaque, Path=/auth)──▶ POST /auth/refresh (rotates)
```

| Endpoint                                                           | Access                              |
| ------------------------------------------------------------------ | ----------------------------------- |
| `GET /health`, `POST /auth/login`, `/auth/refresh`, `/auth/logout` | public (login/refresh rate-limited) |
| `GET /auth/me`                                                     | any authenticated user              |
| `POST /users`, `GET /users`                                        | ADMIN                               |

Data model: `User(id, email unique, passwordHash, role, createdAt)`, `RefreshToken(id, userId, tokenHash unique, expiresAt, revokedAt)` with an index on `userId`. Rationale and trade-offs: `docs/decisions/0002-auth-and-rbac.md`.
