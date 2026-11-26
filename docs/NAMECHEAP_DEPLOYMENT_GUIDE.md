# Namecheap Setup and Deployment Guide

This guide covers two different ways to use Namecheap:

1. Keep the current production application on Cloudflare and use a Namecheap-registered domain.
2. Run a separate copy of the Node.js application on Namecheap hosting.

## Important: production data and hosting are separate

The current production site runs on a Cloudflare Worker and stores its published content, administrator accounts, uploads and other application data in Cloudflare D1. The repository also contains a legacy Express server that serves the site and API using a local SQLite database and files on disk.

The Node.js server does **not** connect to Cloudflare D1. A new Namecheap installation will not automatically contain the current production content, leadership records, administrator accounts or uploaded media. There is no supported D1-to-Node/SQLite importer in this repository. Do not point the live company domain to a fresh Namecheap installation until the data has been migrated and verified.

Uploading only the `dist/` folder to `public_html` is also not a complete deployment: the site needs its `/api/*` routes and uploaded media.

## Recommended: use Namecheap for the domain, keep Cloudflare hosting

This keeps the current application, D1 data, admin panel and uploads in place. Namecheap remains the registrar; Cloudflare provides DNS and serves the website.

1. Keep the current Cloudflare deployment online and back up your existing DNS records. Record any email-related MX, SPF, DKIM and DMARC records before changing nameservers.
2. Add the domain to the Cloudflare account that owns the Worker. Cloudflare will provide its assigned nameservers.
3. In Namecheap, open **Domain List → Manage → Nameservers**, select **Custom DNS**, enter the nameservers Cloudflare provided, and save. Nameserver changes can take time to propagate. Changing nameservers can replace the active DNS zone, so recreate any required email records in Cloudflare.
4. In Cloudflare, open the `chalinze-steel-mills` Worker’s **Settings → Domains & Routes** and add the domain as a custom domain. Follow Cloudflare’s verification and certificate prompts. Add the `www` hostname too if you want it to work, and configure one hostname to redirect to the other.
5. Test the custom domain, `/healthz`, `/admin`, the public pages and media before announcing or relying on it.

Do not guess at A-record IP addresses or point the domain at the `workers.dev` hostname as a substitute for configuring a Worker custom domain.

## Alternative: run the Node.js application in Namecheap cPanel

Use this route only if the Namecheap hosting plan includes **Setup Node.js App**, SSH/Terminal access, persistent writable storage and support for the project's native packages. The project requires Node.js `>=22 <23`; choose Node.js 22.x. Namecheap's current Node.js App guide lists Node 22.x, but available versions and features depend on the hosting plan.

### 1. Prepare the account and application files

1. Create a backup of the current production site and data before experimenting.
2. In cPanel, confirm **Setup Node.js App** is available and that the account can run Node.js 22.x applications.
3. Create a persistent private data directory outside the web root, for example:

   ```text
   /home/CPANEL_USER/private/chalinze-data
   ```

   The Node process must be able to write to it. Do not put the database or private uploads in `public_html`.
4. Transfer the repository using cPanel Git Version Control or SSH/SFTP. Include the source files, `package.json` and `package-lock.json`. Do not upload `.env`, production database files, `node_modules`, `.wrangler`, private originals or backup files.

### 2. Create the cPanel Node.js application

In **cPanel → Setup Node.js App → Create Application**, use settings similar to:

| Setting | Value |
| --- | --- |
| Node.js version | 22.x |
| Application mode | Production |
| Application root | The private repository directory |
| Application URL | The intended domain or subdomain |
| Application startup file | `server/index.js` |

Add these environment variables in the cPanel application settings:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATA_DIRECTORY` | The private writable directory created above |
| `ADMIN_EMAIL` | The approved administrator email |
| `ADMIN_PASSWORD` | A unique password of at least 14 characters for first-time administrator creation |

Do not put real passwords in this guide, source code, Git, screenshots or chat. cPanel supplies the application port; the server reads it from `PORT`.

### 3. Install, build and start

Use the virtual-environment activation command shown on the cPanel Node.js App page, then run these commands from the repository root:

```sh
npm ci
npm run build
```

Set the startup file to `server/index.js`, then start or restart the app from cPanel. The build installs and compiles the dependencies required by the server, including native packages. If installation fails because the plan cannot build or run them, ask Namecheap support or use a VPS rather than uploading Windows-built `node_modules`.

After the first administrator is created and you have confirmed you can sign in to `/admin`, remove `ADMIN_PASSWORD` from the application environment and restart the app. Keep `DATA_DIRECTORY` on persistent storage and arrange regular encrypted backups of that directory.

### 4. Connect the domain and verify

For Namecheap shared hosting, use the DNS settings supplied in your Namecheap hosting account. If you change the domain to Namecheap Web Hosting DNS, review and recreate any required email and verification records in cPanel's Zone Editor.

Enable HTTPS using the SSL options available for the hosting plan before using the admin panel. Then check:

- `https://YOUR_DOMAIN/` loads the site.
- `https://YOUR_DOMAIN/healthz` returns `{"status":"ok"}`.
- `https://YOUR_DOMAIN/api/site-config` returns site configuration.
- `https://YOUR_DOMAIN/admin` loads and accepts the initial administrator sign-in.
- Leadership, media uploads, page refreshes and nested URLs work.

Only switch the public domain after the Namecheap copy contains the verified production content and media. Keep the Cloudflare site and its backups until the new host has passed those checks and you have tested rollback.

## If using a Namecheap VPS

A VPS provides more control than shared cPanel hosting but also requires server administration. Install Node.js 22.x, deploy the repository, run `npm ci` and `npm run build`, and run `server/index.js` under a process manager such as systemd. Put the application behind a TLS-enabled reverse proxy, keep `DATA_DIRECTORY` on persistent private storage, restrict SSH access, and maintain tested backups. Complete the same data migration and verification steps before changing production DNS.

## Official references

- [Namecheap: How to work with Node.js App](https://www.namecheap.com/support/knowledgebase/article.aspx/10047/2182/how-to-work-with-nodejs-app/)
- [Namecheap: software versions on shared servers](https://www.namecheap.com/support/knowledgebase/article.aspx/129/22/what-version-of-the-software-is-used-on-our-servers)
- [Namecheap: change DNS for a domain](https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-to-change-dns-for-a-domain/)
- [Cloudflare: Worker custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
