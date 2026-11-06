# Data recovery and persistence audit

## Scope and safety

The initial repository inspection was read-only. Cloudflare changes are additive: a private D1 backup was created, the upload metadata and media-parts migrations were applied, and the Worker/static assets were deployed. No source Render rows or files have been modified or deleted. Credential values and personal record contents are intentionally omitted.

The report covers the repository, the local SQLite database, the local Wrangler/Miniflare state, and the configured Cloudflare account. The hosted Render disk's private originals and records still require an authenticated export.

## Current Cloudflare cutover check (2026-11-06)

- Cloudflare D1 database `chalinze-steel-mills` exists. Before the Render import it held the seeded 18 leadership profiles, but zero administrators, audit entries, change-history rows, sessions, login-attempt rows or site-content rows.
- Private pre-import D1 SQL exports are stored outside the repository. Migrations `0002_add_uploads.sql` and `0003_add_d1_upload_parts.sql` are applied; the latter adds media-part storage without deleting existing rows. No Render records have yet been copied into D1.
- Worker `chalinze-steel-mills` is deployed at `https://chalinze-steel-mills.motorvertex01.workers.dev`. `/healthz` returns HTTP 200 JSON, `/api/leadership` returns HTTP 200 JSON with 18 profiles, and the public leadership page renders those profiles. This fixes the prior HTML-for-JSON error at the supplied URL.
- R2 remains unavailable, so production media uses D1 BLOB parts instead, capped at 1.8 MB per file. The Worker has no `ADMIN_PASSWORD` secret yet; `/api/admin/session` reports `configured: false`, so the admin account must be provisioned before sign-in or upload tests.
- An earlier Render public API check returned 18 leadership profiles plus published manufacturing and site configuration data. Render's health and protected export endpoints currently return HTTP 503. The export route was added and pushed, but is not currently reachable; no export has been downloaded. It excludes password hashes, active sessions and login-attempt state.

## Recoverable sources found

| Source | Findings | Recovery status |
| --- | --- | --- |
| `data/chalinze.sqlite` | SQLite integrity check passed. 18 profiles, 1 administrator, 3 sessions, 36 audit entries, 0 change-history entries, 2 site-content records, and 3 applied migration records. | Readable local source; preserve an untouched copy before any import. |
| `.wrangler/state/v3/d1/...` | Local D1 emulator contains 18 profiles, 1 administrator, 3 sessions, 4 audit entries, 2 change-history entries, 1 site-content record, and 1 D1 migration record. | Readable local development state, not evidence of the remote Cloudflare D1 contents. It is separate from the SQLite source. |
| `.wrangler/state/v3/r2/...` | Local R2 emulator contains `d9f2aadf-7431-4e0a-8e15-cad60ccf84bc.webp` (161,618 bytes). | Local development state only; it is not evidence of remote storage. Preserve the emulator state until the object is separately copied and verified. |
| `data/uploads/`, `data/originals/` | Both directories exist and are empty in this checkout. | No local Express upload payloads were found at inspection time. This does not rule out files on a hosted disk. |
| `public/assets/` | Tracked public site assets are present, including leadership portraits, brand assets, illustrations, and public corporate PDFs. | Version-controlled static assets; these are not user-upload records. |
| SQL/backup files | At inspection time, the existing application schema was `migrations/0001_initial_schema.sql`. The MySQL schema at `migrations/mysql/0001_initial_schema.sql` was added afterward. No SQL export, database backup, or hosting snapshot was found outside dependency/build/runtime directories. | No pre-existing independent backup was found in the repository. |

### Source conflicts that need an explicit merge policy

The local SQLite database and local D1 emulator are not interchangeable snapshots:

- All 18 matching profile IDs have different row contents.
- Four audit IDs overlap, and each overlapping row differs.
- The `manufacturing` content record exists in both sources and differs.
- The D1 emulator has two change-history rows that are absent from SQLite; SQLite has a separate `site-config` row absent from D1.
- Each source has three sessions, with no matching session hashes.
- The administrator email fingerprint matches across the two sources, but password hashes and other account fields were not compared or disclosed in this report.

Do not automatically merge either source over the other. Compare the two original databases and the authoritative production source, then retain both snapshots and resolve conflicting records before cutover. Sessions should normally be invalidated during a credential-safe migration; this must not be mistaken for missing content.

## Existing persistence and upload behavior

- The Express server's SQLite path defaults to `data/chalinze.sqlite`; `DATA_DIRECTORY` can redirect it. Render's blueprint sets that directory to `/var/data` and provisions a persistent disk. A disk-backed database persists only while the disk remains attached and its files are copied or migrated during a provider change.
- Portrait uploads are written to `DATA_DIRECTORY/uploads/`; original image files are written to `DATA_DIRECTORY/originals/`. Manufacturing videos are also written to the local uploads directory. These files are not durable when a host's filesystem is ephemeral or when the data directory is not moved.
- The Worker uses Cloudflare D1 for parameterized SQL, upload metadata and bounded media BLOB parts. D1 exists and the Worker is deployed; R2 remains unavailable.
- `.env` is ignored by Git. Its variable names include `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `PORT`; values are not recorded here. The checked-in example also documents `ADMIN_ROLE` and `DATA_DIRECTORY`. Render supplies `NODE_ENV` and has a non-synchronized `ADMIN_PASSWORD` setting.
- The browser application has no repository references to `localStorage`, `sessionStorage`, or IndexedDB. The admin interface uses an HTTP-only session cookie; browser-side unsaved form state was not recoverable through repository inspection.
- The application has no JWT configuration. Cloudflare sessions use random opaque tokens stored as SHA-256 hashes, 12-hour expiration, `HttpOnly`, `Secure`, and `SameSite=Strict` cookies, PBKDF2 password hashes with unique salts, and database-backed login-attempt limits. The legacy Express server uses scrypt password hashes and an in-memory login limiter; these two hash formats must not be silently treated as equivalent during a migration.
- The SQLite schema has `admins`, `applied_migrations`, `audit_log`, `change_history`, `profiles`, `sessions`, and `site_content`; the main local file did not have a `login_attempts` table. D1 has the equivalent account/content/history tables plus `uploads` metadata and `upload_parts` BLOB storage.
- Public API routes are `GET /healthz`, `GET /api/leadership`, `GET /api/manufacturing`, and `GET /api/site-config`. Admin routes include profile, site-content, manufacturing, audit/history, upload, export, and undo/redo operations. Uploaded files are served through `GET /uploads/*`; authenticated `DELETE /api/admin/media/:key` refuses to remove referenced files.
- Upload request bodies use in-memory multipart buffering with a 1.8 MB per-file maximum so D1 can persist media in 64 KiB BLOB parts within its row-size limits. This buffer is temporary request processing, not persistent storage. The legacy Express server writes uploads to local files; the Cloudflare Worker stores media parts and metadata in D1.
- Environment variables documented by the project include `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_ROLE`, `PORT`, `DATA_DIRECTORY`, and `APP_URL`, plus Cloudflare D1 and static-assets bindings. `.env.example` contains placeholders only. No JWT secret or browser storage configuration was found.

## Why data can appear to disappear after a move

The database and uploads are stored in host-local paths unless `DATA_DIRECTORY` is mounted on persistent storage. A new host starts with a new empty filesystem/database unless the old database and upload files are explicitly exported and imported. A Worker deployment uses its configured remote binding and does not see Render's disk or the local SQLite file. Likewise, local `.wrangler` data is an emulator cache and is not an independent backup.

The existing `scripts/migrate-render-data.mjs` copies profiles, site configuration, manufacturing content, and referenced upload URLs through authenticated API calls. It does **not** copy administrators, sessions, audit entries, or undo/redo history. At inspection time it also deleted destination-only profiles; that deletion has since been removed and the script now requires an explicit `--apply` flag. It still updates matching destination profiles and must not be used without a verified backup and an explicit merge plan.

## Unavailable evidence and next recovery steps

- Remote Render snapshots, external SQL backups, and other hosting providers' snapshots were not accessible. Their existence and contents remain unverified, not confirmed absent.
- The discovered `.wrangler/state/v3/r2/` emulator object remains separate from remote resources and has not been imported. Preserve the local emulator state until that object has been separately copied and verified.
- Before cutover, export the mounted Render database plus `uploads/` and `originals/`, and retain independent copies of the Cloudflare D1 export.
- Keep original exports immutable. Restore into a separate D1 database first, compare row counts and media checksums, resolve the conflicts above, and only then schedule a production cutover.
- The Worker deployment, health endpoint, API JSON response, rendered leadership roster and supplied static portrait assets were verified. The admin-session endpoint reports unconfigured, and no private media upload round-trip, Render import or cross-database restore has been executed.
