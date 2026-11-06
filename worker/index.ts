/// <reference types="@cloudflare/workers-types" />
import express from "express";
import { AsyncLocalStorage } from "node:async_hooks";
import { once } from "node:events";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { Hono } from "hono";
import { httpServerHandler } from "cloudflare:node";
import manufacturingDefault from "../manufacturing-content.json";
import { connectHyperdrive, MysqlDatabase } from "./mysql";

type Bindings = {
  ASSETS: { fetch(request: Request): Promise<Response> };
  HYPERDRIVE: Hyperdrive;
  MEDIA: R2Bucket;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
};

type AdminSession = { id: string; email: string; role: "admin" | "editor"; expires_at: string };
type Variables = { admin: AdminSession; db: MysqlDatabase };
type AppEnv = { Bindings: Bindings; Variables: Variables };
type SqlValue = string | number | boolean | null | Uint8Array;
type WorkerContext = import("hono").Context<AppEnv>;
type ProfileRow = {
  id: string; section: string; placement: string; name: string; title: string; biography: string;
  background: string; qualifications: string; responsibilities: string; photo_url: string;
  is_vacant: number | boolean; status: string; sort_order: number; updated_at: string;
};
type ContentRow = { published_json: string; draft_json: string; updated_by: string; updated_at: string };
type SiteConfigState = { draft: unknown; published: unknown; updated_by: string; updated_at: string };
type ChangeEntry = {
  contentType: "profile" | "site-config" | "manufacturing";
  entityId: string;
  email: string;
  action: string;
  before: unknown | null;
  after: unknown | null;
};

const app = new Hono<AppEnv>();
const sessionLifetimeSeconds = 12 * 60 * 60;
const allowedSections = new Set(["board", "management", "support"]);
const allowedStatuses = new Set(["draft", "pending_approval", "published", "archived"]);
const allowedPlacements = new Set(["board", "governance"]);
const allowedManufacturingScenes = new Set(["ore", "beneficiation", "ironmaking", "steelmaking", "casting", "inspection"]);
const suppliedLeadershipPhotos = new Set([
  "/assets/leadership/amini-n-kimaro.webp",
  "/assets/leadership/denis-a-kimaro.webp",
  "/assets/leadership/juliette-a-kimaro.webp",
  "/assets/leadership/ridhiwani-m-mbaruku.webp",
]);
const sitePagePaths = new Set(["/company", "/project", "/products", "/infrastructure", "/sustainability", "/investment", "/markets", "/development", "/news", "/careers", "/faqs", "/contact"]);
const allowedLayouts = new Set(["cards", "editorial", "split"]);
const allowedFonts = new Set(["Manrope", "Arial", "Georgia", "Verdana", "Tahoma", "Trebuchet MS", "system-ui"]);
const defaultSiteConfig = {
  version: 1,
  theme: { accent: "#f47721", background: "#090a0c", panel: "#111418", headingFont: "Manrope", bodyFont: "Arial" },
  layout: "cards",
  home: {},
  navigation: [],
  footer: { tagline: "", groups: [], email: "", phone: "", copyrightNote: "" },
  pages: {},
};

app.use("*", async (context, next) => {
  const connection = await connectHyperdrive(context.env.HYPERDRIVE);
  context.set("db", new MysqlDatabase(connection));
  try {
    await next();
  } finally {
    await connection.end();
  }
});

function statement(db: MysqlDatabase, sql: string, ...values: SqlValue[]) {
  return db.prepare(sql).bind(...values);
}

async function one<T>(db: MysqlDatabase, sql: string, ...values: SqlValue[]) {
  return statement(db, sql, ...values).first<T>();
}

async function many<T>(db: MysqlDatabase, sql: string, ...values: SqlValue[]) {
  const result = await statement(db, sql, ...values).all<T>();
  return result.results;
}

function responseError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function profileFromRow(row: ProfileRow | null) {
  return row ? { ...row, is_vacant: Boolean(row.is_vacant) } : null;
}

function parseJson(value: string) {
  return JSON.parse(value) as unknown;
}

function contentState(row: ContentRow | null, fallback: unknown) {
  return row
    ? { published: parseJson(row.published_json), draft: parseJson(row.draft_json), updated_by: row.updated_by, updated_at: row.updated_at }
    : { published: fallback, draft: fallback, updated_by: "system", updated_at: new Date(0).toISOString() };
}

function isPlainText(value: unknown, maxLength = 10000, allowEmpty = true): value is string {
  return typeof value === "string" && value.length <= maxLength && (allowEmpty || Boolean(value.trim()));
}

function validSiteLink(link: unknown) {
  if (!link || typeof link !== "object" || Array.isArray(link)) return false;
  const candidate = link as { label?: unknown; path?: unknown };
  if (!isPlainText(candidate.label, 120, false) || !isPlainText(candidate.path, 500, false)) return false;
  const path = candidate.path;
  if (path.startsWith("/") && !path.startsWith("//") && /^\/[a-zA-Z0-9_./#?=&%-]*$/.test(path)) {
    try {
      const decoded = decodeURIComponent(path);
      return !decoded.startsWith("//") && !decoded.includes("\\") && !/[\u0000-\u001f]/.test(decoded);
    } catch {
      return false;
    }
  }
  try {
    const url = new URL(path);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function validateSiteConfig(config: unknown) {
  if (!config || typeof config !== "object" || Array.isArray(config) || !("version" in config) || config.version !== 1) return "A supported site configuration is required.";
  const value = config as Record<string, unknown>;
  const theme = value.theme as Record<string, unknown> | null;
  if (!theme || typeof theme !== "object") return "Choose valid global design settings.";
  for (const field of ["accent", "background", "panel"]) {
    if (typeof theme[field] !== "string" || !/^#[0-9a-f]{6}$/i.test(theme[field])) return `The ${field} color must be a six-digit hex color.`;
  }
  if (!allowedFonts.has(String(theme.headingFont)) || !allowedFonts.has(String(theme.bodyFont))) return "Choose a supported typography preset.";
  if (!allowedLayouts.has(String(value.layout))) return "Choose a valid page layout preset.";
  const homeFields = ["heroEyebrow", "heroHeadline", "heroDescription", "primaryAction", "primaryPath", "secondaryAction", "secondaryPath", "introEyebrow", "introHeadline", "introPrimary", "introSecondary", "introAction", "introPath", "brandEyebrow", "brandLabel", "brandHeadline", "brandDescription", "brandCaveat", "brandAction", "brandPath"];
  const home = value.home as Record<string, unknown> | null;
  if (!home || typeof home !== "object" || homeFields.some((field) => !isPlainText(home[field], 2000, false))) return "Complete all home-page content fields.";
  for (const field of ["primaryPath", "secondaryPath", "introPath", "brandPath"]) {
    if (!validSiteLink({ label: "Action", path: home[field] })) return `The home-page ${field} must be a safe internal or HTTPS link.`;
  }
  if (!validSiteLink(value.headerAction)) return "The header action must have a label and safe internal or HTTPS link.";
  const validGroups = (groups: unknown) => Array.isArray(groups) && groups.length > 0 && groups.length <= 12 && groups.every((group) =>
    group && typeof group === "object" && isPlainText(group.label, 120, false) &&
    Array.isArray(group.links) && group.links.length <= 20 && group.links.every(validSiteLink));
  if (!validGroups(value.navigation)) return "Navigation must contain valid groups and safe links.";
  const footer = value.footer as Record<string, unknown> | null;
  if (!footer || typeof footer !== "object" || !isPlainText(footer.tagline, 1000, false) || !validGroups(footer.groups) ||
      typeof footer.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(footer.email) ||
      !isPlainText(footer.phone, 80, false) || !isPlainText(footer.copyrightNote, 300, false)) return "Complete valid footer content and contact details.";
  if (!value.pages || typeof value.pages !== "object" || Array.isArray(value.pages)) return "Page content must be an object.";
  for (const [pathname, page] of Object.entries(value.pages)) {
    if (!sitePagePaths.has(pathname) || !page || typeof page !== "object" || !allowedLayouts.has(String(page.layout))) return `Unsupported content page: ${pathname}.`;
    if (!isPlainText(page.title, 500, false) || !isPlainText(page.eyebrow, 160, false) || !isPlainText(page.summary, 3000, false) ||
        !Array.isArray(page.sections) || page.sections.length > 30 ||
        page.sections.some((section: { title?: unknown; body?: unknown; tag?: unknown }) =>
          !section || !isPlainText(section.title, 300, false) || !isPlainText(section.body, 10000, false) || !isPlainText(section.tag ?? "", 160))) {
      return `The ${pathname} page has invalid title, summary or section content.`;
    }
  }
  return null;
}

function validateProfile(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return "A profile object is required.";
  const profile = input as Record<string, unknown>;
  if (!allowedSections.has(String(profile.section))) return "Choose a valid profile section.";
  if (!allowedPlacements.has(String(profile.placement))) return "Choose a valid governance placement.";
  if (!allowedStatuses.has(String(profile.status))) return "Choose a valid publication status.";
  if (!isPlainText(profile.name, 160, false)) return "Name is required and must be 160 characters or fewer.";
  if (!isPlainText(profile.title, 200, false)) return "Official position is required and must be 200 characters or fewer.";
  for (const field of ["biography", "background", "qualifications", "responsibilities", "photo_url"]) {
    if (!isPlainText(profile[field], 10000)) return `${field} must be text of 10,000 characters or fewer.`;
  }
  if (typeof profile.is_vacant !== "boolean") return "Vacant status must be true or false.";
  if (!Number.isInteger(profile.sort_order) || Number(profile.sort_order) < 0 || Number(profile.sort_order) > 100000) return "Order must be a whole number between 0 and 100000.";
  if (profile.is_vacant && profile.photo_url) return "Vacant positions cannot have a portrait.";
  if (profile.photo_url && !/^\/uploads\/[a-f0-9-]+\.(?:jpg|png|webp)$/i.test(String(profile.photo_url)) && !suppliedLeadershipPhotos.has(String(profile.photo_url))) {
    return "Portraits must use a supplied leadership portrait or uploaded JPEG, PNG or WebP image.";
  }
  return null;
}

function cleanProfile(input: Record<string, unknown>) {
  return {
    section: String(input.section),
    placement: String(input.placement),
    name: String(input.name).trim(),
    title: String(input.title).trim(),
    biography: String(input.biography).trim(),
    background: String(input.background).trim(),
    qualifications: String(input.qualifications).trim(),
    responsibilities: String(input.responsibilities).trim(),
    photo_url: String(input.photo_url).trim(),
    is_vacant: input.is_vacant ? 1 : 0,
    status: String(input.status),
    sort_order: Number(input.sort_order),
  };
}

function validateManufacturingContent(content: unknown) {
  if (!content || typeof content !== "object" || Array.isArray(content)) return "Manufacturing content must be a JSON object.";
  const value = content as Record<string, unknown>;
  for (const field of ["eyebrow", "headline", "introduction", "valueStatement", "approvalNote"]) {
    if (!isPlainText(value[field], 10000, false)) return `Manufacturing ${field} is required and must be 10,000 characters or fewer.`;
  }
  if (!Array.isArray(value.stages) || value.stages.length !== 6) return "The production journey must contain all six stages.";
  const stageIds = new Set<string>();
  for (const stage of value.stages) {
    if (!stage || typeof stage !== "object" || typeof stage.id !== "string" || stageIds.has(stage.id)) return "Each stage must have a unique ID.";
    stageIds.add(stage.id);
    for (const field of ["title", "shortTitle", "description", "status", "input", "output", "machinery", "technical"]) {
      if (!isPlainText(stage[field], 10000, false)) return `Every stage needs valid ${field} text.`;
    }
    if (!allowedManufacturingScenes.has(stage.scene)) return `Stage ${stage.id} has an unsupported scene.`;
    if (!Array.isArray(stage.operations) || stage.operations.some((operation: unknown) => typeof operation !== "string")) return `Stage ${stage.id} needs an operations list.`;
    if (!Array.isArray(stage.hotspots) || stage.hotspots.some((hotspot: { label?: unknown; detail?: unknown }) => typeof hotspot.label !== "string" || typeof hotspot.detail !== "string")) return `Stage ${stage.id} has an invalid hotspot list.`;
  }
  if (!Array.isArray(value.quality) || value.quality.length !== 6 || value.quality.some((item: { stageId?: unknown; title?: unknown; detail?: unknown }) => !item || typeof item.stageId !== "string" || typeof item.title !== "string" || typeof item.detail !== "string")) return "Quality assurance must map to all six production stages.";
  if (!Array.isArray(value.downstream) || !value.downstream.length || value.downstream.some((item: { id?: unknown; name?: unknown; description?: unknown; applications?: unknown; industries?: unknown; model?: unknown }) =>
    !item || typeof item.id !== "string" || typeof item.name !== "string" || typeof item.description !== "string" || typeof item.applications !== "string" || typeof item.industries !== "string" || !["bar", "coil", "beam", "rod", "component", "fabrication"].includes(String(item.model)))) return "At least one valid downstream product category is required.";
  for (const field of ["industries", "infrastructure", "sustainability"]) {
    if (!Array.isArray(value[field]) || value[field].some((item: { title?: unknown; detail?: unknown }) => !item || typeof item.title !== "string" || typeof item.detail !== "string")) return `The ${field} section must contain titled descriptions.`;
  }
  const billet = value.billet as { name?: unknown; dimensions?: unknown; specificationNote?: unknown } | null;
  if (!billet || typeof billet.name !== "string" || !Array.isArray(billet.dimensions) || !billet.dimensions.length ||
      billet.dimensions.some((item: { label?: unknown; width?: unknown; height?: unknown; status?: unknown }) => !item || typeof item.label !== "string" || typeof item.width !== "number" || typeof item.height !== "number" || typeof item.status !== "string") ||
      typeof billet.specificationNote !== "string") return "Billet product reference data is incomplete.";
  const media = value.media as { heroImage?: unknown; heroVideo?: unknown; stageImages?: unknown } | undefined;
  if (media) {
    if (typeof media !== "object" || Array.isArray(media)) return "Manufacturing media must be an object.";
    if (media.heroImage !== undefined && (typeof media.heroImage !== "string" || media.heroImage.length > 500 || (media.heroImage && !/^\/uploads\/[a-f0-9-]+\.(?:jpg|png|webp)$/i.test(media.heroImage)))) return "Manufacturing hero image must reference an uploaded image.";
    if (media.heroVideo !== undefined && (typeof media.heroVideo !== "string" || media.heroVideo.length > 500 || (media.heroVideo && !/^\/uploads\/[a-f0-9-]+\.(?:mp4|webm)$/i.test(media.heroVideo)))) return "Manufacturing hero video must reference an uploaded video.";
    if (media.stageImages !== undefined) {
      if (!media.stageImages || typeof media.stageImages !== "object" || Array.isArray(media.stageImages)) return "Manufacturing stage images must be an object.";
      for (const [stageId, url] of Object.entries(media.stageImages)) {
        if (!stageIds.has(stageId) || typeof url !== "string" || url.length > 500 || (url && !/^\/uploads\/[a-f0-9-]+\.(?:jpg|png|webp)$/i.test(url))) return "Each stage image must reference an uploaded image and a valid stage.";
      }
    }
  }
  return null;
}

function cookieToken(request: Request) {
  const item = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith("csm_admin="));
  if (!item) return "";
  try {
    return decodeURIComponent(item.slice("csm_admin=".length));
  } catch {
    return "";
  }
}

async function sha256(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 100000 }, key, 256);
  return [...new Uint8Array(bits)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function bootstrapAdmin(db: MysqlDatabase, env: Bindings) {
  const count = await one<{ count: number }>(db, "SELECT COUNT(*) AS count FROM admins");
  if (count?.count) return;
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 14 || password.length > 200) return;
  const salt = crypto.randomUUID();
  const hash = await passwordHash(password, salt);
  await statement(db,
    "INSERT IGNORE INTO admins (id, email, password_hash, password_salt, role, created_at) VALUES (?, ?, ?, ?, 'admin', ?)",
    crypto.randomUUID(), email, hash, salt, new Date().toISOString()).run();
}

async function getAdmin(request: Request, db: MysqlDatabase) {
  const token = cookieToken(request);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const session = await one<AdminSession>(db, `SELECT admins.id, admins.email, admins.role, sessions.expires_at
    FROM sessions JOIN admins ON admins.id = sessions.admin_id WHERE sessions.token_hash = ?`, tokenHash);
  if (!session || Date.parse(session.expires_at) <= Date.now()) {
    await statement(db, "DELETE FROM sessions WHERE token_hash = ?", tokenHash).run();
    return null;
  }
  return session;
}

function validateSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

async function logAudit(db: MysqlDatabase, profileId: string, email: string, action: string, before: unknown | null, after: unknown | null) {
  await statement(db,
    "INSERT INTO audit_log (profile_id, admin_email, action, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    profileId, email, action, before === null ? null : JSON.stringify(before), after === null ? null : JSON.stringify(after), new Date().toISOString()).run();
}

function historyStatements(db: MysqlDatabase, change: ChangeEntry) {
  return [
    statement(db, "UPDATE change_history SET state = 'superseded' WHERE state = 'undone'"),
    statement(db,
      "INSERT INTO change_history (content_type, entity_id, admin_email, action, before_json, after_json, state, created_at) VALUES (?, ?, ?, ?, ?, ?, 'applied', ?)",
      change.contentType, change.entityId, change.email, change.action,
      change.before === null ? null : JSON.stringify(change.before),
      change.after === null ? null : JSON.stringify(change.after),
      new Date().toISOString()),
  ];
}

async function saveContent(db: MysqlDatabase, key: "site-config" | "manufacturing", state: SiteConfigState, email: string, action: string) {
  const now = new Date().toISOString();
  const after = { ...state, updated_by: email, updated_at: now };
  const saveSql = key === "site-config"
    ? "INSERT INTO site_content (content_key, published_json, draft_json, updated_by, updated_at) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE draft_json=VALUES(draft_json), updated_by=VALUES(updated_by), updated_at=VALUES(updated_at)"
    : "INSERT INTO site_content (content_key, published_json, draft_json, updated_by, updated_at) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE draft_json=VALUES(draft_json), updated_by=VALUES(updated_by), updated_at=VALUES(updated_at)";
  await db.batch([
    statement(db, saveSql, key, JSON.stringify(state.published), JSON.stringify(state.draft), email, now),
    statement(db, "INSERT INTO audit_log (profile_id, admin_email, action, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      key, email, action, JSON.stringify(state), JSON.stringify(after), now),
    ...historyStatements(db, { contentType: key, entityId: key, email, action: action === "manufacturing draft updated" ? "Manufacturing draft updated" : "Site-wide content draft updated", before: state, after }),
  ]);
  return after;
}

async function publishContent(db: MysqlDatabase, key: "site-config" | "manufacturing", state: SiteConfigState, email: string, action: string) {
  const now = new Date().toISOString();
  const after = { ...state, published: state.draft, updated_by: email, updated_at: now };
  await db.batch([
    statement(db, "INSERT INTO site_content (content_key, published_json, draft_json, updated_by, updated_at) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE published_json=VALUES(published_json), updated_by=VALUES(updated_by), updated_at=VALUES(updated_at)",
      key, JSON.stringify(state.draft), JSON.stringify(state.draft), email, now),
    statement(db, "INSERT INTO audit_log (profile_id, admin_email, action, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      key, email, action, JSON.stringify(state), JSON.stringify(after), now),
    ...historyStatements(db, { contentType: key, entityId: key, email, action, before: state, after }),
  ]);
  return after;
}

app.onError((error, context) => {
  console.error("Cloudflare Worker request failed", { path: context.req.path, error });
  return responseError("The server could not complete the request.", 500);
});

app.use("/api/admin/*", async (context, next) => {
  const method = context.req.method;
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && !validateSameOrigin(context.req.raw)) {
    return context.json({ error: "Request origin could not be verified." }, 403);
  }
  const path = context.req.path;
  if (path === "/api/admin/session" || path === "/api/admin/login") return next();
  const admin = await getAdmin(context.req.raw, context.get('db'));
  if (!admin) return context.json({ error: "Administrator sign-in is required." }, 401);
  context.set("admin", admin);
  await next();
});

app.get("/healthz", async (context) => {
  const migration = await one<{ migration_key: string }>(context.get("db"),
    "SELECT migration_key FROM schema_migrations WHERE migration_key = ?", "mysql-0001-initial-schema");
  return migration ? context.json({ status: "ok" }) : context.json({ status: "unhealthy" }, 503);
});

app.get("/api/leadership", async (context) => {
  const rows = await many<ProfileRow>(context.get('db'), `SELECT * FROM profiles WHERE status = 'published'
    ORDER BY CASE section WHEN 'board' THEN 0 WHEN 'management' THEN 1 ELSE 2 END, sort_order, name`);
  return context.json(rows.map((row) => profileFromRow(row)));
});

app.get("/api/manufacturing", async (context) => {
  const row = await one<Pick<ContentRow, "published_json">>(context.get('db'), "SELECT published_json FROM site_content WHERE content_key = 'manufacturing'");
  return context.json(row ? parseJson(row.published_json) : manufacturingDefault);
});

app.get("/api/site-config", async (context) => {
  const row = await one<Pick<ContentRow, "published_json">>(context.get('db'), "SELECT published_json FROM site_content WHERE content_key = 'site-config'");
  return context.json(row ? parseJson(row.published_json) : defaultSiteConfig);
});

app.get("/api/admin/session", async (context) => {
  await bootstrapAdmin(context.get('db'), context.env);
  const admin = await getAdmin(context.req.raw, context.get('db'));
  const count = await one<{ count: number }>(context.get('db'), "SELECT COUNT(*) AS count FROM admins");
  return context.json({ authenticated: Boolean(admin), email: admin?.email ?? null, role: admin?.role ?? null, configured: Boolean(count?.count) });
});

app.post("/api/admin/login", async (context) => {
  await bootstrapAdmin(context.get('db'), context.env);
  const ip = context.req.header("cf-connecting-ip") || "unknown";
  const now = Date.now();
  await statement(context.get('db'), "DELETE FROM login_attempts WHERE attempted_at < ?", now - 15 * 60 * 1000).run();
  const currentAttempts = await one<{ count: number }>(context.get('db'),
    "SELECT COUNT(*) AS count FROM login_attempts WHERE ip = ? AND attempted_at >= ?", ip, now - 15 * 60 * 1000);
  if ((currentAttempts?.count ?? 0) >= 8) return context.json({ error: "Too many sign-in attempts. Try again in 15 minutes." }, 429);
  const body = await context.req.json<{ email?: unknown; password?: unknown }>();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (email.length > 254 || password.length > 200) return context.json({ error: "Email or password is incorrect." }, 401);
  const admin = await one<{ id: string; email: string; password_hash: string; password_salt: string; role: "admin" | "editor" }>(
    context.get('db'), "SELECT * FROM admins WHERE email = ?", email);
  const supplied = await passwordHash(password, admin?.password_salt ?? crypto.randomUUID());
  if (!admin || !constantTimeEqual(supplied, admin.password_hash)) {
    await statement(context.get('db'), "INSERT INTO login_attempts (ip, attempted_at) VALUES (?, ?)", ip, now).run();
    return context.json({ error: "Email or password is incorrect." }, 401);
  }
  await statement(context.get('db'), "DELETE FROM login_attempts WHERE ip = ?", ip).run();
  const token = crypto.randomUUID() + crypto.randomUUID();
  const expiresAt = new Date(now + sessionLifetimeSeconds * 1000).toISOString();
  await statement(context.get('db'), "INSERT INTO sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)",
    await sha256(token), admin.id, expiresAt).run();
  context.header("Set-Cookie", `csm_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${sessionLifetimeSeconds}`);
  return context.json({ authenticated: true, email: admin.email, role: admin.role });
});

app.post("/api/admin/logout", async (context) => {
  const token = cookieToken(context.req.raw);
  if (token) await statement(context.get('db'), "DELETE FROM sessions WHERE token_hash = ?", await sha256(token)).run();
  context.header("Set-Cookie", "csm_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0");
  return context.json({ authenticated: false });
});

app.get("/api/admin/profiles", async (context) => {
  const rows = await many<ProfileRow>(context.get('db'), "SELECT * FROM profiles ORDER BY section, sort_order, name");
  return context.json(rows.map((row) => profileFromRow(row)));
});

app.get("/api/admin/site-config", async (context) => {
  const row = await one<ContentRow>(context.get('db'), "SELECT published_json, draft_json, updated_by, updated_at FROM site_content WHERE content_key = 'site-config'");
  const state = contentState(row, defaultSiteConfig);
  return context.json({ draft: state.draft, published: state.published, updated_by: state.updated_by, updated_at: state.updated_at });
});

app.put("/api/admin/site-config", async (context) => {
  const body = await context.req.json();
  const issue = validateSiteConfig(body);
  if (issue) return context.json({ error: issue }, 400);
  const row = await one<ContentRow>(context.get('db'), "SELECT published_json, draft_json, updated_by, updated_at FROM site_content WHERE content_key = 'site-config'");
  const current = contentState(row, defaultSiteConfig);
  const after = await saveContent(context.get('db'), "site-config", { ...current, draft: body }, context.get("admin").email, "site-wide content draft updated");
  return context.json({ saved: true, updated_by: after.updated_by, updated_at: after.updated_at });
});

app.post("/api/admin/site-config/publish", async (context) => {
  const admin = context.get("admin");
  if (admin.role !== "admin") return context.json({ error: "Administrator privileges are required for this action." }, 403);
  const row = await one<ContentRow>(context.get('db'), "SELECT published_json, draft_json, updated_by, updated_at FROM site_content WHERE content_key = 'site-config'");
  const current = contentState(row, defaultSiteConfig);
  const issue = validateSiteConfig(current.draft);
  if (issue) return context.json({ error: issue }, 400);
  const after = await publishContent(context.get('db'), "site-config", current, admin.email, "site-wide content published");
  return context.json({ published: true, updated_by: after.updated_by, updated_at: after.updated_at });
});

app.post("/api/admin/profiles", async (context) => {
  const body = await context.req.json();
  const issue = validateProfile(body);
  if (issue) return context.json({ error: issue }, 400);
  const admin = context.get("admin");
  if (admin.role !== "admin" && body.status === "published") return context.json({ error: "Content editors cannot publish profiles." }, 403);
  const profile = cleanProfile(body);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const created = { id, ...profile, is_vacant: Boolean(profile.is_vacant), updated_at: now };
  await context.get('db').batch([
    statement(context.get('db'), `INSERT INTO profiles
      (id, section, placement, name, title, biography, background, qualifications, responsibilities, photo_url, is_vacant, status, sort_order, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, profile.section, profile.placement, profile.name, profile.title, profile.biography, profile.background,
    profile.qualifications, profile.responsibilities, profile.photo_url, profile.is_vacant, profile.status, profile.sort_order, now),
    statement(context.get('db'), "INSERT INTO audit_log (profile_id, admin_email, action, before_json, after_json, created_at) VALUES (?, ?, 'created', NULL, ?, ?)",
      id, admin.email, JSON.stringify(created), now),
    ...historyStatements(context.get('db'), { contentType: "profile", entityId: id, email: admin.email, action: `Created profile: ${created.name}`, before: null, after: created }),
  ]);
  return context.json(created, 201);
});

app.put("/api/admin/profiles/:id", async (context) => {
  const body = await context.req.json();
  const issue = validateProfile(body);
  if (issue) return context.json({ error: issue }, 400);
  const id = context.req.param("id");
  const before = profileFromRow(await one<ProfileRow>(context.get('db'), "SELECT * FROM profiles WHERE id = ?", id));
  if (!before) return context.json({ error: "Profile not found." }, 404);
  const admin = context.get("admin");
  if (admin.role !== "admin" && (before.status === "published" || body.status === "published")) {
    return context.json({ error: "Content editors cannot edit published profiles or publish changes." }, 403);
  }
  const profile = cleanProfile(body);
  const now = new Date().toISOString();
  const after = { id, ...profile, is_vacant: Boolean(profile.is_vacant), updated_at: now };
  await context.get('db').batch([
    statement(context.get('db'), `UPDATE profiles SET section=?, placement=?, name=?, title=?, biography=?, background=?,
      qualifications=?, responsibilities=?, photo_url=?, is_vacant=?, status=?, sort_order=?, updated_at=? WHERE id=?`,
    profile.section, profile.placement, profile.name, profile.title, profile.biography, profile.background,
    profile.qualifications, profile.responsibilities, profile.photo_url, profile.is_vacant, profile.status, profile.sort_order, now, id),
    statement(context.get('db'), "INSERT INTO audit_log (profile_id, admin_email, action, before_json, after_json, created_at) VALUES (?, ?, 'updated', ?, ?, ?)",
      id, admin.email, JSON.stringify(before), JSON.stringify(after), now),
    ...historyStatements(context.get('db'), { contentType: "profile", entityId: id, email: admin.email, action: `Updated profile: ${after.name}`, before, after }),
  ]);
  return context.json(after);
});

app.delete("/api/admin/profiles/:id", async (context) => {
  const admin = context.get("admin");
  if (admin.role !== "admin") return context.json({ error: "Administrator privileges are required for this action." }, 403);
  const id = context.req.param("id");
  const before = profileFromRow(await one<ProfileRow>(context.get('db'), "SELECT * FROM profiles WHERE id = ?", id));
  if (!before) return context.json({ error: "Profile not found." }, 404);
  const now = new Date().toISOString();
  await context.get('db').batch([
    statement(context.get('db'), "DELETE FROM profiles WHERE id = ?", id),
    statement(context.get('db'), "INSERT INTO audit_log (profile_id, admin_email, action, before_json, after_json, created_at) VALUES (?, ?, 'deleted', ?, NULL, ?)",
      id, admin.email, JSON.stringify(before), now),
    ...historyStatements(context.get('db'), { contentType: "profile", entityId: id, email: admin.email, action: `Deleted profile: ${before.name}`, before, after: null }),
  ]);
  return context.json({ deleted: true });
});

app.get("/api/admin/audit", async (context) => {
  const profileId = context.req.query("profileId") ?? "";
  const rows = profileId
    ? await many<Record<string, unknown>>(context.get('db'), "SELECT * FROM audit_log WHERE profile_id = ? ORDER BY id DESC LIMIT 200", profileId)
    : await many<Record<string, unknown>>(context.get('db'), "SELECT * FROM audit_log ORDER BY id DESC LIMIT 200");
  return context.json(rows.map((row) => ({
    ...row,
    before: row.before_json ? parseJson(String(row.before_json)) : null,
    after: row.after_json ? parseJson(String(row.after_json)) : null,
  })));
});

app.get("/api/admin/history", async (context) => {
  const undo = await one<{ id: number; action: string }>(context.get('db'), "SELECT id, action FROM change_history WHERE state = 'applied' ORDER BY id DESC LIMIT 1");
  const redo = await one<{ id: number; action: string }>(context.get('db'), "SELECT id, action FROM change_history WHERE state = 'undone' ORDER BY id ASC LIMIT 1");
  return context.json({ canUndo: Boolean(undo), canRedo: Boolean(redo), undoLabel: undo?.action ?? null, redoLabel: redo?.action ?? null });
});

async function restoreHistory(
  db: MysqlDatabase,
  contentType: string,
  entityId: string,
  value: unknown,
  email: string,
  action: string,
  current: unknown,
  historyId: number,
  state: "applied" | "undone",
) {
  const now = new Date().toISOString();
  const statements = [];
  if (contentType === "profile") {
    if (value === null) {
      statements.push(statement(db, "DELETE FROM profiles WHERE id = ?", entityId));
    } else {
      const profile = value as ProfileRow;
      statements.push(statement(db, `INSERT INTO profiles
        (id, section, placement, name, title, biography, background, qualifications, responsibilities, photo_url, is_vacant, status, sort_order, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE section=VALUES(section), placement=VALUES(placement), name=VALUES(name), title=VALUES(title),
        biography=VALUES(biography), background=VALUES(background), qualifications=VALUES(qualifications),
        responsibilities=VALUES(responsibilities), photo_url=VALUES(photo_url), is_vacant=VALUES(is_vacant),
        status=VALUES(status), sort_order=VALUES(sort_order), updated_at=VALUES(updated_at)`,
      profile.id, profile.section, profile.placement, profile.name, profile.title, profile.biography, profile.background,
      profile.qualifications, profile.responsibilities, profile.photo_url, profile.is_vacant ? 1 : 0,
      profile.status, profile.sort_order, profile.updated_at));
    }
  } else {
    const content = value as SiteConfigState;
    statements.push(statement(db, `INSERT INTO site_content (content_key, published_json, draft_json, updated_by, updated_at)
      VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE
      published_json=VALUES(published_json), draft_json=VALUES(draft_json), updated_by=VALUES(updated_by), updated_at=VALUES(updated_at)`,
    contentType === "site-config" ? "site-config" : "manufacturing",
    JSON.stringify(content.published), JSON.stringify(content.draft), content.updated_by, content.updated_at));
  }
  statements.push(statement(db, "INSERT INTO audit_log (profile_id, admin_email, action, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    entityId, email, action, current === null ? null : JSON.stringify(current), value === null ? null : JSON.stringify(value), now));
  statements.push(statement(db, "UPDATE change_history SET state = ? WHERE id = ?", state, historyId));
  await db.batch(statements);
}

app.post("/api/admin/:direction{undo|redo}", async (context) => {
  const admin = context.get("admin");
  if (admin.role !== "admin") return context.json({ error: "Administrator privileges are required to undo or redo published changes." }, 403);
  const direction = context.req.param("direction");
  const expected = direction === "undo" ? "applied" : "undone";
  const targetField = direction === "undo" ? "before_json" : "after_json";
  const order = direction === "undo" ? "DESC" : "ASC";
  const row = await one<Record<string, unknown>>(context.get('db'),
    `SELECT * FROM change_history WHERE state = ? ORDER BY id ${order} LIMIT 1`, expected);
  if (!row) return context.json({ error: `There is no change available to ${direction}.` }, 409);
  const contentType = String(row.content_type);
  const entityId = String(row.entity_id);
  const current = contentType === "profile"
    ? profileFromRow(await one<ProfileRow>(context.get('db'), "SELECT * FROM profiles WHERE id = ?", entityId))
    : contentState(await one<ContentRow>(context.get('db'), "SELECT published_json, draft_json, updated_by, updated_at FROM site_content WHERE content_key = ?", contentType === "site-config" ? "site-config" : "manufacturing"),
      contentType === "site-config" ? defaultSiteConfig : manufacturingDefault);
  const target = row[targetField] ? parseJson(String(row[targetField])) : null;
  const action = `${direction}: ${String(row.action)}`;
  await restoreHistory(context.get('db'), contentType, entityId, target, admin.email, action, current,
    Number(row.id), direction === "undo" ? "undone" : "applied");
  return context.json({ applied: direction, action: String(row.action) });
});

app.get("/api/admin/manufacturing", async (context) => {
  const row = await one<ContentRow>(context.get('db'), "SELECT published_json, draft_json, updated_by, updated_at FROM site_content WHERE content_key = 'manufacturing'");
  return context.json(contentState(row, manufacturingDefault));
});

app.put("/api/admin/manufacturing", async (context) => {
  const body = await context.req.json();
  const issue = validateManufacturingContent(body);
  if (issue) return context.json({ error: issue }, 400);
  const row = await one<ContentRow>(context.get('db'), "SELECT published_json, draft_json, updated_by, updated_at FROM site_content WHERE content_key = 'manufacturing'");
  const current = contentState(row, manufacturingDefault);
  const after = await saveContent(context.get('db'), "manufacturing", { ...current, draft: body }, context.get("admin").email, "manufacturing draft updated");
  return context.json({ saved: true, updated_by: after.updated_by, updated_at: after.updated_at });
});

app.post("/api/admin/manufacturing/publish", async (context) => {
  const admin = context.get("admin");
  if (admin.role !== "admin") return context.json({ error: "Administrator privileges are required for this action." }, 403);
  const row = await one<ContentRow>(context.get('db'), "SELECT published_json, draft_json, updated_by, updated_at FROM site_content WHERE content_key = 'manufacturing'");
  const current = contentState(row, manufacturingDefault);
  const issue = validateManufacturingContent(current.draft);
  if (issue) return context.json({ error: issue }, 400);
  const after = await publishContent(context.get('db'), "manufacturing", current, admin.email, "manufacturing content published");
  return context.json({ published: true, updated_by: after.updated_by, updated_at: after.updated_at });
});

function fileExtension(mime: string) {
  return ({ "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "video/mp4": ".mp4", "video/webm": ".webm" } as Record<string, string>)[mime] ?? "";
}

function signatureMatches(bytes: Uint8Array, mime: string) {
  const startsWith = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  if (mime === "image/jpeg") return startsWith(0xff, 0xd8, 0xff) && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  if (mime === "image/png") return startsWith(137, 80, 78, 71, 13, 10, 26, 10);
  if (mime === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (mime === "video/mp4") return bytes.length > 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
  if (mime === "video/webm") return startsWith(0x1a, 0x45, 0xdf, 0xa3);
  return false;
}

async function uploadMedia(context: WorkerContext, field: string, maxSize: number) {
  const form = await context.req.formData();
  const file = form.get(field);
  if (!(file instanceof File) || !file.size) return { error: "Choose an approved image or video to upload.", status: 400 as const };
  if (file.size > maxSize) return { error: maxSize <= 5 * 1024 * 1024 ? "Portrait images must be 5 MB or smaller." : "Manufacturing media files must be 30 MB or smaller.", status: 413 as const };
  const mime = file.type.toLowerCase();
  const extension = fileExtension(mime);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!extension || !signatureMatches(bytes, mime)) return { error: "Only valid JPEG, PNG, WebP, MP4, or WebM assets are accepted.", status: 400 as const };
  const key = `${crypto.randomUUID()}${extension}`;
  const uploadedBy = context.get("admin").email;
  await context.env.MEDIA.put(key, bytes, {
    httpMetadata: { contentType: mime, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { originalName: file.name.slice(0, 200) },
  });
  try {
    await statement(context.get("db"),
      "INSERT INTO uploads (object_key, content_type, size_bytes, original_name, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      key, mime, bytes.byteLength, file.name.slice(0, 255), uploadedBy, new Date().toISOString()).run();
  } catch (error) {
    try {
      await context.env.MEDIA.delete(key);
    } catch (deleteError) {
      throw new AggregateError([error, deleteError], "Upload metadata could not be saved and the R2 object could not be removed.");
    }
    throw error;
  }
  return { key, mime, type: mime.startsWith("video/") ? "video" as const : "image" as const };
}

app.post("/api/admin/upload", async (context) => {
  const uploaded = await uploadMedia(context, "photo", 5 * 1024 * 1024);
  if ("error" in uploaded) return context.json({ error: uploaded.error }, uploaded.status);
  return context.json({ photo_url: `/uploads/${uploaded.key}` }, 201);
});

app.post("/api/admin/manufacturing/media", async (context) => {
  const uploaded = await uploadMedia(context, "media", 30 * 1024 * 1024);
  if ("error" in uploaded) return context.json({ error: uploaded.error }, uploaded.status);
  return context.json({ media_url: `/uploads/${uploaded.key}`, media_type: uploaded.type }, 201);
});

app.delete("/api/admin/media/:key", async (context) => {
  const admin = context.get("admin");
  if (admin.role !== "admin") return context.json({ error: "Administrator privileges are required for this action." }, 403);
  const key = context.req.param("key");
  if (!/^[a-f0-9-]+\.(?:jpg|png|webp|mp4|webm)$/i.test(key)) return context.json({ error: "Invalid media object key." }, 400);
  const metadata = await one<{ object_key: string }>(context.get("db"), "SELECT object_key FROM uploads WHERE object_key = ?", key);
  if (!metadata) return context.json({ error: "Uploaded media was not found." }, 404);
  const url = `/uploads/${key}`;
  const references = await one<{ count: number }>(context.get("db"), `SELECT
    (SELECT COUNT(*) FROM profiles WHERE photo_url = ?) +
    (SELECT COUNT(*) FROM site_content WHERE published_json LIKE ? OR draft_json LIKE ?) +
    (SELECT COUNT(*) FROM audit_log WHERE before_json LIKE ? OR after_json LIKE ?) +
    (SELECT COUNT(*) FROM change_history WHERE before_json LIKE ? OR after_json LIKE ?) AS count`,
  url, `%${url}%`, `%${url}%`, `%${url}%`, `%${url}%`, `%${url}%`, `%${url}%`);
  if ((references?.count ?? 0) > 0) return context.json({ error: "Media is still referenced by application content or history." }, 409);
  await context.env.MEDIA.delete(key);
  await statement(context.get("db"), "DELETE FROM uploads WHERE object_key = ?", key).run();
  return context.json({ deleted: true });
});

app.get("/uploads/*", async (context) => {
  const key = decodeURIComponent(context.req.path.slice("/uploads/".length));
  if (!/^[a-f0-9-]+\.(?:jpg|png|webp|mp4|webm)$/i.test(key)) return context.notFound();
  const object = await context.env.MEDIA.get(key);
  if (!object) return context.notFound();
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Length", String(object.size));
  return new Response(object.body, { headers });
});

app.all("/api/*", (context) => responseError("API endpoint not found.", 404));

app.all("*", (context) => context.env.ASSETS.fetch(context.req.raw));

const requestScope = new AsyncLocalStorage<{ request: Request; env: Bindings; executionContext: ExecutionContext }>();
const expressServer = express();
expressServer.disable("x-powered-by");
expressServer.all("/{*path}", async (incoming, outgoing, next) => {
  const scope = requestScope.getStore();
  if (!scope) return outgoing.status(500).json({ error: "Worker request context is unavailable." });
  try {
    const headers = new Headers();
    const hopByHopHeaders = new Set([
      "connection", "content-length", "host", "keep-alive", "proxy-authenticate",
      "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade",
    ]);
    for (const [name, value] of Object.entries(incoming.headers)) {
      if (value && !hopByHopHeaders.has(name.toLowerCase())) {
        headers.set(name, Array.isArray(value) ? value.join(", ") : value);
      }
    }
    const body = ["GET", "HEAD"].includes(incoming.method ?? "GET")
      ? undefined
      : Readable.toWeb(incoming) as ReadableStream<Uint8Array>;
    const request = new Request(scope.request.url, { method: incoming.method, headers, body });
    const response = await app.fetch(request, scope.env, scope.executionContext);
    outgoing.statusCode = response.status;
    response.headers.forEach((value, name) => outgoing.setHeader(name, value));
    if (!response.body) {
      outgoing.end();
      return;
    }
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!outgoing.write(value)) await once(outgoing, "drain");
    }
    outgoing.end();
  } catch (error) {
    next(error);
  }
});
expressServer.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error("Express Worker adapter failed.", error);
  response.status(500).json({ error: "The server could not complete the request." });
});

const httpServer = createServer(expressServer);
httpServer.listen(8787);
const expressHandler = httpServerHandler(8787);
const handleExpressRequest = expressHandler.fetch;
if (!handleExpressRequest) throw new Error("Cloudflare's Express HTTP server handler has no fetch entry point.");

export default {
  fetch(request: Request<unknown, IncomingRequestCfProperties>, env: Bindings, executionContext: ExecutionContext) {
    return requestScope.run(
      { request, env, executionContext },
      () => handleExpressRequest(request, env, executionContext),
    );
  },
};
