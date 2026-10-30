# Chalinze Steel Mills Ltd website

Independent React, TypeScript, Vite and Three.js website project, kept separate from the UCC chatbot repository.

## Start the project

Requirements: Node.js 20.19+ and npm. The site includes a Node API, a persistent SQLite database and a protected leadership administration area.

For local development, start the API and Vite in separate PowerShell windows:

```powershell
npm install
npm run dev:server
```

```powershell
npm run dev
```

Open the Vite URL shown in the terminal. The Vite development server proxies the leadership and manufacturing-content APIs and uploaded media to the local Node server.

To run the production-style site locally, build and start the integrated server:

```powershell
npm run build
npm start
```

The server serves both the built website and its API on port `4173` by default. On Windows, `start.bat` installs dependencies if needed, builds the site when necessary, then starts the server.

## Leadership administration

The public leadership page is available at `/leadership`; the authenticated administration page is at `/admin`. The initial leadership roster is preloaded into the database as **Pending Approval**, so no profile appears publicly until an authorized administrator reviews and publishes it. Source-backed biographies and experience are included for Amini N. Kimaro, Denis Kimaro, Juliette A. Kimaro and Nickson Kimbori. No supplied portrait is assigned to a profile because identity and publication permission are not established by the archive. Harish Kumar and the CFO remain separate entries; the formal appointments of Denis, Juliette and Nickson require company confirmation.

Create the first administrator on the server:

1. Copy `.env.example` to `.env` and set `ADMIN_EMAIL` plus a unique password of at least 14 characters. `ADMIN_ROLE` may be `admin` (default) or `editor`.
2. Run `npm run admin:create` once.
3. Remove the bootstrap `ADMIN_PASSWORD` from `.env` after account creation. The password is stored as a salted scrypt hash; it is not needed to run the site.
4. Sign in at `/admin` to review profiles, upload company-approved portraits, edit profile content and ordering, preview changes, and inspect the audit history. Administrators may publish/archive profiles and manufacturing content; editors can prepare unpublished changes but cannot publish, delete profiles or edit an already published profile.

Profile, manufacturing-content and audit records are stored under `data/` by default. Optimized WebP assets are served from `data/uploads/`; unmodified uploaded image originals are retained privately in `data/originals/`. Set `DATA_DIRECTORY` to a persistent server volume before deployment. Back up this directory. The supplied server is designed for a single Node.js instance using persistent storage; use HTTPS in production (`NODE_ENV=production`) so administrator cookies are Secure. Do not expose the database, private originals or `.env` file publicly.

The manufacturing experience is available at `/manufacturing` (and `/technology`). In the authenticated `/admin` area, administrators can edit the manufacturing page's structured JSON draft, preview its headline and six stages, and publish it separately from the live version. The server validates required sections and stage data, rejects media URLs that were not uploaded through the protected endpoint, and records draft saves/publication in the audit history. The media controls support approved JPEG/PNG/WebP photos (5 MB maximum) and MP4/WebM hero video (30 MB maximum); uploaded images are orientation-corrected, resized to at most 1800 × 1800 and converted to WebP for delivery while the original is retained privately. Approved photos can be assigned to the hero or an individual stage, and hero video is muted and loops. Save and review the draft before publishing. Use company-approved assets only. Content should be checked against the engineering and publication caveats in [docs/CONTENT_AUDIT.md](./docs/CONTENT_AUDIT.md).

Leadership biographies from supplied profile documents are entered as Pending Approval. Supplied portraits remain unassigned until the company confirms the named individual and publication rights; upload the approved image through the administrator panel. Denis Kimaro's and Juliette A. Kimaro's supplied profiles identify a NextGen Cement Co. Ltd shareholder context, not a confirmed Chalinze Board appointment or Chalinze shareholding. Their classification is therefore subject to company approval. Create content editors with `ADMIN_ROLE=editor` when bootstrapping their administrator account; the role is enforced on the API as well as in the interface.

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
- The source-document contact details and map pins are labelled as requiring confirmation. The unverified `sales@chalinzesteelmills.co.tz` reference address is not treated as an approved functional contact.
- The supplied HTML design reference is not treated as a live company site. Its disabled enquiry form and unsupported finished-product, certification and capacity claims are not published as verified facts.

Obtain authorized confirmation of these items, photo rights/provenance, leadership titles and final visual/content approval before launch. Leadership content has its own administrative approval stage; only profiles marked Published appear on the public leadership page.
