import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adminEmail = "site-admin@example.invalid";
const editorEmail = "site-editor@example.invalid";
const password = "Local-Test-Password-8026";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGO8I8fFwMDAxMDAwMDAAAANLAEImiPXaAAAAABJRU5ErkJggg==", "base64");

async function unusedPort() {
  const listener = net.createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const address = listener.address();
  if (!address || typeof address === "string") throw new Error("Could not allocate a test port.");
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function waitForServer(url, child) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Test server exited during startup (${child.exitCode}).`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error("Test server did not start within the timeout.");
}

async function login(base, email) {
  const response = await fetch(`${base}/api/admin/login`, {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`Administrator login failed (${response.status}).`);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("Administrator login did not return a session cookie.");
  return cookie;
}

test("leadership roles, authenticated editing, image uploads and publishing", async () => {
  const dataDirectory = path.join(root, "data", "test-run", `site-${process.pid}-${Date.now()}`);
  await fs.mkdir(dataDirectory, { recursive: true });
  const port = await unusedPort();
  const base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, DATA_DIRECTORY: dataDirectory, PORT: String(port), NODE_ENV: "test" };
  let server;

  try {
    server = spawn(process.execPath, ["server/index.js"], {
      cwd: root,
      env: { ...env, ADMIN_EMAIL: adminEmail, ADMIN_PASSWORD: password },
      stdio: "ignore",
    });
    await waitForServer(`${base}/api/admin/session`, server);
    const health = await fetch(`${base}/healthz`);
    if (!health.ok || (await health.json()).status !== "ok") throw new Error("The deployment health check did not report a healthy server.");
    const initialSession = await (await fetch(`${base}/api/admin/session`)).json();
    if (initialSession.configured !== true || initialSession.authenticated !== false) throw new Error("Initial administrator was not provisioned from private environment variables.");
    execFileSync(process.execPath, ["server/create-admin.js"], {
      cwd: root,
      env: { ...env, ADMIN_EMAIL: editorEmail, ADMIN_PASSWORD: password, ADMIN_ROLE: "editor" },
      stdio: "pipe",
    });

    const publicInitially = await (await fetch(`${base}/api/leadership`)).json();
    const expectedRoster = [
      ["board", "Mr. Amini N. Kimaro", "Chief Executive Officer/ Board Chairman"],
      ["board", "Dr. Humphrey Musyoka", "Director"],
      ["board", "Dr. Alfred C. Msemo", "Director"],
      ["board", "Denis A. Kimaro", "Director"],
      ["board", "Mrs. Juliette Kimaro", "Chief Legal Counsel"],
      ["board", "Technical Advisor", "Position Vacant"],
      ["management", "Harish Kumar", "position/title to be confirmed"],
      ["management", "Chief Finance Officer (CFO)", "name to be confirmed"],
      ["management", "Nickson Kimbori", "Operations - Logistics"],
      ["management", "Ridhiwani M. Mbaruku", "Mining Operations"],
      ["management", "Mr. Sospeter Urassa", "Chief Accountant"],
      ["management", "Godluck E. Urassa", "IT / Electrician Specialist"],
      ["management", "Mining Engineer", "Position Vacant"],
      ["management", "Geologist", "Position Vacant"],
      ["support", "Chief Cashier", "Chief Cashier"],
      ["support", "Drivers", "Drivers"],
      ["support", "Cleaners", "Cleaners"],
      ["support", "Machine Operators", "Machine Operators"],
    ];
    if (publicInitially.length !== expectedRoster.length) throw new Error(`Expected ${expectedRoster.length} public roster entries, received ${publicInitially.length}.`);
    const sourcedProfileIds = new Set(["leadership-1", "leadership-2", "leadership-5", "leadership-6", "leadership-9"]);
    for (const [section, name, title] of expectedRoster) {
      const profile = publicInitially.find((item) => item.name === name);
      if (profile?.section !== section || profile.title !== title) throw new Error(`${name} is missing from the correct public section or has an incorrect title.`);
      if (!sourcedProfileIds.has(profile.id) && (profile.biography || profile.background || profile.qualifications || profile.responsibilities)) {
        throw new Error(`${name} includes unsupported public profile details.`);
      }
    }
    if (sourcedProfileIds.size !== publicInitially.filter((profile) => sourcedProfileIds.has(profile.id) && profile.biography).length) {
      throw new Error("Profiles supported by source documents are missing their professional biographies.");
    }
    if (publicInitially.some((profile) => /shareholder|NextGen Cement/i.test(`${profile.biography} ${profile.background} ${profile.qualifications} ${profile.responsibilities}`))) {
      throw new Error("Unverified shareholder information from the supplied profiles was published.");
    }
    const manufacturingPublicInitially = await (await fetch(`${base}/api/manufacturing`)).json();

    const adminCookie = await login(base, adminEmail);
    const adminHeaders = { Cookie: adminCookie, Origin: base, "Content-Type": "application/json" };
    const protectedProfiles = await fetch(`${base}/api/admin/profiles`);
    if (protectedProfiles.status !== 401) throw new Error("Administrator profile endpoint is not protected.");
    const crossSiteLogout = await fetch(`${base}/api/admin/logout`, {
      method: "POST",
      headers: { Cookie: adminCookie, Origin: "https://untrusted.example.invalid" },
    });
    if (crossSiteLogout.status !== 403) throw new Error("Cross-origin state-changing request was not rejected.");
    const suppliedProfiles = await (await fetch(`${base}/api/admin/profiles`, { headers: { Cookie: adminCookie } })).json();
    const amini = suppliedProfiles.find((profile) => profile.name === "Mr. Amini N. Kimaro");
    const humphrey = suppliedProfiles.find((profile) => profile.name === "Dr. Humphrey Musyoka");
    const denis = suppliedProfiles.find((profile) => profile.name === "Denis A. Kimaro");
    const juliette = suppliedProfiles.find((profile) => profile.name === "Mrs. Juliette Kimaro");
    const nickson = suppliedProfiles.find((profile) => profile.name === "Nickson Kimbori");
    const ridhiwani = suppliedProfiles.find((profile) => profile.name === "Ridhiwani M. Mbaruku");
    const alfred = suppliedProfiles.find((profile) => profile.name === "Dr. Alfred C. Msemo");
    const advisor = suppliedProfiles.find((profile) => profile.name === "Technical Advisor");
    const managementRoles = expectedRoster.filter(([section]) => section === "management").map(([, name, title]) => [name, title]);
    const supportingRoles = ["Chief Cashier", "Drivers", "Cleaners", "Machine Operators"];
    if (amini?.status !== "published" || !amini.biography || !amini.responsibilities) throw new Error("Amini's supplied profile document details were not published.");
    if (amini?.photo_url !== "/assets/leadership/amini-n-kimaro.webp") throw new Error("Amini's supplied portrait was not seeded.");
    if (humphrey?.status !== "published" || humphrey.title !== "Director" || !humphrey.biography) throw new Error("Humphrey's sourced profile was not published as a Board Director.");
    if (denis?.section !== "board" || denis.placement !== "board" || denis.title !== "Director" || denis.status !== "published") throw new Error("Denis was not published as a Board Director.");
    if (denis?.photo_url !== "/assets/leadership/denis-a-kimaro.webp" || !denis.biography || !denis.qualifications) throw new Error("Denis's sourced profile and portrait were not seeded.");
    if (juliette?.section !== "board" || juliette.placement !== "board" || juliette.title !== "Chief Legal Counsel" || juliette.status !== "published") throw new Error("Juliette was not published as Board Chief Legal Counsel.");
    if (juliette?.photo_url !== "/assets/leadership/juliette-a-kimaro.webp" || !juliette.biography || !juliette.qualifications) throw new Error("Juliette's sourced profile and portrait were not seeded.");
    if (nickson?.status !== "published" || nickson.section !== "management" || nickson.title !== "Operations - Logistics" || nickson.photo_url || !nickson.biography) throw new Error("Nickson was not published only in Senior Management with sourced details.");
    if (ridhiwani?.name !== "Ridhiwani M. Mbaruku" || ridhiwani?.status !== "published" || ridhiwani.photo_url !== "/assets/leadership/ridhiwani-m-mbaruku.webp") throw new Error("Ridhiwani's supplied roster entry or portrait was not seeded.");
    if (alfred?.section !== "board" || alfred?.placement !== "board" || alfred?.title !== "Director") throw new Error("Alfred was not classified as a Board Director.");
    if (advisor?.section !== "board" || advisor?.placement !== "board" || !advisor.is_vacant || advisor.status !== "published") throw new Error("Technical Advisor vacancy was not published on the Board.");
    for (const [name, title] of managementRoles) {
      const profile = suppliedProfiles.find((item) => item.name === name);
      if (profile?.section !== "management" || profile.title !== title || profile.status !== "published") throw new Error(`${name} was not published in Senior Management.`);
    }
    for (const name of supportingRoles) {
      const profile = suppliedProfiles.find((item) => item.name === name);
      if (profile?.section !== "support" || profile.title !== name || profile.status !== "published") throw new Error(`${name} was not published only as Supporting Staff.`);
    }
    if (suppliedProfiles.filter((profile) => profile.section === "support").length !== supportingRoles.length) throw new Error("Non-support roles were included in Supporting Staff.");
    if (!amini) throw new Error("Amini's profile was not seeded.");
    const publishAmini = await fetch(`${base}/api/admin/profiles/${amini.id}`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ ...amini, status: "published" }),
    });
    if (!publishAmini.ok) throw new Error(`A supplied static portrait could not be published (${publishAmini.status}).`);
    const publishedRoster = await (await fetch(`${base}/api/leadership`)).json();
    const publishedAmini = publishedRoster.find((profile) => profile.id === amini.id);
    if (publishedAmini?.photo_url !== "/assets/leadership/amini-n-kimaro.webp") throw new Error("The published leadership page did not return Amini's supplied portrait.");
    if (publishedRoster.length !== expectedRoster.length) throw new Error("Publishing one profile changed the exact public roster.");

    const newProfile = {
      section: "management",
      placement: "board",
      name: "Integration Test Profile",
      title: "Test role",
      biography: "Test biography",
      background: "",
      qualifications: "",
      responsibilities: "",
      photo_url: "",
      is_vacant: false,
      status: "draft",
      sort_order: 999,
    };
    const createdResponse = await fetch(`${base}/api/admin/profiles`, {
      method: "POST", headers: adminHeaders, body: JSON.stringify(newProfile),
    });
    if (createdResponse.status !== 201) throw new Error(`Profile create failed (${createdResponse.status}).`);
    const created = await createdResponse.json();
    if ((await (await fetch(`${base}/api/leadership`)).json()).some((profile) => profile.id === created.id)) throw new Error("Draft profile appeared publicly.");

    const firstUpload = new FormData();
    firstUpload.append("photo", new Blob([png], { type: "image/png" }), "portrait.png");
    const uploaded = await fetch(`${base}/api/admin/upload`, { method: "POST", headers: { Cookie: adminCookie, Origin: base }, body: firstUpload });
    if (uploaded.status !== 201) throw new Error(`Portrait upload failed (${uploaded.status}).`);
    const firstPortrait = await uploaded.json();
    const optimizedImage = await fetch(`${base}${firstPortrait.photo_url}`);
    const optimizedImageBytes = Buffer.from(await optimizedImage.arrayBuffer());
    const optimizedMetadata = await sharp(optimizedImageBytes).metadata();
    if (optimizedImage.headers.get("content-type") !== "image/webp" || optimizedMetadata.format !== "webp" || optimizedMetadata.width > 1800 || optimizedMetadata.height > 1800) {
      throw new Error("Uploaded portrait was not optimized to the expected WebP delivery format.");
    }
    if ((await fs.readdir(path.join(dataDirectory, "originals"))).length !== 1) throw new Error("The unmodified uploaded portrait was not retained privately.");
    const invalidImage = new FormData();
    invalidImage.append("photo", new Blob([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" }), "invalid.png");
    const rejectedImage = await fetch(`${base}/api/admin/upload`, {
      method: "POST", headers: { Cookie: adminCookie, Origin: base }, body: invalidImage,
    });
    if (rejectedImage.status !== 400) throw new Error("Image file with a valid signature but invalid image content was accepted.");

    const publishData = { ...created, photo_url: firstPortrait.photo_url, status: "published", title: "Approved test title" };
    const publishProfile = await fetch(`${base}/api/admin/profiles/${created.id}`, {
      method: "PUT", headers: adminHeaders, body: JSON.stringify(publishData),
    });
    if (!publishProfile.ok) throw new Error(`Profile publication failed (${publishProfile.status}).`);
    let publicProfiles = await (await fetch(`${base}/api/leadership`)).json();
    let publicProfile = publicProfiles.find((profile) => profile.id === created.id);
    if (publicProfile?.title !== "Approved test title" || publicProfile.photo_url !== firstPortrait.photo_url) throw new Error("Published profile changes were not returned publicly.");

    const secondUpload = new FormData();
    secondUpload.append("photo", new Blob([png], { type: "image/png" }), "replacement.png");
    const replacement = await fetch(`${base}/api/admin/upload`, { method: "POST", headers: { Cookie: adminCookie, Origin: base }, body: secondUpload });
    if (replacement.status !== 201) throw new Error(`Portrait replacement upload failed (${replacement.status}).`);
    const replacementPortrait = await replacement.json();
    const updatedResponse = await fetch(`${base}/api/admin/profiles/${created.id}`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ ...publishData, title: "Updated test title", photo_url: replacementPortrait.photo_url }),
    });
    if (!updatedResponse.ok) throw new Error(`Profile update failed (${updatedResponse.status}).`);
    publicProfiles = await (await fetch(`${base}/api/leadership`)).json();
    publicProfile = publicProfiles.find((profile) => profile.id === created.id);
    if (publicProfile?.title !== "Updated test title" || publicProfile.photo_url !== replacementPortrait.photo_url) throw new Error("Updated profile details and portrait were not published.");

    const editorCookie = await login(base, editorEmail);
    const editorHeaders = { Cookie: editorCookie, Origin: base, "Content-Type": "application/json" };
    const forbiddenPublish = await fetch(`${base}/api/admin/profiles`, {
      method: "POST", headers: editorHeaders, body: JSON.stringify({ ...newProfile, name: "Editor Attempt", status: "published" }),
    });
    if (forbiddenPublish.status !== 403) throw new Error("Content editor was able to publish a profile.");
    const forbiddenDelete = await fetch(`${base}/api/admin/profiles/${created.id}`, {
      method: "DELETE", headers: { Cookie: editorCookie, Origin: base },
    });
    if (forbiddenDelete.status !== 403) throw new Error("Content editor was able to delete a profile.");
    const externalImage = await fetch(`${base}/api/admin/profiles`, {
      method: "POST", headers: editorHeaders, body: JSON.stringify({ ...newProfile, name: "External Image Attempt", photo_url: "https://example.invalid/portrait.jpg" }),
    });
    if (externalImage.status !== 400) throw new Error("External/unverified portrait URLs were accepted.");
    const forbiddenPublishedEdit = await fetch(`${base}/api/admin/profiles/${created.id}`, {
      method: "PUT", headers: editorHeaders, body: JSON.stringify({ ...publishData, status: "draft" }),
    });
    if (forbiddenPublishedEdit.status !== 403) throw new Error("Content editor was able to modify a published profile.");
    const manufacturingDraftResponse = await fetch(`${base}/api/admin/manufacturing`, { headers: { Cookie: editorCookie } });
    const manufacturingDraft = await manufacturingDraftResponse.json();
    const forbiddenManufacturingPublish = await fetch(`${base}/api/admin/manufacturing/publish`, {
      method: "POST", headers: { Cookie: editorCookie, Origin: base },
    });
    if (forbiddenManufacturingPublish.status !== 403) throw new Error("Content editor was able to publish manufacturing content.");
    manufacturingDraft.draft.introduction = `${manufacturingDraft.draft.introduction} [editor draft]`;
    const saveManufacturingDraft = await fetch(`${base}/api/admin/manufacturing`, {
      method: "PUT", headers: editorHeaders, body: JSON.stringify(manufacturingDraft.draft),
    });
    if (!saveManufacturingDraft.ok) throw new Error("Content editor could not save an unpublished manufacturing draft.");
    const stillUnpublished = await (await fetch(`${base}/api/manufacturing`)).json();
    if (stillUnpublished.introduction !== manufacturingPublicInitially.introduction) throw new Error("An editor's draft changed public manufacturing content.");
    const adminManufacturingPublish = await fetch(`${base}/api/admin/manufacturing/publish`, {
      method: "POST", headers: { Cookie: adminCookie, Origin: base },
    });
    if (!adminManufacturingPublish.ok) throw new Error("Administrator could not publish reviewed manufacturing content.");
    const manufacturingAfterPublish = await (await fetch(`${base}/api/manufacturing`)).json();
    if (manufacturingAfterPublish.introduction !== manufacturingDraft.draft.introduction) throw new Error("Published manufacturing content did not appear publicly.");
    const forbiddenEditorUndo = await fetch(`${base}/api/admin/undo`, { method: "POST", headers: { Cookie: editorCookie, Origin: base } });
    if (forbiddenEditorUndo.status !== 403) throw new Error("Content editor was able to undo a published change.");
    const undoManufacturing = await fetch(`${base}/api/admin/undo`, { method: "POST", headers: { Cookie: adminCookie, Origin: base } });
    if (!undoManufacturing.ok || (await (await fetch(`${base}/api/manufacturing`)).json()).introduction !== manufacturingPublicInitially.introduction) {
      throw new Error("Undo did not restore the prior published manufacturing content.");
    }
    const redoManufacturing = await fetch(`${base}/api/admin/redo`, { method: "POST", headers: { Cookie: adminCookie, Origin: base } });
    if (!redoManufacturing.ok || (await (await fetch(`${base}/api/manufacturing`)).json()).introduction !== manufacturingAfterPublish.introduction) {
      throw new Error("Redo did not reapply the manufacturing publication.");
    }

    const siteConfig = {
      version: 1,
      theme: { accent: "#1199aa", background: "#111111", panel: "#222222", headingFont: "Georgia", bodyFont: "Arial" },
      layout: "editorial",
      home: {
        heroEyebrow: "Test eyebrow", heroHeadline: "Test headline", heroDescription: "Test description",
        primaryAction: "Project", primaryPath: "/project", secondaryAction: "Company", secondaryPath: "/company",
        introEyebrow: "Test intro", introHeadline: "Introduction", introPrimary: "Primary copy", introSecondary: "Secondary copy",
        introAction: "Company", introPath: "/company", brandEyebrow: "Brand", brandLabel: "Brand label",
        brandHeadline: "Brand story", brandDescription: "Brand copy", brandCaveat: "Brand note",
        brandAction: "Company", brandPath: "/company",
      },
      headerAction: { label: "Investor relations", path: "/investment" },
      navigation: [{ label: "Main", links: [{ label: "Overview", path: "/" }, { label: "External", path: "https://example.com/" }] }],
      footer: { tagline: "Test footer", groups: [{ label: "Explore", links: [{ label: "Home", path: "/" }] }], email: "hello@example.com", phone: "+255 700 000 000", copyrightNote: "Tanzania" },
      pages: {},
    };
    const unsafeSiteConfig = { ...siteConfig, navigation: [{ label: "Main", links: [{ label: "Bad link", path: "javascript:alert(1)" }] }] };
    const rejectedSiteConfig = await fetch(`${base}/api/admin/site-config`, { method: "PUT", headers: editorHeaders, body: JSON.stringify(unsafeSiteConfig) });
    if (rejectedSiteConfig.status !== 400) throw new Error("Unsafe navigation URL was accepted by site configuration validation.");
    const saveSiteConfig = await fetch(`${base}/api/admin/site-config`, {
      method: "PUT", headers: editorHeaders, body: JSON.stringify(siteConfig),
    });
    if (!saveSiteConfig.ok) throw new Error("Content editor could not save a site-wide content draft.");
    const unchangedSiteConfig = await (await fetch(`${base}/api/site-config`)).json();
    if (unchangedSiteConfig.home?.heroHeadline) throw new Error("An editor's site-wide draft changed public content.");
    const forbiddenSitePublish = await fetch(`${base}/api/admin/site-config/publish`, {
      method: "POST", headers: { Cookie: editorCookie, Origin: base },
    });
    if (forbiddenSitePublish.status !== 403) throw new Error("Content editor was able to publish site-wide changes.");
    const publishSiteConfig = await fetch(`${base}/api/admin/site-config/publish`, {
      method: "POST", headers: { Cookie: adminCookie, Origin: base },
    });
    if (!publishSiteConfig.ok) throw new Error("Administrator could not publish site-wide content.");
    if ((await (await fetch(`${base}/api/site-config`)).json()).home.heroHeadline !== "Test headline") throw new Error("Published site configuration was not exposed through the public read-only API.");
    const undoSiteConfig = await fetch(`${base}/api/admin/undo`, { method: "POST", headers: { Cookie: adminCookie, Origin: base } });
    if (!undoSiteConfig.ok || (await (await fetch(`${base}/api/site-config`)).json()).home.heroHeadline) throw new Error("Site-wide undo did not restore the previous public content.");
    const redoSiteConfig = await fetch(`${base}/api/admin/redo`, { method: "POST", headers: { Cookie: adminCookie, Origin: base } });
    if (!redoSiteConfig.ok || (await (await fetch(`${base}/api/site-config`)).json()).home.heroHeadline !== "Test headline") throw new Error("Site-wide redo did not reapply the published content.");
    const malformedCookie = await fetch(`${base}/api/admin/profiles`, { headers: { Cookie: "csm_admin=%ZZ" } });
    if (malformedCookie.status !== 401) throw new Error("Malformed session cookie was not safely rejected.");

    const unpublishResponse = await fetch(`${base}/api/admin/profiles/${created.id}`, {
      method: "PUT", headers: adminHeaders, body: JSON.stringify({ ...publishData, status: "pending_approval" }),
    });
    if (!unpublishResponse.ok) throw new Error(`Profile unpublication failed (${unpublishResponse.status}).`);
    publicProfiles = await (await fetch(`${base}/api/leadership`)).json();
    if (publicProfiles.some((profile) => profile.id === created.id)) throw new Error("Unpublished profile remained publicly visible.");
    const undoProfileChange = await fetch(`${base}/api/admin/undo`, { method: "POST", headers: { Cookie: adminCookie, Origin: base } });
    publicProfiles = await (await fetch(`${base}/api/leadership`)).json();
    if (!undoProfileChange.ok || !publicProfiles.some((profile) => profile.id === created.id && profile.title === "Updated test title")) {
      throw new Error("Undo did not restore the last leadership profile change.");
    }
    const redoProfileChange = await fetch(`${base}/api/admin/redo`, { method: "POST", headers: { Cookie: adminCookie, Origin: base } });
    publicProfiles = await (await fetch(`${base}/api/leadership`)).json();
    if (!redoProfileChange.ok || publicProfiles.some((profile) => profile.id === created.id)) throw new Error("Redo did not reapply the leadership profile change.");

    const audit = await (await fetch(`${base}/api/admin/audit`, { headers: { Cookie: adminCookie } })).json();
    if (!audit.some((entry) => entry.profile_id === created.id && entry.action === "updated")) throw new Error("Profile editing was not recorded in the audit history.");
    if (!audit.some((entry) => entry.profile_id === "manufacturing-content" && entry.action === "manufacturing content published")) throw new Error("Manufacturing publication was not recorded in the audit history.");
    if (!audit.some((entry) => entry.profile_id === "site-config" && entry.action === "site-wide content published")) throw new Error("Site-wide publication was not recorded in the audit history.");
    if (!audit.some((entry) => entry.action.startsWith("undo: ") && entry.action.includes("Site-wide content published"))) throw new Error("Undo was not recorded as an audited reversal.");
  } finally {
    if (server && server.exitCode === null) {
      server.kill();
      await Promise.race([once(server, "exit"), new Promise((resolve) => setTimeout(resolve, 3000))]);
    }
    await fs.rm(dataDirectory, { recursive: true, force: true });
  }
});

test("legacy leadership database migration corrects unconfirmed governance records", async () => {
  const dataDirectory = path.join(root, "data", "test-run", `migration-${process.pid}-${Date.now()}`);
  await fs.mkdir(dataDirectory, { recursive: true });
  const database = new Database(path.join(dataDirectory, "chalinze.sqlite"));
  database.exec(`
    CREATE TABLE admins (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES admins(id), expires_at TEXT NOT NULL);
    CREATE TABLE profiles (
      id TEXT PRIMARY KEY, section TEXT NOT NULL, placement TEXT NOT NULL, name TEXT NOT NULL, title TEXT NOT NULL,
      biography TEXT NOT NULL DEFAULT '', background TEXT NOT NULL DEFAULT '', qualifications TEXT NOT NULL DEFAULT '',
      responsibilities TEXT NOT NULL DEFAULT '', photo_url TEXT NOT NULL DEFAULT '', is_vacant INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
    );
    CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id TEXT NOT NULL, admin_email TEXT NOT NULL, action TEXT NOT NULL, before_json TEXT, after_json TEXT, created_at TEXT NOT NULL);
    CREATE TABLE site_content (content_key TEXT PRIMARY KEY, published_json TEXT NOT NULL, draft_json TEXT NOT NULL, updated_by TEXT NOT NULL, updated_at TEXT NOT NULL);
  `);
  const oldRoster = [
    ["board", "Mr. Amini N. Kimaro", "Chief Executive Officer/ Board Chairman"],
    ["board", "Dr. Humphrey Musyoka", "Director"],
    ["board", "Dr. Alfred C. Msemo", "Director"],
    ["board", "Denis A. Kimaro", "Director"],
    ["board", "Mrs. Juliette Kimaro", "Chief Legal Counsel"],
    ["board", "Technical Advisor", "Position Vacant"],
    ["management", "Harish Kumar", "Position/title to be confirmed."],
    ["management", "Chief Finance Officer (CFO)", "Name to be confirmed."],
    ["management", "Nickson Kimbori", "Operations – Logistics"],
    ["management", "Ridhiwani M. Mbaruku", "Mining Operations"],
    ["management", "Mr. Sospeter Urassa", "Chief Accountant"],
    ["management", "Godluck E. Urassa", "IT / Electrician Specialist"],
    ["management", "Mining Engineer", "Position Vacant"],
    ["management", "Geologist", "Position Vacant"],
    ["support", "Chief Cashier", "Supporting Staff"],
    ["support", "Drivers", "Supporting Staff"],
    ["support", "Cleaners", "Supporting Staff"],
    ["support", "Machine Operators", "Supporting Staff"],
    ["management", "Unconfirmed legacy profile", "Unconfirmed role"],
  ];
  const insert = database.prepare(`INSERT INTO profiles
    (id,section,placement,name,title,is_vacant,status,sort_order,updated_at)
    VALUES (@id,@section,'board',@name,@title,@vacant,'published',@order,@now)`);
  const seededAt = new Date().toISOString();
  oldRoster.forEach(([section, name, title], index) => insert.run({
    id: `leadership-${index + 1}`,
    section,
    name,
    title,
    vacant: title === "Position Vacant" ? 1 : 0,
    order: (index + 1) * 10,
    now: seededAt,
  }));
  database.close();

  try {
    execFileSync(process.execPath, ["--input-type=module", "-e", "await import('./server/store.js')"], {
      cwd: root,
      env: { ...process.env, DATA_DIRECTORY: dataDirectory },
      stdio: "pipe",
    });
    const migrated = new Database(path.join(dataDirectory, "chalinze.sqlite"), { readonly: true });
    try {
      const profiles = migrated.prepare("SELECT * FROM profiles ORDER BY id").all();
      const denis = profiles.find((profile) => profile.name === "Denis A. Kimaro");
      const juliette = profiles.find((profile) => profile.name === "Mrs. Juliette Kimaro");
      const amini = profiles.find((profile) => profile.name === "Mr. Amini N. Kimaro");
      const humphrey = profiles.find((profile) => profile.name === "Dr. Humphrey Musyoka");
      const nickson = profiles.find((profile) => profile.name === "Nickson Kimbori");
      const ridhiwani = profiles.find((profile) => profile.name === "Ridhiwani M. Mbaruku");
      const unconfirmed = profiles.find((profile) => profile.name === "Unconfirmed legacy profile");
      const roles = migrated.pragma("table_info(admins)").map((column) => column.name);
      const migrations = migrated.prepare("SELECT COUNT(*) AS count FROM audit_log WHERE admin_email = 'system-migration'").get().count;
      if (profiles.length !== 19) throw new Error(`Expected 19 migrated profiles, received ${profiles.length}.`);
      if (!roles.includes("role")) throw new Error("Existing administrator schema did not gain role-based access.");
      if (denis?.section !== "board" || denis?.placement !== "board" || denis?.title !== "Director" || denis?.status !== "published") throw new Error("Existing Denis Board classification was not safely corrected.");
      if (juliette?.section !== "board" || juliette?.placement !== "board" || juliette?.title !== "Chief Legal Counsel" || juliette?.status !== "published") throw new Error("Existing Juliette Board classification was not safely corrected.");
      if (amini?.title !== "Chief Executive Officer/ Board Chairman" || amini.status !== "published") throw new Error("Amini's source title was not migrated for publication.");
      if (humphrey?.status !== "published" || humphrey.title !== "Director") throw new Error("Humphrey was not migrated as a confirmed Board Director.");
      if (nickson?.section !== "management" || nickson.title !== "Operations - Logistics" || nickson.status !== "published") throw new Error("Nickson was not migrated into Senior Management.");
      if (unconfirmed?.status === "published") throw new Error("An unconfirmed legacy profile remained in the supplied public roster.");
      if (profiles.filter((profile) => profile.status === "published").length !== 18) throw new Error("Legacy migration did not expose exactly the supplied roster.");
      if (!amini?.biography || !amini.responsibilities) throw new Error("Amini's supplied professional profile was not added to the existing database.");
      if (/shareholder|NextGen Cement/i.test(`${amini.biography} ${amini.background} ${amini.qualifications} ${amini.responsibilities}`)) {
        throw new Error("Unverified shareholder information was copied from Amini's profile.");
      }
      if (!humphrey?.biography || !denis?.biography || !juliette?.biography || !nickson?.biography) throw new Error("Verified source biographies were not added to existing leadership profiles.");
      if (profiles.filter((profile) => profile.status === "published" && !["leadership-1", "leadership-2", "leadership-5", "leadership-6", "leadership-9"].includes(profile.id)).some((profile) => profile.biography || profile.background || profile.qualifications || profile.responsibilities)) {
        throw new Error("Legacy migration added unsupported details to profiles without source material.");
      }
      if (amini?.photo_url !== "/assets/leadership/amini-n-kimaro.webp" || denis?.photo_url !== "/assets/leadership/denis-a-kimaro.webp" || juliette?.photo_url !== "/assets/leadership/juliette-a-kimaro.webp" || ridhiwani?.photo_url !== "/assets/leadership/ridhiwani-m-mbaruku.webp") throw new Error("Existing leadership profiles were not assigned the supplied portraits.");
      if (migrations < 24) throw new Error("Existing roster and sourced-detail updates were not entered in the audit history.");
    } finally {
      migrated.close();
    }
    const editable = new Database(path.join(dataDirectory, "chalinze.sqlite"));
    editable.prepare("UPDATE profiles SET title = 'Admin-edited title', status = 'published' WHERE id = 'leadership-3'").run();
    editable.prepare("UPDATE profiles SET biography = 'Admin-edited sourced biography' WHERE name = 'Denis A. Kimaro'").run();
    editable.prepare("UPDATE profiles SET responsibilities = 'Admin-edited responsibility' WHERE name = 'Mr. Amini N. Kimaro'").run();
    editable.close();
    execFileSync(process.execPath, ["--input-type=module", "-e", "await import('./server/store.js')"], {
      cwd: root,
      env: { ...process.env, DATA_DIRECTORY: dataDirectory },
      stdio: "pipe",
    });
    const rerun = new Database(path.join(dataDirectory, "chalinze.sqlite"), { readonly: true });
    try {
      const edited = rerun.prepare("SELECT title, status FROM profiles WHERE id = 'leadership-3'").get();
      if (edited?.title !== "Admin-edited title" || edited.status !== "published") throw new Error("Re-running roster migration overwrote administrator edits.");
      const sourcedEdit = rerun.prepare("SELECT biography FROM profiles WHERE name = 'Denis A. Kimaro'").get();
      if (sourcedEdit?.biography !== "Admin-edited sourced biography") throw new Error("Re-running source migration overwrote an administrator-edited biography.");
      const aminiEdit = rerun.prepare("SELECT responsibilities FROM profiles WHERE name = 'Mr. Amini N. Kimaro'").get();
      if (aminiEdit?.responsibilities !== "Admin-edited responsibility") throw new Error("Re-running source migration overwrote an administrator-edited responsibility.");
    } finally {
      rerun.close();
    }
  } finally {
    await fs.rm(dataDirectory, { recursive: true, force: true });
  }
});

test("production startup uses the configured local SQLite database without a hosted database URL", async () => {
  const dataDirectory = path.join(root, "data", "test-run", `production-sqlite-${process.pid}-${Date.now()}`);
  const env = { ...process.env, NODE_ENV: "production", DATA_DIRECTORY: dataDirectory };
  delete env.MYSQL_URL;
  await fs.mkdir(dataDirectory, { recursive: true });
  try {
    const output = execFileSync(process.execPath, [
      "--input-type=module",
      "-e",
      "const { ready, db } = await import('./server/store.js'); await ready; const row = await db.get('PRAGMA database_list'); console.log(row.file); await db.close();",
    ], { cwd: root, env, encoding: "utf8", stdio: "pipe" });
    if (!output.includes(path.join(dataDirectory, "chalinze.sqlite"))) throw new Error("Production did not open the SQLite database under DATA_DIRECTORY.");
  } finally {
    await fs.rm(dataDirectory, { recursive: true, force: true });
  }
});
