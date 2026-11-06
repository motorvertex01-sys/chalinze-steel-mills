import { execFileSync } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const exportIndex = args.indexOf("--export");
const exportPath = exportIndex >= 0 ? args[exportIndex + 1] : "";
const apply = args.includes("--apply");
const help = args.includes("--help");
const sourceUrl = (process.env.RENDER_BASE_URL || "https://chalinze-steel-mills-web.onrender.com").replace(/\/+$/, "");
const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const backupDirectory = path.join(root, "backups", `render-to-d1-${timestamp}`);

function usage() {
  console.log("Usage: node scripts/import-render-to-d1.mjs --export <admin-export.json> [--apply]");
  console.log("Without --apply, validates the export and reports record/file counts only.");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function text(value, field, allowEmpty = true) {
  assert(typeof value === "string" && (allowEmpty || value.length > 0), `Export field ${field} must be ${allowEmpty ? "text" : "non-empty text"}.`);
  assert(Buffer.byteLength(value, "utf8") < 2_000_000, `Export field ${field} exceeds the D1 row-value limit.`);
  return value;
}

function integer(value, field, minimum = 0) {
  assert(Number.isSafeInteger(Number(value)) && Number(value) >= minimum, `Export field ${field} must be an integer >= ${minimum}.`);
  return Number(value);
}

function sql(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    assert(Number.isFinite(value), "Cannot import a non-finite numeric value.");
    return String(value);
  }
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function validateExport(data) {
  assert(data && typeof data === "object" && data.format_version === 1, "Unsupported Render export format.");
  for (const field of ["profiles", "site_content", "audit_log", "change_history", "administrators", "uploads"]) {
    assert(Array.isArray(data[field]), `Render export is missing its ${field} list.`);
  }
  assert(data.sessions_exported === false && data.login_attempts_exported === false,
    "Refusing an export containing live sessions or login-attempt state.");

  const profileIds = new Set();
  for (const profile of data.profiles) {
    assert(profile && typeof profile === "object", "Invalid profile record.");
    text(profile.id, "profile.id", false);
    assert(!profileIds.has(profile.id), `Duplicate profile ID ${profile.id} in export.`);
    profileIds.add(profile.id);
    for (const field of ["section", "placement", "name", "title", "biography", "background", "qualifications", "responsibilities", "photo_url", "status", "updated_at"]) {
      text(profile[field], `profile.${field}`);
    }
    assert([0, 1, false, true].includes(profile.is_vacant), `Invalid vacancy status for ${profile.id}.`);
    integer(profile.sort_order, `profile.sort_order`);
  }

  const contentKeys = new Set();
  for (const content of data.site_content) {
    text(content.content_key, "site_content.content_key", false);
    assert(!contentKeys.has(content.content_key), `Duplicate content key ${content.content_key} in export.`);
    contentKeys.add(content.content_key);
    text(content.published_json, "site_content.published_json", false);
    text(content.draft_json, "site_content.draft_json", false);
    text(content.updated_by, "site_content.updated_by", false);
    text(content.updated_at, "site_content.updated_at", false);
    JSON.parse(content.published_json);
    JSON.parse(content.draft_json);
  }

  for (const [table, records] of [["audit_log", data.audit_log], ["change_history", data.change_history]]) {
    for (const record of records) {
      integer(record.id, `${table}.id`, 1);
      for (const [field, value] of Object.entries(record)) {
        if (value !== null && field !== "id") text(value, `${table}.${field}`);
      }
    }
  }

  const uploadKeys = new Set();
  for (const upload of data.uploads) {
    assert(upload && typeof upload === "object", "Invalid upload record.");
    assert(typeof upload.key === "string" && /^[a-f0-9-]+\.(?:jpg|png|webp|mp4|webm)$/i.test(upload.key),
      "Upload key is not a supported generated media filename.");
    assert(!uploadKeys.has(upload.key), `Duplicate upload key ${upload.key} in export.`);
    uploadKeys.add(upload.key);
    assert(upload.url === `/uploads/${upload.key}`, `Upload ${upload.key} has an unexpected source URL.`);
    text(upload.content_type, "upload.content_type", false);
    integer(upload.size_bytes, "upload.size_bytes");
    text(upload.original_name, "upload.original_name", false);
    text(upload.uploaded_by, "upload.uploaded_by", false);
    text(upload.created_at, "upload.created_at", false);
  }
  return data;
}

function insert(table, columns, values, conflict, updateColumns) {
  const assignments = updateColumns.map((column) => `${column}=excluded.${column}`).join(", ");
  return `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${values.map(sql).join(", ")}) ` +
    `ON CONFLICT(${conflict}) DO UPDATE SET ${assignments};`;
}

function makeSql(data) {
  const statements = [];
  for (const row of data.profiles) {
    const columns = ["id", "section", "placement", "name", "title", "biography", "background", "qualifications", "responsibilities", "photo_url", "is_vacant", "status", "sort_order", "updated_at"];
    const values = columns.map((column) => column === "is_vacant" ? Number(Boolean(row[column])) : row[column]);
    statements.push(insert("profiles", columns, values, "id", columns.slice(1)));
  }
  for (const row of data.site_content) {
    const columns = ["content_key", "published_json", "draft_json", "updated_by", "updated_at"];
    statements.push(insert("site_content", columns, columns.map((column) => row[column]), "content_key", columns.slice(1)));
  }
  for (const row of data.audit_log) {
    const columns = ["id", "profile_id", "admin_email", "action", "before_json", "after_json", "created_at"];
    statements.push(insert("audit_log", columns, columns.map((column) => row[column]), "id", columns.slice(1)));
  }
  for (const row of data.change_history) {
    const columns = ["id", "content_type", "entity_id", "admin_email", "action", "before_json", "after_json", "state", "created_at"];
    statements.push(insert("change_history", columns, columns.map((column) => row[column]), "id", columns.slice(1)));
  }
  for (const row of data.uploads) {
    const columns = ["object_key", "content_type", "size_bytes", "original_name", "uploaded_by", "created_at"];
    statements.push(insert("uploads", columns, columns.map((column) => row[column]), "object_key", columns.slice(1)));
  }
  return `${statements.join("\n")}\n`;
}

function runWrangler(wranglerArgs) {
  const cli = path.join(root, "node_modules", "wrangler", "bin", "wrangler.js");
  execFileSync(process.execPath, [cli, ...wranglerArgs], { cwd: root, stdio: "inherit", windowsHide: true });
}

async function exists(file) {
  try {
    await access(file, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (help) return usage();
  assert(exportPath, "Provide the authenticated export file with --export.");
  const data = validateExport(JSON.parse(await readFile(path.resolve(exportPath), "utf8")));
  console.log(`Validated ${data.profiles.length} profiles, ${data.site_content.length} content records, ${data.audit_log.length} audit rows, ${data.change_history.length} history rows, and ${data.uploads.length} uploaded files.`);
  console.log(`${data.administrators.length} source administrator accounts are listed; password hashes and sessions are deliberately excluded and must be re-provisioned.`);
  if (!apply) {
    usage();
    return;
  }

  await mkdir(path.dirname(backupDirectory), { recursive: true });
  await mkdir(backupDirectory, { recursive: false });
  const databaseBackup = path.join(backupDirectory, "d1-before-import.sql");
  const importSql = path.join(backupDirectory, "render-import.sql");
  runWrangler(["d1", "export", "chalinze-steel-mills", "--remote", "--output", databaseBackup]);

  for (const upload of data.uploads) {
    const url = new URL(upload.url, sourceUrl);
    assert(url.origin === sourceUrl, `Upload ${upload.key} points outside the configured Render source.`);
    const response = await fetch(url);
    assert(response.ok, `Could not download Render upload ${upload.key} (HTTP ${response.status}).`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert(bytes.byteLength === upload.size_bytes, `Render upload ${upload.key} changed size during transfer.`);
    assert(bytes.byteLength <= 30 * 1024 * 1024, `Render upload ${upload.key} exceeds the site's upload limit.`);
    const localFile = path.join(backupDirectory, upload.key);
    await writeFile(localFile, bytes, { flag: "wx" });
    runWrangler([
      "r2", "object", "put", `chalinze-steel-mills-media/${upload.key}`,
      "--remote", "--file", localFile, "--content-type", upload.content_type,
      "--cache-control", "public, max-age=31536000, immutable",
    ]);
  }

  await writeFile(importSql, makeSql(data), { flag: "wx", mode: 0o600 });
  runWrangler(["d1", "execute", "chalinze-steel-mills", "--remote", "--file", importSql]);
  console.log(`D1 data and referenced R2 uploads imported. Pre-import backup and private transfer files are in ${backupDirectory}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "The Render-to-D1 import failed.");
  process.exitCode = 1;
});
