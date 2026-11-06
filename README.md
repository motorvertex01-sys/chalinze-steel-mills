# Chalinze Steel Mills Ltd website

Independent React, TypeScript, Vite and Three.js website project, kept separate from the UCC chatbot repository. The protected `/admin` area manages leadership, manufacturing drafts and the public site's page content, navigation and visual settings.

## Deploy and run on Cloudflare

Cloudflare Workers is the production host. The Worker API uses Cloudflare D1 for relational data and uploaded media, avoiding external database connections and R2 activation/billing. D1's current Workers Free allowance is 500 MB per database and 5 GB storage per account. Media is stored as 64 KiB BLOB parts in D1, with a 1.8 MB maximum per file to stay below D1's 2 MB row limit. Check current [D1 pricing and limits](https://developers.cloudflare.com/d1/platform/pricing/) and [Workers limits](https://developers.cloudflare.com/workers/platform/limits/); Free-plan requests fail when usage limits are reached rather than automatically upgrading the plan.

The Worker serves the Vite SPA and implements the existing public and admin API paths through an Express Node HTTP entrypoint using Cloudflare's `httpServerHandler`. Profiles, content, accounts, sessions, audit history, change history, upload metadata and uploaded media are held in D1. The existing Render disk remains an export source until migration and verification complete. Read [the data recovery report](./docs/DATA_RECOVERY_REPORT.md) before choosing an import source: local snapshots can differ from production.

### Configure D1

```powershell
npm ci
npx wrangler login
npx wrangler d1 migrations apply chalinze-steel-mills --remote
```

Set the initial administrator password as a Worker secret (never as a Wrangler variable or frontend value), then deploy:

```powershell
npx wrangler secret put ADMIN_PASSWORD
npm run cf:deploy
```

`ADMIN_PASSWORD` is used only to bootstrap an administrator when the D1 `admins` table is empty. It is hashed before storage; remove the bootstrap secret after the account is created if it is not needed. `ADMIN_EMAIL` is a non-secret Worker variable.

If sign-in fails after the administrator has been created, changing `ADMIN_PASSWORD` does not update the existing account; the secret is only used during first-account bootstrap. Reset an existing Cloudflare admin locally with:

```powershell
npm run admin:reset:cloudflare
```

The command verifies the existing admin email, prompts for a new password without echoing it, updates its PBKDF2 hash in remote D1 and revokes existing sessions. Never pass the password as a command-line argument or share it in chat. After resetting, delete `ADMIN_PASSWORD` with `npx wrangler secret delete ADMIN_PASSWORD` if it may have been exposed; it is no longer needed for an existing admin account.

### Back up and restore

Export D1 before a data migration and retain the export separately. D1 exports contain application content and may contain administrator hashes and session tokens; encrypt the export and restrict access. Restore into a separate D1 database and verify it before any production recovery.

```powershell
npx wrangler d1 export chalinze-steel-mills --remote --output "C:\secure-backups\chalinze-d1-2026-11-06.sql"
```

The D1 export includes media BLOB parts. Copy verified exports to independent storage you control (for example, encrypted removable storage or another provider) and retain checksums. Do not treat Wrangler's local emulator directory as a backup.

Default retention policy: retain daily database and object backups for 30 days and month-end copies for 12 months. Apply lifecycle rules only to the independent backup copies, preserve the current production and source files, and perform a restore test at least quarterly before expiring older copies.

### Migrate from Render

Keep the Render service, mounted disk, and original SQLite file unchanged until the Cloudflare copy and disaster-recovery checks pass. Use the authenticated admin APIs for private drafts, profiles, audit/history data and any referenced uploads; public API data alone is not a complete export. Import must be backed up, repeatable, and must not delete destination-only records. Revoke old sessions and provision a new Cloudflare admin password rather than copying live sessions.

For the one-time transfer, sign in to Render's `/admin` page as an administrator and download `/api/admin/export`. The export includes all profile and site-content drafts, audit/change-history rows, administrator email/role metadata, and the upload manifest; it excludes password hashes, sessions and login-attempt state. Keep the export private. Apply D1 migrations, then validate the export and run the importer:

```powershell
npx wrangler d1 migrations apply chalinze-steel-mills --remote
npm run db:import:render:d1 -- --export "C:\secure-backups\chalinze-render-export.json"
npm run db:import:render:d1 -- --export "C:\secure-backups\chalinze-render-export.json" --apply
```

The importer first exports a D1 backup into the ignored `backups/` directory, downloads listed public uploads, and upserts records and media parts without deleting destination-only rows. Files over 1.8 MB must be compressed and re-exported before import; the importer rejects them rather than truncating or skipping them. Existing Cloudflare admin password hashes and sessions are deliberately not imported; provision a new admin using `ADMIN_EMAIL` and `wrangler secret put ADMIN_PASSWORD`. Private originals in Render's `originals/` directory are not publicly served or included in this migration; retain their source backup separately.

## Optional local development

Requirements for the legacy local Node server: Node.js 22.x and npm. Cloudflare development uses Wrangler; its local D1 emulator is separate from the remote database.

To run the Worker locally, apply migrations to Wrangler's local D1 database.

```powershell
npx wrangler d1 migrations apply chalinze-steel-mills --local
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

The legacy Express development server stores profiles, administrator accounts, sessions, manufacturing content, audit history and uploaded media in the local `data/` directory. The SQLite database is `data/chalinze.sqlite`; `DATA_DIRECTORY` can point the app to another writable location. The Cloudflare Worker uses D1 instead.

To run the production-style site locally, build and start the integrated server:

```powershell
npm run build
npm start
```

The server serves both the built website and its API on port `4173` by default. On Windows, `start.bat` installs dependencies if needed, builds the site when necessary, then starts the server.

## Leadership administration

The public leadership page is available at `/leadership`; the authenticated administration page is at `/admin`. The published roster follows the supplied Board, Senior Management and Supporting Staff structure exactly. Dr. Humphrey Musyoka is listed as a Board Director; Nickson Kimbori appears only in Senior Management. Harish Kumar and the Chief Finance Officer (CFO) are separate entries. Public entries contain only the supplied names and titles, without unsupported biographies or qualifications. A one-time migration updates the roster, removes unsupported public profile details, archives unrelated published profiles and records changes in the audit history; later restarts do not overwrite administrator edits.

On Cloudflare, the Worker creates `admin@chalinze.co.tz` in D1 when the admin session endpoint is first accessed and no administrator exists. The bootstrap password uses a salted PBKDF2 hash. The initial account has the administrator role.

Sign in at `/admin` to review profiles, upload company-approved portraits, edit profile content and ordering, manage website copy/navigation/footer/design, preview changes, and inspect the audit history. The site editor provides controls for the home-page introduction, each content page's title/summary/sections/layout, navigation and footer links, brand colors and typography. Text is rendered as plain text; links are limited to safe internal paths or HTTPS URLs. Content editors can prepare unpublished site and manufacturing drafts but cannot publish, delete profiles, edit a published profile or undo/redo published changes. Administrators can publish reviewed drafts and use the cross-content Undo/Redo controls; reversals and reapplications are recorded in the audit history.

On Cloudflare, published and draft records, admin accounts, sessions, audit entries, change history, upload metadata and uploaded media are stored in D1. The Vite SPA, public brand assets, and supplied leadership portraits are served as static assets. The legacy Node fallback stores data in SQLite and files on disk and must not be used as the Cloudflare production runtime.

Four supplied leadership portraits are optimized in `public/assets/leadership/` and associated with the matching profiles. The supplied mine-site photograph is used only as an illustrative image, not as evidence of the Chalinze project site. Public copies of the two supplied Tanzania Revenue Authority certificates are in `public/assets/corporate/`; taxpayer identifiers and signatures are redacted, and both are identified as documents issued to Gypsum Plus Mines Limited. Original source documents and unredacted tax certificates in the local `src/leadership/` folder are excluded from Git.

The Render rollback still stores profile, manufacturing-content, session and audit records in `DATA_DIRECTORY/chalinze.sqlite`; uploaded files live in `DATA_DIRECTORY/uploads/` and private originals in `DATA_DIRECTORY/originals/`. Back up this directory before migration. D1 serves uploaded media through the Worker with long-lived immutable cache headers. HTTPS-only secure admin cookies are used on Cloudflare.

The manufacturing experience is available at `/manufacturing` (and `/technology`). In the authenticated `/admin` area, administrators can edit the manufacturing page's structured JSON draft, preview its headline and six stages, and publish it separately from the live version. The Worker validates required sections and stage data, accepts media only through authenticated upload routes, and records draft saves/publication in the audit history. The media controls support approved JPEG/PNG/WebP photos and MP4/WebM hero video up to 1.8 MB per file; D1 retains uploaded media in its accepted original format. Approved photos can be assigned to the hero or an individual stage, and hero video is muted and loops. Save and review the draft before publishing. Use company-approved assets only. Content should be checked against the engineering and publication caveats in [docs/CONTENT_AUDIT.md](./docs/CONTENT_AUDIT.md).

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
