import "dotenv/config";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { connectMySqlUrl } from "../server/mysql.js";

const tables = [
  "admins", "profiles", "sessions", "site_content", "audit_log", "change_history",
  "applied_migrations", "login_attempts", "uploads",
];
const filename = process.argv[2];
if (!filename) throw new Error("Provide a verified backup file to restore.");
const backup = JSON.parse(await fs.readFile(filename, "utf8"));
const payload = JSON.stringify(backup.payload);
const digest = createHash("sha256").update(payload).digest("hex");
if (backup.format !== 1 || backup.payload?.format !== 1 || digest !== backup.sha256) {
  throw new Error("Backup format or SHA-256 integrity check failed.");
}
for (const table of tables) {
  if (!Array.isArray(backup.payload.tables?.[table])) throw new Error(`Backup is missing the ${table} table.`);
}

const connection = await connectMySqlUrl(process.env.MYSQL_URL);
try {
  for (const table of tables.filter((name) => name !== "applied_migrations")) {
    const [rows] = await connection.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
    if (Number(rows[0].count) !== 0) throw new Error(`Restore target table ${table} is not empty; refusing to overwrite data.`);
  }
  await connection.beginTransaction();
  try {
    for (const table of tables) {
      const [columnRows] = await connection.query(`SHOW COLUMNS FROM \`${table}\``);
      const allowedColumns = new Set(columnRows.map((row) => row.Field));
      for (const row of backup.payload.tables[table]) {
        const columns = Object.keys(row);
        if (!columns.length || columns.some((column) => !allowedColumns.has(column))) {
          throw new Error(`Backup contains unsupported columns for ${table}.`);
        }
        const names = columns.map((column) => `\`${column}\``).join(", ");
        const placeholders = columns.map(() => "?").join(", ");
        await connection.execute(
          `INSERT INTO \`${table}\` (${names}) VALUES (${placeholders})`,
          columns.map((column) => row[column]),
        );
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
  console.info("Restore completed. Verify table counts and application relationships before cutover.");
} finally {
  await connection.end();
}
