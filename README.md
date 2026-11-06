# Chalinze Steel Mills Ltd website

Independent React, TypeScript, Vite and Three.js website project, kept separate from the UCC chatbot repository. The protected `/admin` area manages leadership, manufacturing drafts and the public site's page content, navigation and visual settings.

## Deploy and run on Cloudflare

Cloudflare Workers is the intended production host. The Worker API uses MySQL through Hyperdrive and stores uploaded media in R2; the Worker opens and closes a mysql2 connection for each request and performs parameterized queries. Hyperdrive connects to an existing MySQL-compatible database, so its database provider and plan are separate from Cloudflare. Choose a provider with an available free tier if possible, and verify its limits, inactivity policy, network access, and TLS support before relying on it. Check current [Hyperdrive support](https://developers.cloudflare.com/hyperdrive/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), and [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

The Worker serves the Vite SPA and implements the existing public and admin API paths through an Express Node HTTP entrypoint using Cloudflare's `httpServerHandler`. Content, accounts, sessions, and audit history use MySQL; uploaded photos and manufacturing media use R2. Upload records include object key, type, size, original name, uploader, and timestamp. The existing D1 binding and Render disk are retained as recovery sources until a verified migration and backup are complete. Read [the data recovery report](./docs/DATA_RECOVERY_REPORT.md) before choosing an import source: the local SQLite and D1 emulator contain conflicting versions of the same records.

### Configure MySQL, Hyperdrive, and R2

Create a MySQL database with a provider of your choice. Hyperdrive requires a publicly reachable MySQL endpoint or a supported private-network route. Configure Hyperdrive from the Cloudflare dashboard with query caching **disabled**; authentication, sessions, permissions, and admin updates require fresh reads, and Hyperdrive does not invalidate cached reads after writes. Then replace the placeholder `HYPERDRIVE` ID in `wrangler.jsonc`. Do not put the database connection string in Wrangler variables or frontend code.

```powershell
npm ci
npx wrangler login
npx wrangler r2 bucket create chalinze-steel-mills-media
```

For local database administration, put a private `MYSQL_URL` in the ignored `.env` file and apply the idempotent schema:

```powershell
npm run db:migrate:mysql
```

The schema migration creates tables and indexes but does not choose between conflicting data sources or import records. The SQLite import is read-only on the source, only inserts absent rows, skips identical rows, and aborts on conflicts:

```powershell
node scripts/import-sqlite-mysql.mjs "C:\path\to\source.sqlite"
npm run db:verify:mysql -- "C:\path\to\source.sqlite"
```

Import each candidate source into a separate empty staging database first. Do not run imports against production until you have selected and reconciled the authoritative records. The project does not have access to your hosted snapshots or Cloudflare account data.

The legacy Express server uses scrypt hashes, while the Worker uses PBKDF2. If the imported administrator has a legacy scrypt hash, set a new password interactively before cutover; the command revokes existing sessions and never prints or stores the password in the repository:

```powershell
npm run admin:reset:mysql
```

Set the initial administrator password as a Worker secret, then deploy only after the staging database, account access, object migration, and restore procedure have been verified:

```powershell
npx wrangler secret put ADMIN_PASSWORD
npm run cf:deploy
```

`ADMIN_PASSWORD` is used only to bootstrap an administrator when the MySQL `admins` table is empty. It is hashed before storage; remove the bootstrap secret after the account is created if it is not needed. `ADMIN_EMAIL` is a non-secret Worker variable.

### Back up and restore MySQL

Backups are portable JSON exports with SHA-256 integrity verification. The backup file contains administrator password hashes and sessions, so encrypt it and restrict access. Backup creation uses exclusive file creation and will not replace an existing export. Restore into a separate database after applying its schema.

```powershell
npm run db:backup:mysql -- "C:\secure-backups\chalinze-mysql-2026-11-06.json"
npm run db:restore:mysql -- "C:\secure-backups\chalinze-mysql-2026-11-06.json"
```

Restore refuses to overwrite non-empty application tables. Restore to a separate database, run the verifier against its SQLite source, and only then promote it. Back up R2 independently to an account/provider outside Cloudflare using its S3-compatible endpoint, with object versioning and retention enabled at the destination. Do not treat Wrangler's local emulator directory as a backup.

Default retention policy: retain daily database and object backups for 30 days and month-end copies for 12 months. Apply lifecycle rules only to the independent backup copies, preserve the current production and source files, and perform a restore test at least quarterly before expiring older copies.

The R2 scripts use the AWS CLI and require scoped S3 credentials in the private environment. `R2_S3_ENDPOINT` must point to the source R2 endpoint for backup and the destination S3-compatible endpoint for restore. Back up to an empty directory on separate storage, then copy that verified directory to the independent provider. Restore refuses to overwrite a non-empty bucket.

```powershell
.\scripts\backup-r2.ps1 -SourceBucket chalinze-steel-mills-media -BackupDirectory "E:\independent-backups\chalinze-r2"
.\scripts\restore-r2.ps1 -BackupDirectory "E:\independent-backups\chalinze-r2" -DestinationBucket chalinze-steel-mills-media-restore
```

### Migrate from Render

Keep the Render service, mounted disk, and original SQLite file unchanged until cutover and disaster-recovery checks pass. The local SQLite importer does not migrate files; upload files separately and verify every URL before switching traffic. The legacy `scripts/migrate-render-data.mjs` now requires `--apply`, updates matching destination profiles, leaves destination-only profiles intact, and omits accounts, audit entries, and undo/redo history. It is not a complete database migration; use it only after verified backups.

## Optional local development

Requirements for the legacy local Node server: Node.js 22.x and npm. Cloudflare development uses Wrangler; local Hyperdrive requires a reachable MySQL development database, and local R2 emulation is separate from the remote bucket.

To run the Worker locally, configure Hyperdrive in Wrangler with a local connection string for a non-production MySQL database. The retained D1 binding is for recovery only and is not used by the Worker API.

```powershell
npm run db:migrate:mysql
npm run cf:dev
```

The legacy Express/SQLite development server remains available as a fallback while Render is kept online. It is not the Cloudflare production runtime.

For local development only, start the API and Vite in separate PowerShell windows:

```powershell
npm install
npm run dev:server
```

```powershell
npm run dev
```

Open the Vite URL shown in the terminal. The Vite development server proxies the leadership and manufacturing-content APIs and uploaded media to the local Node server.

The API stores profiles, administrator accounts, sessions, manufacturing content, audit history and uploaded media in the local `data/` directory. The SQLite database is `data/chalinze.sqlite`; `DATA_DIRECTORY` can point the app to another writable location. No hosted database or database URL is required.

To run the production-style site locally, build and start the integrated server:

```powershell
npm run build
npm start
```

The server serves both the built website and its API on port `4173` by default. On Windows, `start.bat` installs dependencies if needed, builds the site when necessary, then starts the server.

## Leadership administration

The public leadership page is available at `/leadership`; the authenticated administration page is at `/admin`. The published roster follows the supplied Board, Senior Management and Supporting Staff structure exactly. Dr. Humphrey Musyoka is listed as a Board Director; Nickson Kimbori appears only in Senior Management. Harish Kumar and the Chief Finance Officer (CFO) are separate entries. Public entries contain only the supplied names and titles, without unsupported biographies or qualifications. A one-time migration updates the roster, removes unsupported public profile details, archives unrelated published profiles and records changes in the audit history; later restarts do not overwrite administrator edits.

On Cloudflare, the Worker creates `admin@chalinze.co.tz` in MySQL when the admin session endpoint is first accessed and no administrator exists. The bootstrap password uses a salted PBKDF2 hash. The initial account has the administrator role.

Sign in at `/admin` to review profiles, upload company-approved portraits, edit profile content and ordering, manage website copy/navigation/footer/design, preview changes, and inspect the audit history. The site editor provides controls for the home-page introduction, each content page's title/summary/sections/layout, navigation and footer links, brand colors and typography. Text is rendered as plain text; links are limited to safe internal paths or HTTPS URLs. Content editors can prepare unpublished site and manufacturing drafts but cannot publish, delete profiles, edit a published profile or undo/redo published changes. Administrators can publish reviewed drafts and use the cross-content Undo/Redo controls; reversals and reapplications are recorded in the audit history.

On Cloudflare, published and draft records, admin accounts, sessions, audit entries, change history, and upload metadata are stored in MySQL. Uploaded media is stored in the bound R2 bucket. The Vite SPA, public brand assets, and supplied leadership portraits are served as static assets. The legacy Node fallback stores data in SQLite and files on disk and must not be used as the Cloudflare production runtime.

Four supplied leadership portraits are optimized in `public/assets/leadership/` and associated with the matching profiles. The supplied mine-site photograph is used only as an illustrative image, not as evidence of the Chalinze project site. Public copies of the two supplied Tanzania Revenue Authority certificates are in `public/assets/corporate/`; taxpayer identifiers and signatures are redacted, and both are identified as documents issued to Gypsum Plus Mines Limited. Original source documents and unredacted tax certificates in the local `src/leadership/` folder are excluded from Git.

The Render rollback still stores profile, manufacturing-content, session and audit records in `DATA_DIRECTORY/chalinze.sqlite`; uploaded files live in `DATA_DIRECTORY/uploads/` and private originals in `DATA_DIRECTORY/originals/`. Back up this directory before migration. Cloudflare R2 serves uploaded media through the Worker with long-lived immutable cache headers. HTTPS-only secure admin cookies are used on Cloudflare.

The manufacturing experience is available at `/manufacturing` (and `/technology`). In the authenticated `/admin` area, administrators can edit the manufacturing page's structured JSON draft, preview its headline and six stages, and publish it separately from the live version. The Worker validates required sections and stage data, accepts media only through authenticated upload routes, and records draft saves/publication in the audit history. The media controls support approved JPEG/PNG/WebP photos (5 MB maximum) and MP4/WebM hero video (30 MB maximum); Cloudflare R2 retains uploaded media in its accepted original format. Approved photos can be assigned to the hero or an individual stage, and hero video is muted and loops. Save and review the draft before publishing. Use company-approved assets only. Content should be checked against the engineering and publication caveats in [docs/CONTENT_AUDIT.md](./docs/CONTENT_AUDIT.md).

The public leadership page follows the supplied roster and does not display biographies, qualifications, or responsibilities that have not been approved. The supplied profiles for Denis A. Kimaro and Mrs. Juliette Kimaro include a NextGen Cement Co. Ltd shareholder context, not a confirmed Chalinze shareholding. Upload future approved portraits through the administrator panel. Create content editors with `ADMIN_ROLE=editor` when bootstrapping their administrator account; the role is enforced on the API as well as in the interface.

The Render Blueprint in `render.yaml` remains available for rollback during migration. It provisions the earlier Node/SQLite service and persistent disk; it is not the selected long-term host once the Cloudflare deployment and data transfer are confirmed.

Contact links open the visitor's email, phone, messaging app or map; this site does not collect enquiries, process payments, publish live news or provide a protected investor portal.

## Build and type-check

```powershell
npm test
npm run typecheck
npm run build
```

## Company and brand source material

The site's company copy is based on the supplied `WEBSITE _DOCS_ Chalinze Steel Mills Ltd.docx` (company sections 1–24). It covers the company and ownership statements, proposed project, manufacturing stages, product cross-sections, utility design basis, quality, HSEC/ESG, markets, partnerships, development, careers, communications and all listed contact channels. A page-by-page summary and open verification items are in [docs/CONTENT_AUDIT.md](./docs/CONTENT_AUDIT.md).

The approved logo PDF is preserved at `public/assets/brand/chalinze-approved-logo-source.pdf`. Optimized WebP artwork is derived from the PDF's embedded image without redrawing it. The approved artwork is displayed in the header/footer and on an interactive 3D plaque. The logo's “low-carbon” wording is treated as brand wording, not as measured emissions performance or a certification.

Three photographs embedded in the supplied Word document are presented as illustrative source-document images. The documents do not establish that they depict Chalinze Steel Mills production, and no separate image-rights or provenance statement was supplied. The remaining process visuals are labelled conceptual illustrations, not installed or as-built facilities. Review [docs/CONTENT_AUDIT.md](./docs/CONTENT_AUDIT.md) before publication.

## Unresolved source conflicts and launch review

- The project description gives Phase 1 as 1,000,000 tonnes per annum, with another 1,000,000 tonnes per annum as a later expansion; an earlier diagram gives 1.2 million tonnes per annum. No single definitive capacity claim is made.
- The main project narrative describes natural-gas DRI; an alternate process diagram refers to electric ironmaking. The selected route remains unresolved.
- Two corporate-office descriptions differ in spelling, floor, street and district. Both the listed corporate office and separate planned project location/map pin are clearly distinguished on Contact.
- The product-size selector uses the two nominal billet cross-sections in the source document, 130 × 130 mm and 150 × 150 mm. Length, grade, chemistry, tolerance, availability and delivery terms were not supplied.
- The source-document contact channels and map pins are presented as supplied. The Vigwaza project pin is labelled planned, and the precise site address still requires confirmation. The unverified `sales@chalinzesteelmills.co.tz` reference address is not treated as an approved functional contact.
- The supplied HTML design reference is not treated as a live company site. Its disabled enquiry form and unsupported finished-product, certification and capacity claims are not published as verified facts.

Obtain authorized confirmation of these items, photo rights/provenance, leadership titles and final visual/content approval before launch. Leadership content has its own administrative approval stage; only profiles marked Published appear on the public leadership page.
