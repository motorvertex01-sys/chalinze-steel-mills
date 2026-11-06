# Data recovery and persistence audit

## Scope and safety

This inspection was read-only. No database rows, upload files, Wrangler state, or credentials were changed or copied. Credential values and personal record contents are intentionally omitted.

The report covers the repository, the local SQLite database, and the local Wrangler/Miniflare state present in this checkout. It cannot inspect a Cloudflare account, a hosted Render disk, browser profiles, or external backups because no provider credentials or snapshots are available here.

## Recoverable sources found

| Source | Findings | Recovery status |
| --- | --- | --- |
| `data/chalinze.sqlite` | SQLite integrity check passed. 18 profiles, 1 administrator, 3 sessions, 36 audit entries, 0 change-history entries, 2 site-content records, and 3 applied migration records. | Readable local source; preserve an untouched copy before any import. |
| `.wrangler/state/v3/d1/...` | Local D1 emulator contains 18 profiles, 1 administrator, 3 sessions, 4 audit entries, 2 change-history entries, 1 site-content record, and 1 D1 migration record. | Readable local development state, not evidence of the remote Cloudflare D1 contents. It is separate from the SQLite source. |
| `.wrangler/state/v3/r2/...` | Local R2 emulator contains `d9f2aadf-7431-4e0a-8e15-cad60ccf84bc.webp` (161,618 bytes). | Local development state only; it is not evidence of the remote R2 bucket contents. Export it before cleaning or regenerating Wrangler state. |
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
- At inspection time, the uncommitted Wrangler/Worker code used D1 and R2, not MySQL/Hyperdrive. The implementation has since switched Worker queries to Hyperdrive and retained the D1 binding as a legacy recovery source. The Hyperdrive ID is still a placeholder; no remote connection can be established until the user provisions Hyperdrive and a MySQL database. The live remote bindings cannot be inspected from this environment.
- `.env` is ignored by Git. Its variable names include `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `PORT`; values are not recorded here. The checked-in example also documents `ADMIN_ROLE` and `DATA_DIRECTORY`. Render supplies `NODE_ENV` and has a non-synchronized `ADMIN_PASSWORD` setting.
- The browser application has no repository references to `localStorage`, `sessionStorage`, or IndexedDB. The admin interface uses an HTTP-only session cookie; browser-side unsaved form state was not recoverable through repository inspection.
- The application has no JWT configuration. Cloudflare sessions use random opaque tokens stored as SHA-256 hashes, 12-hour expiration, `HttpOnly`, `Secure`, and `SameSite=Strict` cookies, PBKDF2 password hashes with unique salts, and database-backed login-attempt limits. The legacy Express server uses scrypt password hashes and an in-memory login limiter; these two hash formats must not be silently treated as equivalent during a migration.
- The SQLite schema has `admins`, `applied_migrations`, `audit_log`, `change_history`, `profiles`, `sessions`, and `site_content`; the main local file did not have a `login_attempts` table. The D1 emulator schema has `d1_migrations`, `login_attempts`, and the account/content/history tables. The MySQL migration adds `schema_migrations` and `uploads`; neither MySQL table existed in the original records.
- Public API routes are `GET /healthz`, `GET /api/leadership`, `GET /api/manufacturing`, and `GET /api/site-config`. Admin routes are `GET /api/admin/session`, `POST /api/admin/login`, `POST /api/admin/logout`, `GET|POST /api/admin/profiles`, `PUT|DELETE /api/admin/profiles/:id`, `GET|PUT /api/admin/site-config`, `POST /api/admin/site-config/publish`, `GET /api/admin/audit`, `GET /api/admin/history`, `POST /api/admin/undo`, `POST /api/admin/redo`, `GET|PUT /api/admin/manufacturing`, `POST /api/admin/manufacturing/publish`, `POST /api/admin/upload`, and `POST /api/admin/manufacturing/media`. Uploaded objects are served through `GET /uploads/*`. The MySQL/R2 Worker adds authenticated `DELETE /api/admin/media/:key`, which refuses to remove referenced objects. Unknown API paths return 404; other requests are delegated to static assets.
- Upload request bodies use in-memory multipart buffering with 5 MB portrait and 30 MB manufacturing-media limits. This buffer is temporary request processing, not persistent storage. The legacy Express server then writes to local files; the Worker writes accepted original formats to R2 and records metadata in MySQL.
- Environment variables documented by the project are `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_ROLE`, `PORT`, `DATA_DIRECTORY`, `MYSQL_URL`, `MYSQL_SSL`, and `APP_URL`, plus Cloudflare bindings for Hyperdrive, R2, and static assets. `.env.example` contains placeholders only. No JWT secret or browser storage configuration was found.

## Why data can appear to disappear after a move

The database and uploads are stored in host-local paths unless `DATA_DIRECTORY` is mounted on persistent storage. A new host starts with a new empty filesystem/database unless the old database and upload files are explicitly exported and imported. A Worker deployment uses its configured remote binding and does not see Render's disk or the local SQLite file. Likewise, local `.wrangler` data is an emulator cache and is not an independent backup.

The existing `scripts/migrate-render-data.mjs` copies profiles, site configuration, manufacturing content, and referenced upload URLs through authenticated API calls. It does **not** copy administrators, sessions, audit entries, or undo/redo history. At inspection time it also deleted destination-only profiles; that deletion has since been removed and the script now requires an explicit `--apply` flag. It still updates matching destination profiles and must not be used without a verified backup and an explicit merge plan.

## Unavailable evidence and next recovery steps

- Remote Render snapshots, deployed Cloudflare D1/R2 contents, external SQL backups, and other hosting providers' snapshots were not accessible. Their existence and contents remain unverified, not confirmed absent.
- To make a separate local copy of the discovered emulator object (without deleting its source), use `npx wrangler r2 object get "chalinze-steel-mills-media/d9f2aadf-7431-4e0a-8e15-cad60ccf84bc.webp" --local --file "data/recovered/d9f2aadf-7431-4e0a-8e15-cad60ccf84bc.webp"`. This export was not run and does not migrate the object to a remote bucket.
- Before cutover, export the mounted Render database plus `uploads/` and `originals/`, and separately export the remote Cloudflare database and bucket if they have been used.
- Keep original exports immutable. Restore into a separate MySQL database and R2 bucket first, compare row/object counts and hashes, resolve the conflicts above, and only then schedule a production cutover.
- No production database write, Worker restart/redeploy, remote upload, or cross-database restore test was performed during this audit.
