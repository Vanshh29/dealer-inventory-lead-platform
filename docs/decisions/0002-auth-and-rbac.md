# 0002 – Authentication and RBAC

**Status:** accepted

- **Passwords:** argon2id (`argon2` package). Minimum 12 characters, maximum 128 (bounds hashing cost).
- **Access token:** short-lived (15 min) signed JWT in an `httpOnly` cookie. Carries `sub`, `email`, `role`; role changes apply at next login/refresh. Trade-off: no DB hit per request.
- **Refresh token:** opaque 48-byte random value, **not** a JWT. Stored only as a SHA-256 hash in `RefreshToken`, so it can be revoked server-side and a DB leak does not expose live sessions. Cookie is scoped to `Path=/auth`. Hence no `JWT_REFRESH_SECRET`.
- **Rotation + reuse detection:** every refresh revokes the used token and issues a new one. Replaying a revoked token revokes all of that user's active sessions (assumes theft).
- **Cookies:** `httpOnly`, `SameSite=Lax`, `Secure` in production (override with `COOKIE_SECURE=false` only for the local plain-HTTP Docker demo; Safari refuses Secure cookies on http://localhost). `Lax` plus JSON-only bodies and a CORS allow-list is the CSRF defence for this first version; revisit (CSRF token or `Strict`) if the web app and API end up on different sites.
- **No user enumeration:** unknown email and wrong password return the identical 401 body, and a dummy argon2 verification equalises timing.
- **Registration:** none publicly. `POST /users` is ADMIN-only; the seed script creates the first users.
- **Guards:** `JwtAuthGuard` is global (secure by default; `@Public()` opts out), `RolesGuard` is global and reads `@Roles(...)`. Order: throttler → JWT → roles. 401 = not authenticated, 403 = authenticated but not allowed.
- **Rate limiting:** `@nestjs/throttler`, in-memory. 5 requests/min/IP on login and refresh (`AUTH_RATE_LIMIT`), 300/min globally. In-memory storage is per-instance; use a Redis store when running multiple API replicas.
- **Prisma 6** (not 7): `package.json#prisma` seed config prints a deprecation warning; migrate to `prisma.config.ts` when moving to Prisma 7.
- **Tests:** unit tests for `AuthService`; integration tests boot the real app against a real PostgreSQL test DB (`dealer_test`) and cover the full role matrix, token expiry/tampering, rotation, reuse detection, logout and rate limiting.
