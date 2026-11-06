import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { connectMySqlUrl } from "../server/mysql.js";

const sourcePath = process.argv[2] || path.resolve("data", "chalinze.sqlite");
if (!process.env.MYSQL_URL) throw new Error("Set MYSQL_URL in the private environment before verifying a migration.");
if (!fs.existsSync(sourcePath)) throw new Error(`SQLite source database does not exist: ${sourcePath}`);

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
const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
const integrity = source.pragma("integrity_check", { simple: true });
if (integrity !== "ok") {
  source.close();
  throw new Error(`SQLite integrity check failed: ${integrity}`);
}

const connection = await connectMySqlUrl(process.env.MYSQL_URL);
let verified = 0;
try {
  for (const [table, keys] of tables) {
    const exists = source.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
    if (!exists) continue;
    const sourceRows = source.prepare(`SELECT * FROM "${table}"`).all();
    const [countRows] = await connection.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
    if (Number(countRows[0].count) !== sourceRows.length) {
      throw new Error(`${table} row count differs: source=${sourceRows.length}, target=${countRows[0].count}.`);
    }
    for (const row of sourceRows) {
      const where = keys.map((key) => `\`${key}\` = ?`).join(" AND ");
      const [targetRows] = await connection.execute(
        `SELECT * FROM \`${table}\` WHERE ${where} LIMIT 1`,
        keys.map((key) => row[key]),
      );
      if (targetRows.length !== 1 || !Object.keys(row).every((column) =>
        String(targetRows[0][column] ?? "") === String(row[column] ?? ""))) {
        throw new Error(`Record verification failed in ${table}; record contents were not printed.`);
      }
      verified += 1;
    }
  }

  const [orphans] = await connection.query(`SELECT COUNT(*) AS count FROM sessions s
    LEFT JOIN admins a ON a.id = s.admin_id WHERE a.id IS NULL`);
  if (Number(orphans[0].count) !== 0) throw new Error("Target database contains sessions without administrator records.");
  for (const [column, table] of [["published_json", "site_content"], ["draft_json", "site_content"], ["before_json", "audit_log"], ["after_json", "audit_log"], ["before_json", "change_history"], ["after_json", "change_history"]]) {
    const [values] = await connection.query(`SELECT \`${column}\` AS value FROM \`${table}\` WHERE \`${column}\` IS NOT NULL`);
    for (const entry of values) JSON.parse(entry.value);
  }
} finally {
  source.close();
  await connection.end();
}

console.info(`Verified SQLite integrity, row counts, ${verified} records, session relationships, and stored JSON.`);
