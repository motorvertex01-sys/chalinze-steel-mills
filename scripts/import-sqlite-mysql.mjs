import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { connectMySqlUrl } from "../server/mysql.js";

const tables = [
  ["admins", ["id"]],
  ["profiles", ["id"]],
  ["sessions", ["token_hash"]],
  ["site_content", ["content_key"]],
  ["audit_log", ["id"]],
  ["change_history", ["id"]],
  ["applied_migrations", ["migration_key"]],
  ["login_attempts", ["ip", "attempted_at"]],
];
const sourcePath = process.argv[2] || path.resolve("data", "chalinze.sqlite");
if (!process.env.MYSQL_URL) throw new Error("Set MYSQL_URL in the private environment before importing records.");
if (!fs.existsSync(sourcePath)) throw new Error(`SQLite source database does not exist: ${sourcePath}`);

const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
const integrity = source.pragma("integrity_check", { simple: true });
if (integrity !== "ok") {
  source.close();
  throw new Error(`SQLite integrity check failed: ${integrity}`);
}
const foreignKeyErrors = source.pragma("foreign_key_check");
if (foreignKeyErrors.length) {
  source.close();
  throw new Error(`SQLite has ${foreignKeyErrors.length} foreign-key violations; refusing to import.`);
}

const rowsByTable = new Map();
for (const [table] of tables) {
  const exists = source.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
  if (exists) rowsByTable.set(table, source.prepare(`SELECT * FROM "${table}"`).all());
}
source.close();

const connection = await connectMySqlUrl(process.env.MYSQL_URL);
let inserted = 0;
let unchanged = 0;
try {
  await connection.beginTransaction();
  for (const [table, primaryKey] of tables) {
    const rows = rowsByTable.get(table) ?? [];
    for (const row of rows) {
      const where = primaryKey.map((column) => `\`${column}\` = ?`).join(" AND ");
      const [existingRows] = await connection.execute(
        `SELECT * FROM \`${table}\` WHERE ${where} LIMIT 1`,
        primaryKey.map((column) => row[column]),
      );
      if (existingRows.length) {
        const existing = existingRows[0];
        const identical = Object.keys(row).every((column) =>
          String(existing[column] ?? "") === String(row[column] ?? ""));
        if (!identical) throw new Error(`Conflict found in ${table}; existing target row was preserved.`);
        unchanged += 1;
        continue;
      }
      const columns = Object.keys(row);
      const names = columns.map((column) => `\`${column}\``).join(", ");
      const placeholders = columns.map(() => "?").join(", ");
      await connection.execute(
        `INSERT INTO \`${table}\` (${names}) VALUES (${placeholders})`,
        columns.map((column) => row[column]),
      );
      inserted += 1;
    }
  }
  await connection.commit();
} catch (error) {
  try {
    await connection.rollback();
  } catch (rollbackError) {
    throw new AggregateError([error, rollbackError], "Import failed and rollback also failed.");
  }
  throw error;
} finally {
  await connection.end();
}

console.info(`Imported ${inserted} new records; ${unchanged} identical records were already present.`);
if ((rowsByTable.get("admins") ?? []).some((admin) => typeof admin.password_hash === "string" && admin.password_hash.length === 128)) {
  console.warn("A legacy scrypt administrator was imported. Reset that administrator's password before Worker sign-in with `npm run admin:reset:mysql`.");
}
