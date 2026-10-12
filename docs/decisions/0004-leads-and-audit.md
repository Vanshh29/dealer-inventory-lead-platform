# 0004 – Leads pipeline and audit trail

**Status:** accepted

## Public submission (`POST /leads`)

- No login, but: rate limit (5/min/IP by default, `LEAD_RATE_LIMIT`), 100 kB body limit, strict validation (unknown fields rejected, so `status`/`assignedToId` can't be smuggled in), message ≤ 2000 chars.
- **Honeypot:** the `website` field is invisible to humans in the form; if filled, the request is dropped **but answered with the same `201 { received: true }`**, so bots get no signal to adapt to. Logged without personal data.
- Only `PUBLISHED` vehicles accept leads; unknown, draft and sold all give the same 404.
- Response contains no internal ids.
- **Not done (known limits):** CAPTCHA, e-mail verification, duplicate detection (same email + vehicle within 24 h), IP is the rate-limit key (in-memory, per instance; Redis store for multiple replicas). Reasonable next steps if spam appears.

## Pipeline rules

```
NEW → CONTACTED → TEST_DRIVE → OFFER → WON
 └────────┴────────────┴─────────┴──→ LOST      (WON and LOST are terminal)
CONTACTED may also jump straight to OFFER.
```

- The rules live in `@dealer/shared` (`LEAD_TRANSITIONS`), enforced by the API; each lead response carries `allowedTransitions` so the UI never duplicates them.
- Invalid move → **409 Conflict** with the allowed targets in the message (state conflict, not malformed input). Terminal leads can't be re-opened; a "reopen" would be an explicit ADMIN feature with its own audit action.
- **Concurrency:** compare-and-set (`UPDATE … WHERE id = ? AND status = <what we read>`). If someone else moved the lead first, the second request gets 409 instead of silently overwriting. Test: WON vs LOST fired concurrently, exactly one wins.

## Permissions

- Read leads and notes: any logged-in role. VIEWER is strictly read-only.
- Change status, assign, add notes: SALES and ADMIN. Audit log: ADMIN only.
- Assignee must be an existing SALES or ADMIN user (never a VIEWER). Notes are append-only (no edit/delete), which keeps the history trustworthy.

## Audit log

- `AuditLog(actorId, action, entity, entityId, metadata JSON, createdAt)`; **no foreign keys** on purpose, so the trail outlives deleted vehicles and users. `actorId = null` means the system/public visitor.
- Written **inside the same database transaction** as the change (`record(entry, tx)`), so there is never a change without a record or a record of a change that failed. Tests assert that rejected operations leave no entries.
- Records: `LEAD_CREATED`, `LEAD_STATUS_CHANGED {from,to}`, `LEAD_ASSIGNED {from,to}`, `LEAD_NOTE_ADDED` (note id only, **not** the text), `VEHICLE_CREATED`, `VEHICLE_UPDATED {changes: field → {from,to}}`, `VEHICLE_DELETED`, `VEHICLE_IMAGE_ADDED/REMOVED`. No-op updates write nothing.
- Read via `GET /admin/audit-logs?entity=&entityId=&actorId=` (paginated, newest first). Indexed by `(entity, entityId, createdAt)` and `(actorId, createdAt)`.
- Trade-off: audit rows live in the same database, so a DB admin could alter them; tamper-evidence (hash chain, or shipping to append-only storage) is out of scope.

## Personal data (GDPR, relevant for a German dealership)

Leads hold a name, e-mail, optional phone and a free-text message. Mitigations in place: minimal fields, no personal data in logs, notes not copied into the audit trail, access limited to authenticated staff. The public form now requires explicit consent (see below). **Not implemented** (would be needed before real use): a retention/deletion job (e.g. delete closed leads after N months), and a data-subject export/erasure procedure.

## Data model choices

- `Lead.vehicleId` is nullable with `ON DELETE SET NULL`, so deleting a vehicle never destroys sales history (tested). `assignedToId` also `SET NULL`.
- Indexes: `(status, createdAt)` for the board/list filtered by status, `(assignedToId, status)` for "my leads", `(vehicleId)`, `(createdAt)`; notes `(leadId, createdAt)`.
- Name/e-mail search uses case-insensitive `contains` (sequential scan). Fine for the expected volume of leads; a `pg_trgm` GIN index is the upgrade path.

## Lead source, consent and response time (addendum)

- `Lead.source` (`WEB` default, `PHONE`, `MARKETPLACE`, `OTHER`) and optional `utmSource/utmMedium/utmCampaign`. The public form always creates `WEB` leads; the UTM values come from the landing URL (`utm_*`), are trimmed and capped at 100 characters.
- **Consent:** `POST /leads` requires `consent: true` (anything else is 400) and stores the server time as `consentAt`. Leads created before this change have `consentAt = null`. The form shows the privacy notice sentence next to a required checkbox; a dedicated privacy page is still to be written.
- **First response:** `firstRespondedAt` is set by `changeStatus` the first time a lead leaves `NEW` (to `CONTACTED` or `LOST`), in the same transaction and compare-and-set update as the audit entry; later changes never move it. Existing leads are not backfilled.
- **`GET /admin/stats`** keeps `leads` and `vehicles` and adds `firstResponse { averageHours, medianHours, sampleSize }` (leads answered in the last 30 days, one decimal, `null` when none), `overdueLeads` (status `NEW`, older than 24 hours) and `leadsBySource` (every source present, 0 if none). The medians are computed in the API from the 30-day window rather than in SQL; fine at this volume.

## SEO endpoints (web)

- `/sitemap.xml` (`app/sitemap.ts`): home, `/vehicles` and every published vehicle detail URL, read through the public catalog API (revalidated hourly). If the API is unreachable only the two static routes are returned.
- `/robots.txt` (`app/robots.ts`): allows everything except `/admin` and points at the sitemap.
- `VehicleJsonLd` (`components/vehicle-jsonld.tsx`) renders schema.org `Car` + `Offer` JSON-LD (EUR price from `priceCents`, mileage, VIN, model year, fuel, availability from the vehicle status). `<` is escaped in the serialised JSON so vehicle text cannot close the script tag.
- Absolute URLs use `NEXT_PUBLIC_SITE_URL` (fallback `http://localhost:3000`); set it in production.
