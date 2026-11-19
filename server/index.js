import "dotenv/config";
import express from "express";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { db, originalMediaDirectory, profileFromRow, ready, recordChange, uploadDirectory, writeAudit } from "./store.js";

const app = express();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);
const sessionLifetimeMs = 12 * 60 * 60 * 1000;
const corporateDocumentMaxBytes = 1_800_000;
const corporateDocuments = {
  taxpayerCertificateOne: "Taxpayer Identification Certificate — copy 1",
  taxpayerCertificateTwo: "Taxpayer Identification Certificate — copy 2",
  vatCertificate: "VAT Registration Certificate",
};
const loginAttempts = new Map();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
const manufacturingMediaUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024, files: 1 } });
const visualGalleryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1_800_000, files: 1 } });
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
const allowedFonts = new Set(["Inter", "Manrope", "Arial", "Georgia", "Verdana", "Tahoma", "Trebuchet MS", "system-ui"]);

function isPlainText(value, maxLength = 10000, allowEmpty = true) {
  return typeof value === "string" && value.length <= maxLength && (allowEmpty || Boolean(value.trim()));
}

async function visualGalleryState(tx) {
  const row = await tx.get("SELECT published_json, draft_json, updated_by, updated_at FROM site_content WHERE content_key = 'visual-gallery'");
  return {
    draft: row ? JSON.parse(row.draft_json) : { items: [] },
    published: row ? JSON.parse(row.published_json) : { items: [] },
    updated_by: row?.updated_by ?? "system",
    updated_at: row?.updated_at ?? new Date(0).toISOString(),
  };
}

async function newsMediaState(tx) {
  const row = await tx.get("SELECT published_json, draft_json, updated_by, updated_at FROM site_content WHERE content_key = 'news-media'");
  return {
    draft: row ? JSON.parse(row.draft_json) : { items: [] },
    published: row ? JSON.parse(row.published_json) : { items: [] },
    updated_by: row?.updated_by ?? "system",
    updated_at: row?.updated_at ?? new Date(0).toISOString(),
  };
}

function validSiteLink(link) {
  if (!link || typeof link !== "object" || Array.isArray(link) || !isPlainText(link.label, 120, false) || !isPlainText(link.path, 500, false)) return false;
  if (link.path.startsWith("/") && !link.path.startsWith("//") && /^\/[a-zA-Z0-9_./#?=&%-]*$/.test(link.path)) {
    try {
      const decoded = decodeURIComponent(link.path);
      return !decoded.startsWith("//") && !decoded.includes("\\") && !/[\u0000-\u001f]/.test(decoded);
    } catch {
      return false;
    }
  }
  try {
    const url = new URL(link.path);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function validSiteGroups(groups) {
  return Array.isArray(groups) && groups.length > 0 && groups.length <= 12 && groups.every((group) =>
    group && typeof group === "object" && isPlainText(group.label, 120, false) &&
    Array.isArray(group.links) && group.links.length <= 20 && group.links.every(validSiteLink));
}

function validateSiteConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config) || config.version !== 1) return "A supported site configuration is required.";
  if (!config.theme || typeof config.theme !== "object") return "Choose valid global design settings.";
  for (const field of ["accent", "background", "panel"]) {
    if (typeof config.theme[field] !== "string" || !/^#[0-9a-f]{6}$/i.test(config.theme[field])) return `The ${field} color must be a six-digit hex color.`;
  }
  if (!allowedFonts.has(config.theme.headingFont) || !allowedFonts.has(config.theme.bodyFont)) return "Choose a supported typography preset.";
  if (config.theme.bodyFontSize !== undefined &&
      (!Number.isInteger(config.theme.bodyFontSize) || config.theme.bodyFontSize < 14 || config.theme.bodyFontSize > 20)) return "Choose a body font size between 14 and 20 pixels.";
  if (config.header !== undefined) {
    const header = config.header;
    if (!header || typeof header !== "object" || Array.isArray(header) ||
        !["stacked", "inline"].includes(header.layout) ||
        !Number.isInteger(header.height) || header.height < 130 || header.height > 220 ||
        !Number.isInteger(header.logoSize) || header.logoSize < 40 || header.logoSize > 100 ||
        !Number.isInteger(header.brandSize) || header.brandSize < 10 || header.brandSize > 18 ||
        !Number.isInteger(header.shadowBlur) || header.shadowBlur < 0 || header.shadowBlur > 48) {
      return "Choose valid header layout, sizing and shadow settings.";
    }
    for (const field of ["lightBackground", "lightText", "darkBackground", "darkText"]) {
      if (typeof header[field] !== "string" || !/^#[0-9a-f]{6}$/i.test(header[field])) return `The header ${field} must be a six-digit hex color.`;
    }
  }
  if (!allowedLayouts.has(config.layout)) return "Choose a valid page layout preset.";
  const homeFields = ["heroEyebrow", "heroHeadline", "heroDescription", "primaryAction", "primaryPath", "secondaryAction", "secondaryPath", "introEyebrow", "introHeadline", "introPrimary", "introSecondary", "introAction", "introPath", "brandEyebrow", "brandLabel", "brandHeadline", "brandDescription", "brandCaveat", "brandAction", "brandPath"];
  if (!config.home || typeof config.home !== "object" || homeFields.some((field) => !isPlainText(config.home[field], 2000, false))) return "Complete all home-page content fields.";
  for (const field of ["primaryPath", "secondaryPath", "introPath", "brandPath"]) {
    if (!validSiteLink({ label: "Action", path: config.home[field] })) return `The home-page ${field} must be a safe internal or HTTPS link.`;
  }
  if (!validSiteLink(config.headerAction)) return "The header action must have a label and safe internal or HTTPS link.";
  if (!validSiteGroups(config.navigation)) return "Navigation must contain valid groups and safe links.";
  if (!config.footer || typeof config.footer !== "object" || !isPlainText(config.footer.tagline, 1000, false) ||
      !validSiteGroups(config.footer.groups) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.footer.email) ||
      !isPlainText(config.footer.phone, 80, false) || !isPlainText(config.footer.copyrightNote, 300, false)) return "Complete valid footer content and contact details.";
  if (!config.pages || typeof config.pages !== "object" || Array.isArray(config.pages)) return "Page content must be an object.";
  for (const [pathname, page] of Object.entries(config.pages)) {
    if (!sitePagePaths.has(pathname) || !page || typeof page !== "object" || !allowedLayouts.has(page.layout)) return `Unsupported content page: ${pathname}.`;
    if (!isPlainText(page.title, 500, false) || !isPlainText(page.eyebrow, 160, false) || !isPlainText(page.summary, 3000, false) ||
        !Array.isArray(page.sections) || page.sections.length > 30 ||
        page.sections.some((section) => !section || !isPlainText(section.title, 300, false) || !isPlainText(section.body, 10000, false) || !isPlainText(section.tag ?? "", 160))) {
      return `The ${pathname} page has invalid title, summary or section content.`;
    }
  }
  return null;
}

function validateVisualGallery(content) {
  if (!content || typeof content !== "object" || Array.isArray(content) || !Array.isArray(content.items) || content.items.length > 24) {
    return "The visual gallery must be an object with no more than 24 media items.";
  }
  const ids = new Set();
  for (const item of content.items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return "Every gallery item must be a media object.";
    if (typeof item.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id) || ids.has(item.id)) return "Each gallery item must have a unique valid ID.";
    ids.add(item.id);
    if (!isPlainText(item.title, 120, false) || !isPlainText(item.category, 80, false) ||
        !isPlainText(item.description, 1200, false) || !isPlainText(item.alt, 300, false)) return "Complete each gallery item title, category, description and accessible media description.";
    if (item.mediaType !== "image" && item.mediaType !== "video") return "Choose image or video for each gallery item.";
    const extension = item.mediaType === "image" ? /\/uploads\/[a-f0-9-]+\.(?:jpg|png|webp)$/i : /\/uploads\/[a-f0-9-]+\.(?:mp4|webm)$/i;
    if (typeof item.mediaUrl !== "string" || item.mediaUrl.length > 500 || !extension.test(item.mediaUrl)) return "Gallery media must reference an uploaded file of the matching type.";
    if (!Number.isInteger(item.sortOrder) || item.sortOrder < 0 || item.sortOrder > 10000) return "Gallery order must be a whole number between 0 and 10000.";
  }
  return null;
}

function validateNewsMedia(content) {
  if (!content || typeof content !== "object" || Array.isArray(content) || !Array.isArray(content.items) || content.items.length > 30) {
    return "News & Media must be an object with no more than 30 items.";
  }
  const ids = new Set();
  for (const item of content.items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return "Every news item must be an object.";
    if (typeof item.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id) || ids.has(item.id)) return "Each news item must have a unique valid ID.";
    ids.add(item.id);
    if (!isPlainText(item.title, 160, false) || !isPlainText(item.category, 80, false) ||
        !isPlainText(item.description, 3000, false) || !isPlainText(item.alt, 300)) return "Complete each news item title, category and description.";
    if (!isPlainText(item.publishedAt, 10) || (item.publishedAt !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(item.publishedAt))) return "Publication dates must use YYYY-MM-DD.";
    if (item.mediaType === "" && item.mediaUrl === "") {
      if (item.alt !== "") return "Accessible media description is only used when media is attached.";
    } else {
      if (item.mediaType !== "image" && item.mediaType !== "video") return "Choose image or video for attached news media.";
      const extension = item.mediaType === "image" ? /\/uploads\/[a-f0-9-]+\.(?:jpg|png|webp)$/i : /\/uploads\/[a-f0-9-]+\.(?:mp4|webm)$/i;
      if (typeof item.mediaUrl !== "string" || item.mediaUrl.length > 500 || !extension.test(item.mediaUrl)) return "News media must reference an uploaded file of the matching type.";
      if (!isPlainText(item.alt, 300, false)) return "Add an accessible description for attached media.";
    }
    if (!Number.isInteger(item.sortOrder) || item.sortOrder < 0 || item.sortOrder > 10000) return "News item order must be a whole number between 0 and 10000.";
  }
  return null;
}

function siteConfigState(row) {
  return {
    draft: JSON.parse(row.draft_json),
    published: JSON.parse(row.published_json),
    updated_by: row.updated_by,
    updated_at: row.updated_at,
  };
}

async function manufacturingState(tx) {
  const row = await tx.get("SELECT published_json, draft_json, updated_by, updated_at FROM site_content WHERE content_key = 'manufacturing'");
  return {
    draft: JSON.parse(row.draft_json), published: JSON.parse(row.published_json),
    updated_by: row.updated_by, updated_at: row.updated_at,
  };
}

async function restoreHistoryState(tx, entry, value) {
  if (entry.content_type === "profile") {
    if (!value) {
      await tx.run("DELETE FROM profiles WHERE id = ?", entry.entity_id);
      return;
    }
    await tx.run(`INSERT INTO profiles
      (id, section, placement, name, title, biography, background, qualifications, responsibilities, photo_url, is_vacant, status, sort_order, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET section=excluded.section, placement=excluded.placement, name=excluded.name, title=excluded.title,
      biography=excluded.biography, background=excluded.background, qualifications=excluded.qualifications,
      responsibilities=excluded.responsibilities, photo_url=excluded.photo_url, is_vacant=excluded.is_vacant,
      status=excluded.status, sort_order=excluded.sort_order, updated_at=excluded.updated_at`,
    value.id, value.section, value.placement, value.name, value.title, value.biography, value.background,
    value.qualifications, value.responsibilities, value.photo_url, value.is_vacant ? 1 : 0,
    value.status, value.sort_order, value.updated_at);
    return;
  }
  if (entry.content_type === "site-config" || entry.content_type === "manufacturing" || entry.content_type === "visual-gallery" || entry.content_type === "news-media") {
    const contentKey = entry.content_type;
    const published = JSON.stringify(value.published);
    const draft = JSON.stringify(value.draft);
    await tx.run("UPDATE site_content SET published_json = ?, draft_json = ?, updated_by = ?, updated_at = ? WHERE content_key = ?",
      published, draft, value.updated_by, value.updated_at, contentKey);
  }
}

async function bootstrapInitialAdministrator() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const migrationKey = "initial-administrator-provisioned";
  await ready;
  if (await db.get("SELECT migration_key FROM applied_migrations WHERE migration_key = ?", migrationKey)) return;
  if (!email && !password) return;
  if (!email || !password) throw new Error("Set both ADMIN_EMAIL and ADMIN_PASSWORD for initial administrator setup.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("ADMIN_EMAIL must be a valid email address.");
  if (password.length < 14 || password.length > 200) throw new Error("ADMIN_PASSWORD must be between 14 and 200 characters.");

  const created = await db.transaction(async (tx) => {
    if (await tx.get("SELECT migration_key FROM applied_migrations WHERE migration_key = ?", migrationKey)) return false;
    if (await tx.get("SELECT id FROM admins LIMIT 1")) {
      await tx.run("INSERT INTO applied_migrations (migration_key, applied_at) VALUES (?, ?)", migrationKey, new Date().toISOString());
      return false;
    }

    const salt = crypto.randomBytes(32).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    await tx.run("INSERT INTO admins (id, email, password_hash, password_salt, role, created_at) VALUES (?, ?, ?, ?, 'admin', ?)",
      crypto.randomUUID(), email, hash, salt, new Date().toISOString());
    await tx.run("INSERT INTO applied_migrations (migration_key, applied_at) VALUES (?, ?)", migrationKey, new Date().toISOString());
    return true;
  });

  if (created) console.info(`Initial administrator ${email} created. Remove ADMIN_PASSWORD from the service environment after sign-in.`);
}

await ready;
await bootstrapInitialAdministrator();
app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));
app.use((request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Frame-Options", "DENY");
  next();
});

app.get("/healthz", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

function cookieToken(request) {
  const entry = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("csm_admin="));
  if (!entry) return "";
  try {
    return decodeURIComponent(entry.slice("csm_admin=".length));
  } catch {
    return "";
  }
}

async function getAdmin(request) {
  const token = cookieToken(request);
  if (!token) return null;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const session = await db.get(`
    SELECT admins.id, admins.email, admins.role, admins.password_change_required, sessions.expires_at
    FROM sessions JOIN admins ON admins.id = sessions.admin_id
    WHERE sessions.token_hash = ?
  `, hash);
  if (!session || Date.parse(session.expires_at) <= Date.now()) {
    await db.run("DELETE FROM sessions WHERE token_hash = ?", hash);
    return null;
  }
  return session;
}

async function requireAdmin(request, response, next) {
  const admin = await getAdmin(request);
  if (!admin) return response.status(401).json({ error: "Administrator sign-in is required." });
  request.admin = admin;
  if (admin.password_change_required && request.path !== "/api/admin/logout" && request.path !== "/api/admin/password") {
    return response.status(403).json({ error: "Change your temporary password before using the administration dashboard.", passwordChangeRequired: true });
  }
  next();
}

function requireAdministrator(request, response, next) {
  if (request.admin?.role !== "admin") return response.status(403).json({ error: "Administrator privileges are required for this action." });
  next();
}

function validateProfile(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return "A profile object is required.";
  if (!allowedSections.has(input.section)) return "Choose a valid profile section.";
  if (!allowedPlacements.has(input.placement)) return "Choose a valid governance placement.";
  if (!allowedStatuses.has(input.status)) return "Choose a valid publication status.";
  if (typeof input.name !== "string" || !input.name.trim() || input.name.length > 160) return "Name is required and must be 160 characters or fewer.";
  if (typeof input.title !== "string" || !input.title.trim() || input.title.length > 200) return "Official position is required and must be 200 characters or fewer.";
  for (const field of ["biography", "background", "qualifications", "responsibilities", "photo_url"]) {
    if (typeof input[field] !== "string" || input[field].length > 10000) return `${field} must be text of 10,000 characters or fewer.`;
  }
  if (typeof input.is_vacant !== "boolean") return "Vacant status must be true or false.";
  if (!Number.isInteger(input.sort_order) || input.sort_order < 0 || input.sort_order > 100000) return "Order must be a whole number between 0 and 100000.";
  if (input.is_vacant && input.photo_url) return "Vacant positions cannot have a portrait.";
  if (input.photo_url && !/^\/uploads\/[a-f0-9-]+\.(?:jpg|png|webp)$/i.test(input.photo_url) && !suppliedLeadershipPhotos.has(input.photo_url)) {
    return "Portraits must use a supplied leadership portrait or locally uploaded JPEG, PNG or WebP image.";
  }
  return null;
}

function cleanProfile(input) {
  return {
    section: input.section,
    placement: input.placement,
    name: input.name.trim(),
    title: input.title.trim(),
    biography: input.biography.trim(),
    background: input.background.trim(),
    qualifications: input.qualifications.trim(),
    responsibilities: input.responsibilities.trim(),
    photo_url: input.photo_url.trim(),
    is_vacant: input.is_vacant ? 1 : 0,
    status: input.status,
    sort_order: input.sort_order,
  };
}

function isImageSignature(file) {
  const bytes = file.buffer;
  if (file.mimetype === "image/jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  if (file.mimetype === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === "image/webp") return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  return false;
}

function imageExtension(mime) {
  return ({ "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" })[mime];
}

function validManufacturingMedia(file) {
  const bytes = file.buffer;
  if (isImageSignature(file)) return imageExtension(file.mimetype);
  if (file.mimetype === "video/mp4" && bytes.length > 12 && bytes.toString("ascii", 4, 8) === "ftyp") return ".mp4";
  if (file.mimetype === "video/webm" && bytes.length > 4 && bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return ".webm";
  return "";
}

async function optimizeUploadedImage(buffer) {
  return sharp(buffer, { limitInputPixels: 40_000_000, animated: false })
    .rotate()
    .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();
}

async function saveImageAsset(file, filename, optimized) {
  const originalPath = path.join(originalMediaDirectory, `${filename}${imageExtension(file.mimetype)}`);
  const optimizedPath = path.join(uploadDirectory, `${filename}.webp`);
  await fs.promises.writeFile(originalPath, file.buffer, { flag: "wx" });
  try {
    await fs.promises.writeFile(optimizedPath, optimized, { flag: "wx" });
  } catch (error) {
    await fs.promises.rm(originalPath, { force: true });
    throw error;
  }
  return `/uploads/${filename}.webp`;
}

function validateManufacturingContent(content) {
  if (!content || typeof content !== "object" || Array.isArray(content)) return "Manufacturing content must be a JSON object.";
  for (const field of ["eyebrow", "headline", "introduction", "valueStatement", "approvalNote"]) {
    if (typeof content[field] !== "string" || !content[field].trim() || content[field].length > 10000) return `Manufacturing ${field} is required and must be 10,000 characters or fewer.`;
  }
  if (!Array.isArray(content.stages) || content.stages.length !== 6) return "The production journey must contain all six stages.";
  const stageIds = new Set();
  for (const stage of content.stages) {
    if (!stage || typeof stage !== "object" || typeof stage.id !== "string" || stageIds.has(stage.id)) return "Each stage must have a unique ID.";
    stageIds.add(stage.id);
    for (const field of ["title", "shortTitle", "description", "status", "input", "output", "machinery", "technical"]) {
      if (typeof stage[field] !== "string" || !stage[field].trim() || stage[field].length > 10000) return `Every stage needs valid ${field} text.`;
    }
    if (!allowedManufacturingScenes.has(stage.scene)) return `Stage ${stage.id} has an unsupported scene.`;
    if (!Array.isArray(stage.operations) || stage.operations.some((operation) => typeof operation !== "string")) return `Stage ${stage.id} needs an operations list.`;
    if (!Array.isArray(stage.hotspots) || stage.hotspots.some((hotspot) => typeof hotspot.label !== "string" || typeof hotspot.detail !== "string")) return `Stage ${stage.id} has an invalid hotspot list.`;
  }
  if (!Array.isArray(content.quality) || content.quality.length !== 6 || content.quality.some((item) => !item || typeof item.stageId !== "string" || typeof item.title !== "string" || typeof item.detail !== "string")) return "Quality assurance must map to all six production stages.";
  if (!Array.isArray(content.downstream) || content.downstream.length === 0 || content.downstream.some((item) => !item || typeof item.id !== "string" || typeof item.name !== "string" || typeof item.description !== "string" || typeof item.applications !== "string" || typeof item.industries !== "string" || !["bar", "coil", "beam", "rod", "component", "fabrication", "mesh"].includes(item.model))) return "At least one valid downstream product category is required.";
  for (const field of ["industries", "infrastructure", "sustainability"]) {
    if (!Array.isArray(content[field]) || content[field].some((item) => !item || typeof item.title !== "string" || typeof item.detail !== "string")) return `The ${field} section must contain titled descriptions.`;
  }
  if (!content.billet || typeof content.billet.name !== "string" || !Array.isArray(content.billet.dimensions) || content.billet.dimensions.length === 0 || content.billet.dimensions.some((item) => !item || typeof item.label !== "string" || typeof item.width !== "number" || typeof item.height !== "number" || typeof item.status !== "string") || typeof content.billet.specificationNote !== "string") return "Billet product reference data is incomplete.";
  if (content.media !== undefined) {
    if (!content.media || typeof content.media !== "object" || Array.isArray(content.media)) return "Manufacturing media must be an object.";
    if (content.media.heroImage !== undefined && (typeof content.media.heroImage !== "string" || content.media.heroImage.length > 500 || (content.media.heroImage && !/^\/uploads\/[a-f0-9-]+\.(?:jpg|png|webp)$/i.test(content.media.heroImage)))) return "Manufacturing hero image must reference an uploaded image.";
    if (content.media.heroVideo !== undefined && (typeof content.media.heroVideo !== "string" || content.media.heroVideo.length > 500 || (content.media.heroVideo && !/^\/uploads\/[a-f0-9-]+\.(?:mp4|webm)$/i.test(content.media.heroVideo)))) return "Manufacturing hero video must reference an uploaded video.";
    if (content.media.stageImages !== undefined) {
      if (!content.media.stageImages || typeof content.media.stageImages !== "object" || Array.isArray(content.media.stageImages)) return "Manufacturing stage images must be an object.";
      for (const [stageId, url] of Object.entries(content.media.stageImages)) {
        if (!stageIds.has(stageId) || typeof url !== "string" || url.length > 500 || (url && !/^\/uploads\/[a-f0-9-]+\.(?:jpg|png|webp)$/i.test(url))) return "Each stage image must reference an uploaded image and a valid stage.";
      }
    }
  }
  return null;
}

app.get("/api/leadership", async (_request, response) => {
  const rows = await db.all(`
    SELECT * FROM profiles WHERE status = 'published'
    ORDER BY CASE section WHEN 'board' THEN 0 WHEN 'management' THEN 1 ELSE 2 END, sort_order, name
  `);
  response.json(rows.map(profileFromRow));
});

app.get("/api/manufacturing", async (_request, response) => {
  const row = await db.get("SELECT published_json FROM site_content WHERE content_key = 'manufacturing'");
  response.json(JSON.parse(row.published_json));
});

app.get("/api/site-config", async (_request, response) => {
  const row = await db.get("SELECT published_json FROM site_content WHERE content_key = 'site-config'");
  response.json(JSON.parse(row.published_json));
});

app.get("/api/visual-gallery", async (_request, response) => {
  const row = await db.get("SELECT published_json FROM site_content WHERE content_key = 'visual-gallery'");
  const gallery = row ? JSON.parse(row.published_json) : { items: [] };
  if (!gallery || typeof gallery !== "object" || !Array.isArray(gallery.items)) {
    return response.status(500).json({ error: "Published visual gallery content is invalid." });
  }
  response.setHeader("Cache-Control", "public, max-age=60");
  response.json({ items: gallery.items });
});

app.get("/api/news-media", async (_request, response) => {
  const row = await db.get("SELECT published_json FROM site_content WHERE content_key = 'news-media'");
  const news = row ? JSON.parse(row.published_json) : { items: [] };
  if (!news || typeof news !== "object" || !Array.isArray(news.items)) {
    return response.status(500).json({ error: "Published News & Media content is invalid." });
  }
  response.setHeader("Cache-Control", "public, max-age=60");
  response.json({ items: news.items });
});

app.get("/api/admin/session", async (request, response) => {
  const admin = await getAdmin(request);
  response.json({
    authenticated: Boolean(admin),
    email: admin?.email ?? null,
    role: admin?.role ?? null,
    passwordChangeRequired: Boolean(admin?.password_change_required),
    configured: Number((await db.get("SELECT COUNT(*) AS count FROM admins")).count) > 0,
  });
});

app.use("/api/admin", (request, response, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    const origin = request.get("origin");
    let sameOrigin = false;
    try {
      sameOrigin = Boolean(origin) && new URL(origin).host === request.get("host");
    } catch {
      sameOrigin = false;
    }
    if (!sameOrigin) return response.status(403).json({ error: "Request origin could not be verified." });
  }
  next();
});

app.post("/api/admin/login", async (request, response) => {
  const now = Date.now();
  const key = request.ip || request.socket.remoteAddress || "unknown";
  if (!loginAttempts.has(key) && loginAttempts.size >= 5000) {
    const oldestKey = loginAttempts.keys().next().value;
    if (oldestKey) loginAttempts.delete(oldestKey);
  }
  const attempts = loginAttempts.get(key) ?? [];
  const recentAttempts = attempts.filter((timestamp) => now - timestamp < 15 * 60 * 1000);
  if (recentAttempts.length >= 8) return response.status(429).json({ error: "Too many sign-in attempts. Try again in 15 minutes." });
  const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const password = typeof request.body?.password === "string" ? request.body.password : "";
  if (email.length > 254 || password.length > 200) {
    loginAttempts.set(key, recentAttempts);
    return response.status(401).json({ error: "Email or password is incorrect." });
  }
  const admin = await db.get("SELECT * FROM admins WHERE email = ?", email);
  const supplied = crypto.scryptSync(password, admin?.password_salt ?? "chalinze-login-fallback", 64);
  const expected = admin ? Buffer.from(admin.password_hash, "hex") : Buffer.alloc(64);
  const valid = supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
  if (!admin || !valid) {
    recentAttempts.push(now);
    loginAttempts.set(key, recentAttempts);
    return response.status(401).json({ error: "Email or password is incorrect." });
  }

  loginAttempts.delete(key);
  const token = crypto.randomBytes(32).toString("base64url");
  const expiry = new Date(now + sessionLifetimeMs).toISOString();
  await db.run("INSERT INTO sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)",
    crypto.createHash("sha256").update(token).digest("hex"),
    admin.id,
    expiry,
  );
  response.setHeader("Set-Cookie", `csm_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(sessionLifetimeMs / 1000)}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  response.json({ authenticated: true, email: admin.email, role: admin.role, passwordChangeRequired: Boolean(admin.password_change_required) });
});

app.get("/api/admin/users", requireAdmin, requireAdministrator, async (_request, response) => {
  const users = await db.all("SELECT id, email, role, created_at FROM admins ORDER BY created_at, email");
  response.setHeader("Cache-Control", "no-store");
  response.json(users);
});

app.post("/api/admin/users", requireAdmin, requireAdministrator, async (request, response) => {
  const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const role = request.body?.role;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response.status(400).json({ error: "Enter a valid email address." });
  }
  if (role !== "admin" && role !== "editor") return response.status(400).json({ error: "Choose either the Administrator or Content editor role." });
  if (await db.get("SELECT id FROM admins WHERE email = ?", email)) return response.status(409).json({ error: "An account with this email already exists." });

  const temporaryPassword = crypto.randomBytes(24).toString("base64url");
  const passwordSalt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto.scryptSync(temporaryPassword, passwordSalt, 64).toString("hex");
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  try {
    await db.run(`INSERT INTO admins (id, email, password_hash, password_salt, role, created_at, password_change_required)
      VALUES (?, ?, ?, ?, ?, ?, 1)`, id, email, passwordHash, passwordSalt, role, createdAt);
  } catch (cause) {
    if (cause?.code === "SQLITE_CONSTRAINT_UNIQUE") return response.status(409).json({ error: "An account with this email already exists." });
    throw cause;
  }
  await writeAudit({ profileId: `admin:${id}`, email: request.admin.email, action: "administrator account created", before: null, after: { email, role } });
  response.status(201).setHeader("Cache-Control", "no-store");
  response.json({ id, email, role, created_at: createdAt, temporaryPassword });
});

app.get("/api/admin/visual-gallery", requireAdmin, async (_request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.json(await visualGalleryState(db));
});

app.put("/api/admin/visual-gallery", requireAdmin, async (request, response) => {
  const issue = validateVisualGallery(request.body);
  if (issue) return response.status(400).json({ error: issue });
  const before = await visualGalleryState(db);
  const updatedAt = new Date().toISOString();
  const after = { ...before, draft: request.body, updated_by: request.admin.email, updated_at: updatedAt };
  await db.transaction(async (tx) => {
    await tx.run("INSERT INTO site_content (content_key, published_json, draft_json, updated_by, updated_at) VALUES ('visual-gallery', ?, ?, ?, ?) ON CONFLICT(content_key) DO UPDATE SET draft_json=excluded.draft_json, updated_by=excluded.updated_by, updated_at=excluded.updated_at",
      JSON.stringify(before.published), JSON.stringify(request.body), request.admin.email, updatedAt);
    await writeAudit({ tx, profileId: "visual-gallery", email: request.admin.email, action: "visual gallery draft updated", before, after });
    await recordChange(tx, { contentType: "visual-gallery", entityId: "visual-gallery", email: request.admin.email, action: "Visual gallery draft updated", before, after });
  });
  response.json({ saved: true, updated_by: request.admin.email, updated_at: updatedAt });
});

app.post("/api/admin/visual-gallery/publish", requireAdmin, requireAdministrator, async (request, response) => {
  const current = await visualGalleryState(db);
  const issue = validateVisualGallery(current.draft);
  if (issue) return response.status(400).json({ error: issue });
  const updatedAt = new Date().toISOString();
  const after = { ...current, published: current.draft, updated_by: request.admin.email, updated_at: updatedAt };
  await db.transaction(async (tx) => {
    await tx.run("INSERT INTO site_content (content_key, published_json, draft_json, updated_by, updated_at) VALUES ('visual-gallery', ?, ?, ?, ?) ON CONFLICT(content_key) DO UPDATE SET published_json=excluded.published_json, draft_json=excluded.draft_json, updated_by=excluded.updated_by, updated_at=excluded.updated_at",
      JSON.stringify(current.draft), JSON.stringify(current.draft), request.admin.email, updatedAt);
    await writeAudit({ tx, profileId: "visual-gallery", email: request.admin.email, action: "visual gallery published", before: current, after });
    await recordChange(tx, { contentType: "visual-gallery", entityId: "visual-gallery", email: request.admin.email, action: "Visual gallery published", before: current, after });
  });
  response.json({ published: true, updated_by: request.admin.email, updated_at: updatedAt });
});

app.get("/api/admin/news-media", requireAdmin, async (_request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.json(await newsMediaState(db));
});

app.put("/api/admin/news-media", requireAdmin, async (request, response) => {
  const issue = validateNewsMedia(request.body);
  if (issue) return response.status(400).json({ error: issue });
  const before = await newsMediaState(db);
  const updatedAt = new Date().toISOString();
  const after = { ...before, draft: request.body, updated_by: request.admin.email, updated_at: updatedAt };
  await db.transaction(async (tx) => {
    await tx.run("INSERT INTO site_content (content_key, published_json, draft_json, updated_by, updated_at) VALUES ('news-media', ?, ?, ?, ?) ON CONFLICT(content_key) DO UPDATE SET draft_json=excluded.draft_json, updated_by=excluded.updated_by, updated_at=excluded.updated_at",
      JSON.stringify(before.published), JSON.stringify(request.body), request.admin.email, updatedAt);
    await writeAudit({ tx, profileId: "news-media", email: request.admin.email, action: "news & media draft updated", before, after });
    await recordChange(tx, { contentType: "news-media", entityId: "news-media", email: request.admin.email, action: "News & Media draft updated", before, after });
  });
  response.json({ saved: true, updated_by: request.admin.email, updated_at: updatedAt });
});

app.post("/api/admin/news-media/publish", requireAdmin, requireAdministrator, async (request, response) => {
  const current = await newsMediaState(db);
  const issue = validateNewsMedia(current.draft);
  if (issue) return response.status(400).json({ error: issue });
  const updatedAt = new Date().toISOString();
  const after = { ...current, published: current.draft, updated_by: request.admin.email, updated_at: updatedAt };
  await db.transaction(async (tx) => {
    await tx.run("INSERT INTO site_content (content_key, published_json, draft_json, updated_by, updated_at) VALUES ('news-media', ?, ?, ?, ?) ON CONFLICT(content_key) DO UPDATE SET published_json=excluded.published_json, draft_json=excluded.draft_json, updated_by=excluded.updated_by, updated_at=excluded.updated_at",
      JSON.stringify(current.draft), JSON.stringify(current.draft), request.admin.email, updatedAt);
    await writeAudit({ tx, profileId: "news-media", email: request.admin.email, action: "news & media published", before: current, after });
    await recordChange(tx, { contentType: "news-media", entityId: "news-media", email: request.admin.email, action: "News & Media published", before: current, after });
  });
  response.json({ published: true, updated_by: request.admin.email, updated_at: updatedAt });
});

app.post("/api/admin/password", requireAdmin, async (request, response) => {
  const password = typeof request.body?.password === "string" ? request.body.password : "";
  if (password.length < 14 || password.length > 200) return response.status(400).json({ error: "Choose a password between 14 and 200 characters." });
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(cookieToken(request)).digest("hex");
  await db.transaction(async (tx) => {
    await tx.run("UPDATE admins SET password_hash = ?, password_salt = ?, password_change_required = 0 WHERE id = ?", hash, salt, request.admin.id);
    await tx.run("DELETE FROM sessions WHERE admin_id = ? AND token_hash != ?", request.admin.id, tokenHash);
    await tx.run("INSERT INTO audit_log (profile_id, admin_email, action, before_json, after_json, created_at) VALUES (?, ?, ?, NULL, ?, ?)",
      `admin:${request.admin.id}`, request.admin.email, "account password changed", JSON.stringify({ passwordChangeRequired: false }), new Date().toISOString());
  });
  response.setHeader("Cache-Control", "no-store");
  response.json({ passwordChanged: true });
});

app.post("/api/admin/logout", requireAdmin, async (request, response) => {
  const token = cookieToken(request);
  await db.run("DELETE FROM sessions WHERE token_hash = ?", crypto.createHash("sha256").update(token).digest("hex"));
  response.setHeader("Set-Cookie", "csm_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0");
  response.json({ authenticated: false });
});

app.get("/api/admin/profiles", requireAdmin, async (_request, response) => {
  const profiles = await db.all("SELECT * FROM profiles ORDER BY section, sort_order, name");
  response.json(profiles.map(profileFromRow));
});

app.get("/api/admin/corporate-documents", requireAdmin, requireAdministrator, async (_request, response) => {
  const rows = await db.all("SELECT document_key, size_bytes, updated_at FROM corporate_documents");
  const stored = new Map(rows.map((row) => [row.document_key, row]));
  response.setHeader("Cache-Control", "no-store");
  response.json(Object.entries(corporateDocuments).map(([id, label]) => ({
    id,
    label,
    stored: stored.has(id),
    size_bytes: stored.get(id)?.size_bytes ?? null,
    updated_at: stored.get(id)?.updated_at ?? null,
  })));
});

app.put("/api/admin/corporate-documents/:key", requireAdmin, requireAdministrator, (request, response, next) => {
  if (!request.is("application/pdf")) return response.status(415).json({ error: "Upload a PDF certificate." });
  next();
}, express.raw({ type: "application/pdf", limit: corporateDocumentMaxBytes }), async (request, response) => {
  const { key } = request.params;
  if (!Object.hasOwn(corporateDocuments, key)) return response.status(404).json({ error: "Unknown corporate certificate." });
  if (!Buffer.isBuffer(request.body) || !request.body.length || request.body.length > corporateDocumentMaxBytes) {
    return response.status(413).json({ error: "PDF files must be non-empty and 1.8 MB or smaller." });
  }
  if (request.body.subarray(0, 5).toString("ascii") !== "%PDF-") {
    return response.status(400).json({ error: "The uploaded file is not a valid PDF." });
  }
  const now = new Date().toISOString();
  await db.run(`INSERT INTO corporate_documents
    (document_key, content_type, size_bytes, document_data, uploaded_by, updated_at)
    VALUES (?, 'application/pdf', ?, ?, ?, ?)
    ON CONFLICT(document_key) DO UPDATE SET content_type = excluded.content_type,
      size_bytes = excluded.size_bytes, document_data = excluded.document_data,
      uploaded_by = excluded.uploaded_by, updated_at = excluded.updated_at`,
  key, request.body.length, request.body, request.admin.email, now);
  await writeAudit({ profileId: `corporate-document:${key}`, email: request.admin.email, action: "private corporate certificate uploaded", before: null, after: { size_bytes: request.body.length, updated_at: now } });
  response.setHeader("Cache-Control", "no-store");
  response.json({ uploaded: true, id: key, size_bytes: request.body.length, updated_at: now });
});

app.get("/api/admin/corporate-documents/:key", requireAdmin, requireAdministrator, async (request, response) => {
  const { key } = request.params;
  if (!Object.hasOwn(corporateDocuments, key)) return response.status(404).json({ error: "Corporate certificate was not found." });
  const row = await db.get("SELECT document_data, size_bytes FROM corporate_documents WHERE document_key = ?", key);
  if (!row) return response.status(404).json({ error: "Corporate certificate was not found." });
  const bytes = Buffer.from(row.document_data);
  if (bytes.length !== row.size_bytes || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
    return response.status(500).json({ error: "Stored certificate is incomplete." });
  }
  await writeAudit({ profileId: `corporate-document:${key}`, email: request.admin.email, action: "private corporate certificate viewed", before: null, after: null });
  response.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": 'inline; filename="corporate-certificate.pdf"',
    "Cache-Control": "private, no-store, max-age=0",
    "Pragma": "no-cache",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'",
    "Content-Length": String(bytes.length),
  });
  response.send(bytes);
});

app.get("/api/admin/site-config", requireAdmin, async (_request, response) => {
  const row = await db.get("SELECT published_json, draft_json, updated_by, updated_at FROM site_content WHERE content_key = 'site-config'");
  response.json(siteConfigState(row));
});

app.put("/api/admin/site-config", requireAdmin, async (request, response) => {
  const issue = validateSiteConfig(request.body);
  if (issue) return response.status(400).json({ error: issue });
  const before = siteConfigState(await db.get("SELECT published_json, draft_json, updated_by, updated_at FROM site_content WHERE content_key = 'site-config'"));
  const updatedAt = new Date().toISOString();
  const after = { ...before, draft: request.body, updated_by: request.admin.email, updated_at: updatedAt };
  await db.transaction(async (tx) => {
    await tx.run("UPDATE site_content SET draft_json = ?, updated_by = ?, updated_at = ? WHERE content_key = 'site-config'",
      JSON.stringify(request.body), request.admin.email, updatedAt);
    await writeAudit({ tx, profileId: "site-config", email: request.admin.email, action: "site-wide content draft updated", before, after });
    await recordChange(tx, { contentType: "site-config", entityId: "site-config", email: request.admin.email, action: "Site-wide content draft updated", before, after });
  });
  response.json({ saved: true, updated_by: request.admin.email, updated_at: updatedAt });
});

app.post("/api/admin/site-config/publish", requireAdmin, requireAdministrator, async (request, response) => {
  const current = siteConfigState(await db.get("SELECT published_json, draft_json, updated_by, updated_at FROM site_content WHERE content_key = 'site-config'"));
  const issue = validateSiteConfig(current.draft);
  if (issue) return response.status(400).json({ error: issue });
  const updatedAt = new Date().toISOString();
  const after = { ...current, published: current.draft, updated_by: request.admin.email, updated_at: updatedAt };
  await db.transaction(async (tx) => {
    await tx.run("UPDATE site_content SET published_json = draft_json, updated_by = ?, updated_at = ? WHERE content_key = 'site-config'",
      request.admin.email, updatedAt);
    await writeAudit({ tx, profileId: "site-config", email: request.admin.email, action: "site-wide content published", before: current, after });
    await recordChange(tx, { contentType: "site-config", entityId: "site-config", email: request.admin.email, action: "Site-wide content published", before: current, after });
  });
  response.json({ published: true, updated_by: request.admin.email, updated_at: updatedAt });
});

app.post("/api/admin/profiles", requireAdmin, async (request, response) => {
  const issue = validateProfile(request.body);
  if (issue) return response.status(400).json({ error: issue });
  if (request.admin.role !== "admin" && request.body.status === "published") return response.status(403).json({ error: "Content editors cannot publish profiles." });
  const profile = cleanProfile(request.body);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const created = await db.transaction(async (tx) => {
    await tx.run(`
      INSERT INTO profiles (id, section, placement, name, title, biography, background, qualifications, responsibilities, photo_url, is_vacant, status, sort_order, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      id, profile.section, profile.placement, profile.name, profile.title, profile.biography,
      profile.background, profile.qualifications, profile.responsibilities, profile.photo_url,
      profile.is_vacant, profile.status, profile.sort_order, now);
    const created = profileFromRow(await tx.get("SELECT * FROM profiles WHERE id = ?", id));
    await writeAudit({ tx, profileId: id, email: request.admin.email, action: "created", before: null, after: created });
    await recordChange(tx, { contentType: "profile", entityId: id, email: request.admin.email, action: `Created profile: ${created.name}`, before: null, after: created });
    return created;
  });
  response.status(201).json(created);
});

app.put("/api/admin/profiles/:id", requireAdmin, async (request, response) => {
  const issue = validateProfile(request.body);
  if (issue) return response.status(400).json({ error: issue });
  const before = profileFromRow(await db.get("SELECT * FROM profiles WHERE id = ?", request.params.id));
  if (!before) return response.status(404).json({ error: "Profile not found." });
  if (request.admin.role !== "admin" && (before.status === "published" || request.body.status === "published")) {
    return response.status(403).json({ error: "Content editors cannot edit published profiles or publish changes." });
  }
  const profile = cleanProfile(request.body);
  const after = await db.transaction(async (tx) => {
    const updatedAt = new Date().toISOString();
    await tx.run(`UPDATE profiles SET section=?, placement=?, name=?, title=?, biography=?, background=?,
      qualifications=?, responsibilities=?, photo_url=?, is_vacant=?, status=?, sort_order=?, updated_at=? WHERE id=?`,
    profile.section, profile.placement, profile.name, profile.title, profile.biography, profile.background,
    profile.qualifications, profile.responsibilities, profile.photo_url, profile.is_vacant, profile.status,
    profile.sort_order, updatedAt, before.id);
    const after = profileFromRow(await tx.get("SELECT * FROM profiles WHERE id = ?", before.id));
    await writeAudit({ tx, profileId: before.id, email: request.admin.email, action: "updated", before, after });
    await recordChange(tx, { contentType: "profile", entityId: before.id, email: request.admin.email, action: `Updated profile: ${after.name}`, before, after });
    return after;
  });
  response.json(after);
});

app.delete("/api/admin/profiles/:id", requireAdmin, requireAdministrator, async (request, response) => {
  const before = profileFromRow(await db.get("SELECT * FROM profiles WHERE id = ?", request.params.id));
  if (!before) return response.status(404).json({ error: "Profile not found." });
  await db.transaction(async (tx) => {
    await tx.run("DELETE FROM profiles WHERE id = ?", before.id);
    await writeAudit({ tx, profileId: before.id, email: request.admin.email, action: "deleted", before, after: null });
    await recordChange(tx, { contentType: "profile", entityId: before.id, email: request.admin.email, action: `Deleted profile: ${before.name}`, before, after: null });
  });
  response.json({ deleted: true });
});

app.get("/api/admin/audit", requireAdmin, async (request, response) => {
  const profileId = typeof request.query.profileId === "string" ? request.query.profileId : "";
  const rows = profileId
    ? await db.all("SELECT * FROM audit_log WHERE profile_id = ? ORDER BY id DESC LIMIT 200", profileId)
    : await db.all("SELECT * FROM audit_log ORDER BY id DESC LIMIT 200");
  response.json(rows.map((row) => ({
    ...row,
    before: row.before_json ? JSON.parse(row.before_json) : null,
    after: row.after_json ? JSON.parse(row.after_json) : null,
  })));
});

app.get("/api/admin/history", requireAdmin, async (_request, response) => {
  const undo = await db.get("SELECT id, action FROM change_history WHERE state = 'applied' ORDER BY id DESC LIMIT 1");
  const redo = await db.get("SELECT id, action FROM change_history WHERE state = 'undone' ORDER BY id ASC LIMIT 1");
  response.json({ canUndo: Boolean(undo), canRedo: Boolean(redo), undoLabel: undo?.action ?? null, redoLabel: redo?.action ?? null });
});

app.get("/api/admin/export", requireAdmin, requireAdministrator, async (_request, response) => {
  const [profiles, siteContent, auditLog, changeHistory, administrators] = await Promise.all([
    db.all("SELECT * FROM profiles ORDER BY id"),
    db.all("SELECT * FROM site_content ORDER BY content_key"),
    db.all("SELECT * FROM audit_log ORDER BY id"),
    db.all("SELECT * FROM change_history ORDER BY id"),
    db.all("SELECT id, email, role, created_at FROM admins ORDER BY email"),
  ]);
  const uploads = fs.readdirSync(uploadDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^[a-f0-9-]+\.(?:jpg|png|webp|mp4|webm)$/i.test(entry.name))
    .map((entry) => {
      const extension = path.extname(entry.name).slice(1).toLowerCase();
      const contentType = ({ jpg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4", webm: "video/webm" })[extension];
      return {
        key: entry.name,
        url: `/uploads/${entry.name}`,
        content_type: contentType,
        size_bytes: fs.statSync(path.join(uploadDirectory, entry.name)).size,
        original_name: entry.name,
        uploaded_by: "render-migration",
        created_at: fs.statSync(path.join(uploadDirectory, entry.name)).mtime.toISOString(),
      };
    });
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Disposition", `attachment; filename="chalinze-render-export-${new Date().toISOString().slice(0, 10)}.json"`);
  response.json({
    format_version: 1,
    exported_at: new Date().toISOString(),
    profiles,
    site_content: siteContent,
    audit_log: auditLog,
    change_history: changeHistory,
    administrators,
    uploads,
    sessions_exported: false,
    login_attempts_exported: false,
  });
});

async function applyHistory(request, response, direction) {
  if (request.admin.role !== "admin") return response.status(403).json({ error: "Administrator privileges are required to undo or redo published changes." });
  const expectedState = direction === "undo" ? "applied" : "undone";
  const targetField = direction === "undo" ? "before_json" : "after_json";
  const outcome = await db.transaction(async (tx) => {
    const historyRow = await tx.get(`SELECT * FROM change_history WHERE state = ? ORDER BY id ${direction === "undo" ? "DESC" : "ASC"} LIMIT 1`, expectedState);
    if (!historyRow) return null;
    const currentValue = historyRow.content_type === "profile"
      ? profileFromRow(await tx.get("SELECT * FROM profiles WHERE id = ?", historyRow.entity_id))
      : historyRow.content_type === "site-config"
        ? siteConfigState(await tx.get("SELECT published_json, draft_json, updated_by, updated_at FROM site_content WHERE content_key = 'site-config'"))
        : historyRow.content_type === "visual-gallery"
          ? await visualGalleryState(tx)
          : historyRow.content_type === "news-media"
            ? await newsMediaState(tx)
          : await manufacturingState(tx);
    const targetValue = historyRow[targetField] ? JSON.parse(historyRow[targetField]) : null;
    await restoreHistoryState(tx, historyRow, targetValue);
    await tx.run("UPDATE change_history SET state = ? WHERE id = ?", direction === "undo" ? "undone" : "applied", historyRow.id);
    await writeAudit({
      tx,
      profileId: historyRow.content_type === "profile" ? historyRow.entity_id : historyRow.entity_id,
      email: request.admin.email,
      action: `${direction}: ${historyRow.action}`,
      before: currentValue,
      after: targetValue,
    });
    return { action: historyRow.action };
  });
  if (!outcome) return response.status(409).json({ error: `There is no change available to ${direction}.` });
  response.json({ applied: direction, action: outcome.action });
}

app.post("/api/admin/undo", requireAdmin, (request, response) => applyHistory(request, response, "undo"));
app.post("/api/admin/redo", requireAdmin, (request, response) => applyHistory(request, response, "redo"));

app.get("/api/admin/manufacturing", requireAdmin, async (_request, response) => {
  const row = await db.get("SELECT published_json, draft_json, updated_by, updated_at FROM site_content WHERE content_key = 'manufacturing'");
  response.json({
    published: JSON.parse(row.published_json),
    draft: JSON.parse(row.draft_json),
    updated_by: row.updated_by,
    updated_at: row.updated_at,
  });
});

app.put("/api/admin/manufacturing", requireAdmin, async (request, response) => {
  const issue = validateManufacturingContent(request.body);
  if (issue) return response.status(400).json({ error: issue });
  const before = await manufacturingState(db);
  const draft = JSON.stringify(request.body);
  const updatedAt = new Date().toISOString();
  const after = { ...before, draft: request.body, updated_by: request.admin.email, updated_at: updatedAt };
  await db.transaction(async (tx) => {
    await tx.run("UPDATE site_content SET draft_json = ?, updated_by = ?, updated_at = ? WHERE content_key = 'manufacturing'",
      draft, request.admin.email, updatedAt);
    await writeAudit({ tx, profileId: "manufacturing-content", email: request.admin.email, action: "manufacturing draft updated", before, after });
    await recordChange(tx, { contentType: "manufacturing", entityId: "manufacturing", email: request.admin.email, action: "Manufacturing draft updated", before, after });
  });
  response.json({ saved: true, updated_by: request.admin.email, updated_at: updatedAt });
});

app.post("/api/admin/manufacturing/publish", requireAdmin, requireAdministrator, async (_request, response) => {
  const current = await manufacturingState(db);
  const draft = current.draft;
  const issue = validateManufacturingContent(draft);
  if (issue) return response.status(400).json({ error: issue });
  const updatedAt = new Date().toISOString();
  const after = { ...current, published: draft, updated_by: _request.admin.email, updated_at: updatedAt };
  await db.transaction(async (tx) => {
    await tx.run("UPDATE site_content SET published_json = ?, updated_by = ?, updated_at = ? WHERE content_key = 'manufacturing'",
      JSON.stringify(draft), _request.admin.email, updatedAt);
    await writeAudit({ tx, profileId: "manufacturing-content", email: _request.admin.email, action: "manufacturing content published", before: current, after });
    await recordChange(tx, { contentType: "manufacturing", entityId: "manufacturing", email: _request.admin.email, action: "Manufacturing content published", before: current, after });
  });
  response.json({ published: true, updated_by: _request.admin.email, updated_at: updatedAt });
});

app.post("/api/admin/upload", requireAdmin, upload.single("photo"), async (request, response, next) => {
  const file = request.file;
  if (!file) return response.status(400).json({ error: "Choose an image to upload." });
  if (!isImageSignature(file)) return response.status(400).json({ error: "Only valid JPEG, PNG, or WebP image files are accepted." });
  let optimized;
  try {
    optimized = await optimizeUploadedImage(file.buffer);
  } catch {
    return response.status(400).json({ error: "The image could not be decoded. Upload a valid JPEG, PNG, or WebP file." });
  }
  const filename = crypto.randomUUID();
  try {
    const photoUrl = await saveImageAsset(file, filename, optimized);
    response.status(201).json({ photo_url: photoUrl });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/manufacturing/media", requireAdmin, manufacturingMediaUpload.single("media"), async (request, response, next) => {
  const file = request.file;
  if (!file) return response.status(400).json({ error: "Choose an approved image or video to upload." });
  const extension = validManufacturingMedia(file);
  if (!extension) return response.status(400).json({ error: "Only valid JPEG, PNG, WebP, MP4, or WebM assets are accepted." });
  const filename = crypto.randomUUID();
  if (extension === ".jpg" || extension === ".png" || extension === ".webp") {
    let optimized;
    try {
      optimized = await optimizeUploadedImage(file.buffer);
    } catch {
      return response.status(400).json({ error: "The image could not be decoded. Upload a valid JPEG, PNG, or WebP file." });
    }
    try {
      const mediaUrl = await saveImageAsset(file, filename, optimized);
      response.status(201).json({ media_url: mediaUrl, media_type: "image" });
    } catch (error) {
      next(error);
    }
    return;
  }
  try {
    await fs.promises.writeFile(path.join(uploadDirectory, `${filename}${extension}`), file.buffer, { flag: "wx" });
    response.status(201).json({ media_url: `/uploads/${filename}${extension}`, media_type: "video" });
  } catch (error) {
    next(error);
  }
});

app.post(["/api/admin/visual-gallery/media", "/api/admin/news-media/media"], requireAdmin, visualGalleryUpload.single("media"), async (request, response, next) => {
  const file = request.file;
  if (!file) return response.status(400).json({ error: "Choose an approved image or video to upload." });
  const extension = validManufacturingMedia(file);
  if (!extension) return response.status(400).json({ error: "Only valid JPEG, PNG, WebP, MP4, or WebM assets are accepted." });
  const filename = crypto.randomUUID();
  let mediaUrl;
  let mediaType;
  if ([".jpg", ".png", ".webp"].includes(extension)) {
    let optimized;
    try {
      optimized = await optimizeUploadedImage(file.buffer);
    } catch {
      return response.status(400).json({ error: "The image could not be decoded. Upload a valid JPEG, PNG, or WebP file." });
    }
    try {
      mediaUrl = await saveImageAsset(file, filename, optimized);
      mediaType = "image";
    } catch (cause) {
      return next(cause);
    }
  } else {
    try {
      await fs.promises.writeFile(path.join(uploadDirectory, `${filename}${extension}`), file.buffer, { flag: "wx" });
      mediaUrl = `/uploads/${filename}${extension}`;
      mediaType = "video";
    } catch (cause) {
      return next(cause);
    }
  }
  const newsMediaUpload = request.path === "/api/admin/news-media/media";
  await writeAudit({
    profileId: newsMediaUpload ? "news-media-media" : "visual-gallery-media",
    email: request.admin.email,
    action: newsMediaUpload ? "news & media asset uploaded" : "visual gallery media uploaded",
    before: null,
    after: { mediaType, mediaUrl },
  });
  response.status(201).json({ media_url: mediaUrl, media_type: mediaType });
});

app.use("/uploads", express.static(uploadDirectory, {
  fallthrough: false,
  immutable: true,
  maxAge: "1y",
  setHeaders(response) { response.setHeader("X-Content-Type-Options", "nosniff"); },
}));

app.use(express.static(path.join(root, "dist")));
app.get("/{*path}", (request, response, next) => {
  if (request.path.startsWith("/api/")) return response.status(404).json({ error: "API endpoint not found." });
  response.sendFile(path.join(root, "dist", "index.html"), (error) => {
    if (error) next(error);
  });
});

app.use((error, request, response, _next) => {
  if (error instanceof multer.MulterError) {
    const manufacturingMedia = request.path === "/api/admin/manufacturing/media";
    const visualGalleryMedia = request.path === "/api/admin/visual-gallery/media";
    const newsMediaUpload = request.path === "/api/admin/news-media/media";
    return response.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? visualGalleryMedia || newsMediaUpload ? "News & media files must be 1.8 MB or smaller." : manufacturingMedia ? "Manufacturing media files must be 30 MB or smaller." : "Portrait images must be 5 MB or smaller." : "The media upload could not be processed." });
  }
  if (error?.type === "entity.too.large") return response.status(413).json({ error: "PDF files must be 1.8 MB or smaller." });
  console.error(error);
  response.status(500).json({ error: "The server could not complete the request." });
});

app.listen(port, () => {
  console.log(`Chalinze Steel Mills site listening on port ${port}`);
});
