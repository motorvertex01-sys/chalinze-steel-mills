import "dotenv/config";
import express from "express";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { db, originalMediaDirectory, profileFromRow, uploadDirectory, writeAudit } from "./store.js";

const app = express();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);
const sessionLifetimeMs = 12 * 60 * 60 * 1000;
const loginAttempts = new Map();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
const manufacturingMediaUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024, files: 1 } });
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

function bootstrapInitialAdministrator() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const migrationKey = "initial-administrator-provisioned";
  if (db.prepare("SELECT migration_key FROM applied_migrations WHERE migration_key = ?").get(migrationKey)) return;
  if (!email && !password) return;
  if (!email || !password) throw new Error("Set both ADMIN_EMAIL and ADMIN_PASSWORD for initial administrator setup.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("ADMIN_EMAIL must be a valid email address.");
  if (password.length < 14 || password.length > 200) throw new Error("ADMIN_PASSWORD must be between 14 and 200 characters.");

  const created = db.transaction(() => {
    if (db.prepare("SELECT migration_key FROM applied_migrations WHERE migration_key = ?").get(migrationKey)) return false;
    if (db.prepare("SELECT id FROM admins LIMIT 1").get()) {
      db.prepare("INSERT INTO applied_migrations (migration_key, applied_at) VALUES (?, ?)").run(migrationKey, new Date().toISOString());
      return false;
    }

    const salt = crypto.randomBytes(32).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    db.prepare("INSERT INTO admins (id, email, password_hash, password_salt, role, created_at) VALUES (?, ?, ?, ?, 'admin', ?)")
      .run(crypto.randomUUID(), email, hash, salt, new Date().toISOString());
    db.prepare("INSERT INTO applied_migrations (migration_key, applied_at) VALUES (?, ?)").run(migrationKey, new Date().toISOString());
    return true;
  })();

  if (created) console.info(`Initial administrator ${email} created. Remove ADMIN_PASSWORD from the service environment after sign-in.`);
}

bootstrapInitialAdministrator();
app.disable("x-powered-by");
app.use(express.json({ limit: "25kb" }));
app.use((request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Frame-Options", "DENY");
  next();
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

function getAdmin(request) {
  const token = cookieToken(request);
  if (!token) return null;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const session = db.prepare(`
    SELECT admins.id, admins.email, admins.role, sessions.expires_at
    FROM sessions JOIN admins ON admins.id = sessions.admin_id
    WHERE sessions.token_hash = ?
  `).get(hash);
  if (!session || Date.parse(session.expires_at) <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hash);
    return null;
  }
  return session;
}

function requireAdmin(request, response, next) {
  const admin = getAdmin(request);
  if (!admin) return response.status(401).json({ error: "Administrator sign-in is required." });
  request.admin = admin;
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
  if (!Array.isArray(content.downstream) || content.downstream.length === 0 || content.downstream.some((item) => !item || typeof item.id !== "string" || typeof item.name !== "string" || typeof item.description !== "string" || typeof item.applications !== "string" || typeof item.industries !== "string" || !["bar", "coil", "beam", "rod", "component", "fabrication"].includes(item.model))) return "At least one valid downstream product category is required.";
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

app.get("/api/leadership", (_request, response) => {
  const rows = db.prepare(`
    SELECT * FROM profiles WHERE status = 'published'
    ORDER BY CASE section WHEN 'board' THEN 0 WHEN 'management' THEN 1 ELSE 2 END, sort_order, name
  `).all();
  response.json(rows.map(profileFromRow));
});

app.get("/api/manufacturing", (_request, response) => {
  const row = db.prepare("SELECT published_json FROM site_content WHERE content_key = 'manufacturing'").get();
  response.json(JSON.parse(row.published_json));
});

app.get("/api/admin/session", (request, response) => {
  const admin = getAdmin(request);
  response.json({
    authenticated: Boolean(admin),
    email: admin?.email ?? null,
    role: admin?.role ?? null,
    configured: db.prepare("SELECT COUNT(*) AS count FROM admins").get().count > 0,
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

app.post("/api/admin/login", (request, response) => {
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
  const admin = db.prepare("SELECT * FROM admins WHERE email = ?").get(email);
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
  db.prepare("INSERT INTO sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)").run(
    crypto.createHash("sha256").update(token).digest("hex"),
    admin.id,
    expiry,
  );
  response.setHeader("Set-Cookie", `csm_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(sessionLifetimeMs / 1000)}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  response.json({ authenticated: true, email: admin.email, role: admin.role });
});

app.post("/api/admin/logout", requireAdmin, (request, response) => {
  const token = cookieToken(request);
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(crypto.createHash("sha256").update(token).digest("hex"));
  response.setHeader("Set-Cookie", "csm_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0");
  response.json({ authenticated: false });
});

app.get("/api/admin/profiles", requireAdmin, (_request, response) => {
  const profiles = db.prepare("SELECT * FROM profiles ORDER BY section, sort_order, name").all();
  response.json(profiles.map(profileFromRow));
});

app.post("/api/admin/profiles", requireAdmin, (request, response) => {
  const issue = validateProfile(request.body);
  if (issue) return response.status(400).json({ error: issue });
  if (request.admin.role !== "admin" && request.body.status === "published") return response.status(403).json({ error: "Content editors cannot publish profiles." });
  const profile = cleanProfile(request.body);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const create = db.transaction(() => {
    db.prepare(`
      INSERT INTO profiles (id, section, placement, name, title, biography, background, qualifications, responsibilities, photo_url, is_vacant, status, sort_order, updated_at)
      VALUES (@id, @section, @placement, @name, @title, @biography, @background, @qualifications, @responsibilities, @photo_url, @is_vacant, @status, @sort_order, @updated_at)
    `).run({ ...profile, id, updated_at: now });
    const created = profileFromRow(db.prepare("SELECT * FROM profiles WHERE id = ?").get(id));
    writeAudit({ profileId: id, email: request.admin.email, action: "created", before: null, after: created });
    return created;
  });
  const created = create();
  response.status(201).json(created);
});

app.put("/api/admin/profiles/:id", requireAdmin, (request, response) => {
  const issue = validateProfile(request.body);
  if (issue) return response.status(400).json({ error: issue });
  const before = profileFromRow(db.prepare("SELECT * FROM profiles WHERE id = ?").get(request.params.id));
  if (!before) return response.status(404).json({ error: "Profile not found." });
  if (request.admin.role !== "admin" && (before.status === "published" || request.body.status === "published")) {
    return response.status(403).json({ error: "Content editors cannot edit published profiles or publish changes." });
  }
  const profile = cleanProfile(request.body);
  const update = db.transaction(() => {
    db.prepare(`
      UPDATE profiles SET section=@section, placement=@placement, name=@name, title=@title,
        biography=@biography, background=@background, qualifications=@qualifications,
        responsibilities=@responsibilities, photo_url=@photo_url, is_vacant=@is_vacant,
        status=@status, sort_order=@sort_order, updated_at=@updated_at WHERE id=@id
    `).run({ ...profile, id: before.id, updated_at: new Date().toISOString() });
    const after = profileFromRow(db.prepare("SELECT * FROM profiles WHERE id = ?").get(before.id));
    writeAudit({ profileId: before.id, email: request.admin.email, action: "updated", before, after });
    return after;
  });
  const after = update();
  response.json(after);
});

app.delete("/api/admin/profiles/:id", requireAdmin, requireAdministrator, (request, response) => {
  const before = profileFromRow(db.prepare("SELECT * FROM profiles WHERE id = ?").get(request.params.id));
  if (!before) return response.status(404).json({ error: "Profile not found." });
  const remove = db.transaction(() => {
    db.prepare("DELETE FROM profiles WHERE id = ?").run(before.id);
    writeAudit({ profileId: before.id, email: request.admin.email, action: "deleted", before, after: null });
  });
  remove();
  response.json({ deleted: true });
});

app.get("/api/admin/audit", requireAdmin, (request, response) => {
  const profileId = typeof request.query.profileId === "string" ? request.query.profileId : "";
  const rows = profileId
    ? db.prepare("SELECT * FROM audit_log WHERE profile_id = ? ORDER BY id DESC LIMIT 200").all(profileId)
    : db.prepare("SELECT * FROM audit_log ORDER BY id DESC LIMIT 200").all();
  response.json(rows.map((row) => ({
    ...row,
    before: row.before_json ? JSON.parse(row.before_json) : null,
    after: row.after_json ? JSON.parse(row.after_json) : null,
  })));
});

app.get("/api/admin/manufacturing", requireAdmin, (_request, response) => {
  const row = db.prepare("SELECT published_json, draft_json, updated_by, updated_at FROM site_content WHERE content_key = 'manufacturing'").get();
  response.json({
    published: JSON.parse(row.published_json),
    draft: JSON.parse(row.draft_json),
    updated_by: row.updated_by,
    updated_at: row.updated_at,
  });
});

app.put("/api/admin/manufacturing", requireAdmin, (request, response) => {
  const issue = validateManufacturingContent(request.body);
  if (issue) return response.status(400).json({ error: issue });
  const before = db.prepare("SELECT draft_json FROM site_content WHERE content_key = 'manufacturing'").get();
  const draft = JSON.stringify(request.body);
  const updatedAt = new Date().toISOString();
  const update = db.transaction(() => {
    db.prepare("UPDATE site_content SET draft_json = ?, updated_by = ?, updated_at = ? WHERE content_key = 'manufacturing'")
      .run(draft, request.admin.email, updatedAt);
    writeAudit({ profileId: "manufacturing-content", email: request.admin.email, action: "manufacturing draft updated", before: JSON.parse(before.draft_json), after: request.body });
  });
  update();
  response.json({ saved: true, updated_by: request.admin.email, updated_at: updatedAt });
});

app.post("/api/admin/manufacturing/publish", requireAdmin, requireAdministrator, (_request, response) => {
  const current = db.prepare("SELECT published_json, draft_json FROM site_content WHERE content_key = 'manufacturing'").get();
  const draft = JSON.parse(current.draft_json);
  const issue = validateManufacturingContent(draft);
  if (issue) return response.status(400).json({ error: issue });
  const updatedAt = new Date().toISOString();
  const publish = db.transaction(() => {
    db.prepare("UPDATE site_content SET published_json = ?, updated_by = ?, updated_at = ? WHERE content_key = 'manufacturing'")
      .run(current.draft_json, _request.admin.email, updatedAt);
    writeAudit({ profileId: "manufacturing-content", email: _request.admin.email, action: "manufacturing content published", before: JSON.parse(current.published_json), after: draft });
  });
  publish();
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
    return response.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? manufacturingMedia ? "Manufacturing media files must be 30 MB or smaller." : "Portrait images must be 5 MB or smaller." : "The media upload could not be processed." });
  }
  console.error(error);
  response.status(500).json({ error: "The server could not complete the request." });
});

app.listen(port, () => {
  console.log(`Chalinze Steel Mills site listening on port ${port}`);
});
