# 0006 – Frontend architecture and the back-office lead view

**Status:** accepted

## Lead view: table first (kanban deliberately not built yet)

**Decision:** the lead back office is a **filterable table + lead detail page**, with a status summary on the dashboard. A kanban board is a possible later addition, not the primary view.

Reasoning, in order of weight:

1. **Our pipeline is rule-constrained, which fits drag-and-drop badly.** A lead can only move along `NEW → CONTACTED → TEST_DRIVE → OFFER → WON`, with `LOST` from any open state; WON/LOST are final (`docs/decisions/0004`). On a board, most drop targets would be invalid for a given card, and a move to WON/LOST should ask for confirmation. The detail page shows exactly the allowed next actions (`allowedTransitions` from the API), which is clearer.
2. **Accessibility cost.** WCAG 2.2 criterion 2.5.7 (Dragging Movements, level AA) requires a non-drag alternative for any drag interaction; kanban boards are the textbook example, with "move to…" menus as the usual answer. So a board needs a table-like fallback anyway; a table does not need a board.
3. **What staff do all day is find, sort and work through enquiries** (new ones first, mine, by customer or car). That is search + filter + list. The table supports it directly: status chips, name/email search, pagination, newest first, deep-linkable URLs.
4. **Market evidence (limited, see below):** CRM products usually offer both a list and a board; the lists are described as the tool for finding and working through individual records, boards for seeing where deals pile up. German marketplace tooling for dealers (mobile.de, AutoScout24, lead-management tools like Autaxo) is described as an _inbox/centralised lead management_ with prioritisation and follow-up automation, i.e. an inbox-style list rather than a board.
5. **Cost/benefit for this project:** same value for a smaller, fully tested surface. The board's one real advantage (seeing the distribution across stages) is covered by the dashboard's per-status counters, which link to the filtered table.

**Honest limits of the research.** I searched the web once per question. I found vendor documentation and trade press, **not** independent surveys of how dealerships split their usage between list and board views. The conclusion above rests mainly on the domain rules (1, 2, 3), not on market statistics. A product-owner interview or usage data would be the real tiebreaker.

**If a board is added later:** same data source (`GET /admin/leads?status=`), one column per status, a "Move to…" menu per card as the primary control (satisfies 2.5.7), drag as an optional enhancement, and moves still go through `PATCH …/status` so the server rules stay the single authority.

Sources: Work Truck Solutions deals pipeline overview (list vs. pipeline views); Monument lead board docs (list/board toggle); AUTOHAUS articles on mobile.de lead management update and AutoScout24 LeadAssistent; Autaxo 7.0 release notes (central lead inbox); WCAG 2.2 SC 2.5.7 explanations (BOIA, ADA Compliance Pros, WWU accessibility guide).

## Architecture

- **Next.js App Router.** Public catalog and vehicle pages are **server components** (SEO, fast first paint, work without JavaScript: filters are a plain GET form and pagination is links). The back office is **client-rendered** behind a session gate: it is behind login (no SEO), highly interactive, and every call is authorised by the API anyway.
- **State lives in the URL** (filters, sort, page) for both the catalog and the admin tables: shareable, back-button friendly, no client state library needed.
- **Auth in the browser:** `SessionProvider` asks `GET /auth/me` on load. Anonymous → redirect to `/admin/login?next=…` (`next` is validated to stay inside `/admin`, no open redirect). Role checks in the UI (`canWorkLeads`, `canManageVehicles`) only hide controls; the server enforces the same rules and tests prove it.
- **Caching:** public data is cached by Next for `CATALOG_REVALIDATE_SECONDS` (default 30 s; facets 300 s). Trade-off: an unpublished/deleted car can remain visible for that long. Fix options if it matters: on-demand revalidation (`revalidateTag`) triggered from the API.
- **Details worth knowing:** the loading skeleton is scoped to the catalog _list_ with a route group; a `loading.tsx` above the detail route made unknown cars answer HTTP 200 instead of 404 (soft 404). Home is rendered per request because the API is not reachable while the Docker image builds. `/auth/me` returning 401 for logged-out visitors is expected and the only tolerated HTTP error in the browser tests.
- **Money:** integer cents end to end; people type euros ("15.999,90"), converted by string arithmetic (`lib/money.ts`), never through floats.
- **Plain `<img>`** instead of `next/image`: images come from the API (uploads) or a placeholder host; image optimisation would need remote-host config and a loader. Revisit with a CDN.
- **Server-side endpoints added for the UI:** `GET /vehicles/facets` (filter dropdowns), `GET /admin/stats` (dashboard counts in one request instead of ten).

## Accessibility

Semantic landmarks and a skip link; every control labelled; field errors tied with `aria-describedby`/`aria-invalid` and focus moves to the first invalid field; status is never colour-only (always a text badge); keyboard-operable gallery; honeypot hidden from assistive tech and the tab order. Verified with automated axe-core checks (WCAG 2.0–2.2 A/AA) on public and back-office pages in a real browser, including a canary test proving the checker detects defects. Automated checks cover only part of accessibility; no manual screen-reader pass has been done.

## Tests

- Component tests (Testing Library + user-event): lead form (validation, honeypot, errors), cards, gallery, pagination, filters, leads table states (loading/empty/error/retry), status actions by role, login (incl. open-redirect guard), vehicle form (money), shell (auth gate).
- Browser tests (Playwright, real stack, `e2e/`): browse + filter + paginate, detail + gallery + 404, submit lead, login failure, full sales pipeline (NEW→WON, assign, note), admin audit history, viewer read-only (also refused by the API), vehicle create/edit/photo/delete, logout. Every test fails on console errors, uncaught exceptions, failed requests or unexpected HTTP error responses.
