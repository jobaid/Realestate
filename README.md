# Azim Realty — Phase 1 (Foundation)

A production-track real estate platform. **Phase 1** ships a runnable foundation:
Docker Compose + Postgres + Go API + React/Vite public site with listings,
details, buy/rent/sold pages, search filters, and real DB-backed data.

Later phases add admin auth, image upload, inquiries, dashboard, roles, and prod
hardening. See **Roadmap** below.

---

## Quick start (local)

```bash
cd real-estate
cp .env.example .env         # edit secrets before anything real
docker compose up --build
```

- Frontend: http://localhost:5173
- API:      http://localhost:8080/api/v1/properties
- Health:   http://localhost:8080/healthz
- DB:       localhost:5432 (user/pw/db from `.env`)

**Important:** before first `docker compose up`, generate `backend/go.sum`:
```bash
cd backend
go mod tidy          # requires Go 1.23+
```

### Dev without Docker (optional)

```bash
# Postgres
docker run --name re-pg -e POSTGRES_USER=realestate -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=realestate -p 5432:5432 -d postgres:16-alpine
psql ... -f backend/migrations/001_init.sql
psql ... -f backend/migrations/002_seed.sql

# Backend
cd backend && go run ./cmd/server

# Frontend
cd frontend && npm install && npm run dev
```

---

## Project layout

```
real-estate/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── go.mod
│   ├── cmd/server/main.go
│   ├── internal/{config,db,models,handlers,routes}/
│   └── migrations/{001_init.sql,002_seed.sql}
└── frontend/
    ├── Dockerfile  nginx.conf
    ├── package.json  vite.config.ts  tailwind.config.js
    └── src/{components,pages,lib}/
```

## Phase 1 API

| Method | Path                               | Purpose                                |
|--------|------------------------------------|----------------------------------------|
| GET    | /healthz                           | liveness                               |
| GET    | /api/v1/properties                 | list + filters + pagination + sort     |
| GET    | /api/v1/properties/featured        | featured listings (max 6)              |
| GET    | /api/v1/properties/recent          | latest 8                               |
| GET    | /api/v1/properties/sold            | recently sold (24)                     |
| GET    | /api/v1/properties/:slug           | details by SEO slug                    |

Supported query params on `/properties`:
`listing_type, property_type, city, state, zip_code, min_price, max_price, bedrooms, bathrooms, sort (newest|price_asc|price_desc), page, page_size`.

Only `status IN ('available','pending')` **and** `published_at IS NOT NULL` leak
to the public API. Drafts/off-market never appear. Sold properties are served
only by `/sold`.

## Security baseline (Phase 1)

- Parameterized SQL (pgx), no string-concat queries.
- CORS restricted to `CORS_ORIGIN`.
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.
- `JWT_SECRET` enforced ≥32 chars at boot.
- No secrets in frontend code or container images.
- Non-root user in backend container (planned Phase 6).
- Per-connection pool limits; request timeouts; graceful shutdown.

Phase 2 adds: bcrypt, JWT auth, refresh tokens, rate limits, upload validation,
RBAC, audit logs.

## Roadmap

| Phase | Scope |
|------:|-------|
| 1 | **Done.** Foundation: DB, API, public site, search, details, sold. |
| 2 | **Done.** Admin login (bcrypt + JWT + refresh), property CRUD, image upload w/ MIME+size check. |
| 3 | **Done.** Inquiries (public form → DB → admin inbox), favorites. |
| 4 | **Done.** Admin dashboard (stats, charts), company settings, roles (Super Admin / Admin / Listing Manager). |
| 5 | **Done.** SEO (sitemap, robots, OG, structured data), caching, performance. |
| 6 | **Done.** Production hardening: rate limits, audit logs, Swagger, prod Dockerfile, TLS/HSTS, backups, deployment guide. |

## Phase 2: Admin panel

### Bootstrap the first admin

```bash
cd backend
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='min-8-chars' ADMIN_NAME='Your Name' \
  go run ./cmd/bootstrap
```

Idempotent: re-running updates the password for that email. Role is
`super_admin`. Do **not** commit real admin credentials. `JWT_SECRET` in
`.env` must be a cryptographically random string ≥32 chars for production.

If the database predates Phase 2, apply the new migration once:
```bash
psql "postgres://USER:PW@localhost:5432/realestate" -f backend/migrations/003_phase2.sql
```
(Fresh `docker compose up` applies it automatically via initdb.)

### Admin UI

- `/admin/login` — email + password sign-in.
- `/admin` — property table: search, status filter, pagination,
  publish/unpublish, edit, soft-delete.
- `/admin/properties/new` and `/admin/properties/:id/edit` — full property
  form with multi-photo upload (JPEG/PNG/WebP, 8 MB max, server-side MIME
  sniffing via content detection, random filenames).

### Phase 2 API

| Method | Path                                   | Auth | Purpose                          |
|--------|----------------------------------------|------|----------------------------------|
| POST   | /api/v1/auth/login                     | —    | returns access + refresh tokens  |
| POST   | /api/v1/auth/refresh                   | —    | rotates refresh, new access      |
| POST   | /api/v1/auth/logout                    | —    | revokes refresh token            |
| GET    | /api/v1/auth/me                        | JWT  | current user                     |
| GET    | /api/v1/admin/properties               | JWT  | all incl. drafts, filter/search  |
| POST   | /api/v1/admin/properties               | JWT  | create (+images, publish flag)   |
| GET    | /api/v1/admin/properties/:id           | JWT  | fetch one by id                  |
| PUT    | /api/v1/admin/properties/:id           | JWT  | update (+replace images)         |
| DELETE | /api/v1/admin/properties/:id           | JWT  | soft delete + unpublish          |
| POST   | /api/v1/admin/properties/:id/publish   | JWT  | make visible                     |
| POST   | /api/v1/admin/properties/:id/unpublish | JWT  | hide from public site            |
| POST   | /api/v1/admin/uploads/image            | JWT  | multipart image upload           |

Auth notes: access tokens are HS256 JWTs (15 min TTL); refresh tokens are
opaque 256-bit values stored **hashed** (SHA-256) in `refresh_tokens`, rotated
on every refresh, revocable, 30-day TTL. Admin writes are recorded in
`audit_logs`. Uploaded files are served from `/uploads/` with random hex names.

## Phase 3: Inquiries & Favorites

Apply the new migration if upgrading an existing DB:
```bash
psql "postgres://USER:PW@localhost:5432/realestate" -f backend/migrations/004_phase3.sql
```

### Public

- Inquiry form on every property detail page (pre-fills a showing request).
- `/contact` — general inquiry form with office info.
- Heart icon on property cards and details — saves to a client-side list.
- `/favorites` — view & manage saved properties; header shows the count.

### Admin inbox

- `/admin/inquiries` — filter by status (`new`, `in_progress`, `responded`, `archived`, `spam`). Sidebar shows unread badge; polls every 60s.
- `/admin/inquiries/:id` — read message, change status, save internal notes, reply via `mailto:`, delete.

### Phase 3 API

| Method | Path                                | Auth | Purpose                             |
|--------|-------------------------------------|------|-------------------------------------|
| POST   | /api/v1/inquiries                   | —    | public form (5 req / 10 min per IP) |
| GET    | /api/v1/admin/inquiries             | JWT  | list + status/property filter       |
| GET    | /api/v1/admin/inquiries/:id         | JWT  | fetch one                           |
| PATCH  | /api/v1/admin/inquiries/:id         | JWT  | update status / internal notes      |
| DELETE | /api/v1/admin/inquiries/:id         | JWT  | permanent delete                    |

Favorites are kept in the browser's `localStorage` (`ar_favorites`) — no
user accounts yet, so they're per-device.

## Phase 4: Dashboard, Users & Settings

Apply the new migration if upgrading:
```bash
psql "postgres://USER:PW@localhost:5432/realestate" -f backend/migrations/005_phase4.sql
```

### Roles & capabilities

| Role              | Properties | Inquiries | Dashboard & Settings | Users |
|-------------------|:---------:|:---------:|:-------------------:|:-----:|
| **super_admin**   |     ✓     |     ✓     |          ✓          |   ✓   |
| **admin**         |     ✓     |     ✓     |          ✓          |   —   |
| **listing_manager** |   ✓     |     —     |          —          |   —   |

Enforced in both the Go routes (`RequireRole` middleware) and the React
router (`RoleRoute` + conditional sidebar links). A listing manager who
tries to open `/admin/inquiries` or hits `/api/v1/admin/inquiries`
directly gets 403'd.

### Dashboard

- 4 KPI cards (total properties, available, new inquiries, active listing value).
- 30-day inquiry sparkline (SVG, no chart library).
- Properties-by-status bar chart.
- Recent activity feed from `audit_logs`.

### Users (`/admin/users`, super_admin only)

- List, invite, change role, deactivate, delete.
- Safeguards: cannot demote/deactivate/delete yourself.
- On password change, all that user's refresh tokens are revoked.

### Settings (`/admin/settings`, admin+)

- Company name, tagline, phone, email, address, social URLs.
- Stored as a whitelisted JSONB blob in `site_settings`.
- Public endpoint `GET /api/v1/settings` exposes only safelisted keys —
  used by the footer and contact page.
- Same page offers the current user a "change my password" form.

### Phase 4 API

| Method | Path                                      | Role          | Purpose                   |
|--------|-------------------------------------------|---------------|---------------------------|
| GET    | /api/v1/settings                          | —             | public site settings      |
| GET    | /api/v1/admin/stats                       | admin+        | KPI numbers               |
| GET    | /api/v1/admin/stats/inquiries-daily       | admin+        | 30-day inquiry histogram  |
| GET    | /api/v1/admin/stats/recent-activity       | admin+        | last 20 audit events      |
| GET    | /api/v1/admin/settings                    | admin+        | full settings doc         |
| PUT    | /api/v1/admin/settings                    | admin+        | update (whitelisted keys) |
| POST   | /api/v1/auth/me/password                  | any logged-in | change own password       |
| GET    | /api/v1/admin/users                       | super_admin   | list users                |
| POST   | /api/v1/admin/users                       | super_admin   | invite user               |
| PATCH  | /api/v1/admin/users/:id                   | super_admin   | update role/active/pw     |
| DELETE | /api/v1/admin/users/:id                   | super_admin   | permanent delete          |

## Phase 5: SEO & performance

No new migration. Just rebuild & restart.

### SEO

- **`GET /sitemap.xml`** — generated from the live DB. Lists static routes plus every published, non-deleted property, with `lastmod` from `updated_at`. Cached 30 min.
- **`GET /robots.txt`** — allows everything except `/admin` and `/uploads/`; points at the sitemap.
- **Per-page `<head>`** via a tiny `useHead()` hook ([head.ts](frontend/src/lib/head.ts)) — sets `<title>`, `description`, canonical, Open Graph, Twitter Card, and `robots`. No new deps.
- **JSON-LD** on each property page ([jsonld.ts](frontend/src/lib/jsonld.ts)) — `schema.org/RealEstateListing` with nested `SingleFamilyResidence` / `Apartment` / `Residence`, full `PostalAddress`, `GeoCoordinates` when present, and an `Offer` with correct availability + `unitText: MON` for rentals.
- **Filtered listing pages** (`/buy?city=…`) are marked `noindex,follow` so query-string variants don't flood the index. The bare `/buy`, `/rent`, `/sold` stay indexable.
- **`/admin/*` and `/favorites`** emit `noindex,nofollow`.

Point search consoles at `https://<your-domain>/sitemap.xml`. In production, your reverse proxy must forward `/sitemap.xml` and `/robots.txt` to the Go backend (not the SPA).

### Performance

- **gzip** response compression for all non-upload responses (`gin-contrib/gzip`).
- **`Cache-Control`** headers:
  - Public property reads: `public, max-age=60`
  - Public settings: `public, max-age=300`
  - Sitemap: `public, max-age=1800`
  - Robots: `public, max-age=3600`
  - All admin responses are uncached by default (no header set, so proxies keep them private).
- **Static assets from Vite** are served by nginx with `Cache-Control: public, immutable` and a 1-year expiry (filename hashing handles cache-busting).
- **Lazy image loading** already in place since Phase 1.

### Deployment notes (CloudPanel / nginx)

Minimal upstream block for the SPA host — forward API + SEO roots to the Go backend:

```nginx
location /api/        { proxy_pass http://127.0.0.1:8080; }
location /uploads/    { proxy_pass http://127.0.0.1:8080; }
location = /sitemap.xml { proxy_pass http://127.0.0.1:8080; }
location = /robots.txt  { proxy_pass http://127.0.0.1:8080; }
```

## Phase 6: Production hardening

No new DB migration.

### What's hardened

- **Rate limits** across every write endpoint: inquiries 5/10min, login 10/10min, refresh 30/10min, admin writes 60/min (per client IP).
- **Security headers**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and **HSTS** (`max-age=31536000; includeSubDomains; preload`) — HSTS only emits when the request arrives over HTTPS (direct TLS or `X-Forwarded-Proto: https`), so localhost dev is never bricked. Enable with `HSTS=true`.
- **Audit log** already written on login, user create/update/delete, property create/update/delete/publish/unpublish, inquiry update/delete, settings update, password change. Now viewable at **`/admin/audit`** (super_admin) with filters by entity/action, paginated.
- **OpenAPI 3** spec at [backend/docs/openapi.yaml](backend/docs/openapi.yaml). Swagger UI served at **`/docs`** (loads from `cdn.jsdelivr.net`).
- **Hardened Dockerfiles**: multi-stage, non-root (uid 10001), `-trimpath -ldflags="-s -w -buildid="`, embedded healthchecks.
- **systemd unit** with `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome`, `MemoryDenyWriteExecute`, `RestrictRealtime` — see DEPLOY.md.
- **Backups**: [scripts/backup.sh](scripts/backup.sh) uses `pg_dump --format=custom`, archives `uploads/`, prunes past `RETENTION_DAYS` (default 14). [scripts/restore.sh](scripts/restore.sh) supports confirmed DB restore + uploads extraction.

### New Phase 6 API

| Method | Path                     | Role        | Purpose                            |
|--------|--------------------------|-------------|------------------------------------|
| GET    | /docs                    | —           | Swagger UI                         |
| GET    | /docs/openapi.yaml       | —           | OpenAPI 3 spec                     |
| GET    | /api/v1/admin/audit      | super_admin | audit log, filter + paginate       |

### Full deployment guide

See **[DEPLOY.md](DEPLOY.md)** — covers Ubuntu 22.04 + nginx + certbot + systemd, DB bootstrap, build + install flow, backup cron, hardening checklist, and upgrade recipe.

---

## Notes

- Seed images use Unsplash as placeholders. Real listings should upload images in Phase 2.
- `pg_trgm` enabled for fuzzy address search (used starting Phase 3).
- Migrations are applied via Postgres `docker-entrypoint-initdb.d` on first boot.
  To re-apply, `docker compose down -v` (wipes data) and `up` again.
