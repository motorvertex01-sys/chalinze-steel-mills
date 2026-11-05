# Chalinze Steel Mills Ltd website

Independent React, TypeScript, Vite and Three.js website project, kept separate from the UCC chatbot repository. The protected `/admin` area manages leadership, manufacturing drafts and the public site's page content, navigation and visual settings.

## Start the project

Requirements: Node.js 20.19+ and npm. The site includes a Node API, a local SQLite database, and a protected leadership administration area.

For local development, start the API and Vite in separate PowerShell windows:

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

Create the first administrator on the server:

1. Copy `.env.example` to `.env` and set `ADMIN_EMAIL` plus a unique password of at least 14 characters. `npm run admin:create` uses `ADMIN_ROLE` (`admin` or `editor`); hosted first-start bootstrap always creates an administrator.
2. Locally, run `npm run admin:create` once. For a hosted first start, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` as private service environment variables; the server creates one administrator only when no account exists.
3. Remove `ADMIN_PASSWORD` from the service environment after account creation and sign-in. The password is stored as a salted scrypt hash; it is not needed to run the site.
4. Sign in at `/admin` to review profiles, upload company-approved portraits, edit profile content and ordering, manage website copy/navigation/footer/design, preview changes, and inspect the audit history. The site editor provides controls for the home-page introduction, each content page's title/summary/sections/layout, navigation and footer links, brand colors and typography. Text is rendered as plain text; links are limited to safe internal paths or HTTPS URLs. Content editors can prepare unpublished site and manufacturing drafts but cannot publish, delete profiles, edit a published profile or undo/redo published changes. Administrators can publish reviewed drafts and use the cross-content Undo/Redo controls; reversals and reapplications are recorded in the audit history.

The public site reads published site settings from a read-only API. Drafts and published settings, including page layouts and global theme choices, are stored in SQLite alongside manufacturing content. The site editor covers the page records, home-page introduction, navigation and footer data. Interactive 3D scenes, process illustrations, product diagrams, galleries, FAQs/contact widgets, and other experience-specific decorative or structured components remain code-defined; leadership profiles and the manufacturing experience continue to use their dedicated structured editors.

Four supplied leadership portraits are optimized in `public/assets/leadership/` and associated with the matching profiles. The supplied mine-site photograph is used only as an illustrative image, not as evidence of the Chalinze project site. Public copies of the two supplied Tanzania Revenue Authority certificates are in `public/assets/corporate/`; taxpayer identifiers and signatures are redacted, and both are identified as documents issued to Gypsum Plus Mines Limited. Original source documents and unredacted tax certificates in the local `src/leadership/` folder are excluded from Git.

Profile, manufacturing-content, session and audit records are stored in `DATA_DIRECTORY/chalinze.sqlite`. Optimized WebP assets are served from `DATA_DIRECTORY/uploads/`; unmodified uploaded image originals are retained privately in `DATA_DIRECTORY/originals/`. Back up this directory and keep it private. Use HTTPS in production (`NODE_ENV=production`) so administrator cookies are Secure. Do not expose the SQLite file, private originals or `.env` file publicly.

The manufacturing experience is available at `/manufacturing` (and `/technology`). In the authenticated `/admin` area, administrators can edit the manufacturing page's structured JSON draft, preview its headline and six stages, and publish it separately from the live version. The server validates required sections and stage data, rejects media URLs that were not uploaded through the protected endpoint, and records draft saves/publication in the audit history. The media controls support approved JPEG/PNG/WebP photos (5 MB maximum) and MP4/WebM hero video (30 MB maximum); uploaded images are orientation-corrected, resized to at most 1800 × 1800 and converted to WebP for delivery while the original is retained privately. Approved photos can be assigned to the hero or an individual stage, and hero video is muted and loops. Save and review the draft before publishing. Use company-approved assets only. Content should be checked against the engineering and publication caveats in [docs/CONTENT_AUDIT.md](./docs/CONTENT_AUDIT.md).

The public leadership page follows the supplied roster and does not display biographies, qualifications, or responsibilities that have not been approved. The supplied profiles for Denis A. Kimaro and Mrs. Juliette Kimaro include a NextGen Cement Co. Ltd shareholder context, not a confirmed Chalinze shareholding. Upload future approved portraits through the administrator panel. Create content editors with `ADMIN_ROLE=editor` when bootstrapping their administrator account; the role is enforced on the API as well as in the interface.

The repository includes a Render Blueprint in `render.yaml`. Create or connect a Blueprint in the Render Dashboard to provision the Node Web Service in Singapore on the paid Starter plan, run a health check at `/healthz`, and deploy each pushed commit automatically. The configured persistent disk is mounted at `/var/data`, with `DATA_DIRECTORY=/var/data`; SQLite data and uploaded media/private originals therefore survive normal restarts and redeploys. The paid service and disk incur charges, and uninterrupted availability still depends on the Render account, billing status and provider operations.

During initial Blueprint creation, Render prompts for the `ADMIN_PASSWORD` marked `sync: false`; use a new unique password of at least 14 characters and keep it only in Render's private environment settings. The server hashes that password and creates the first administrator only when the persistent database has no administrator. Remove the bootstrap variable from the Render service after the first successful deployment. For an already-created service, manage the variable directly in Render because Blueprint `sync: false` values are only prompted on initial creation. Do not put credentials in the Blueprint, Git, chat, or logs. Back up the persistent disk regularly and verify the service's `/healthz` status after deployment.

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
