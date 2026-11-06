import "dotenv/config";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { connectMySqlUrl } from "../server/mysql.js";

const tables = [
  "admins", "profiles", "sessions", "site_content", "audit_log", "change_history",
  "applied_migrations", "login_attempts", "uploads",
];
const output = process.argv[2];
if (!output) throw new Error("Provide a new backup file path. Existing files are never overwritten.");

const connection = await connectMySqlUrl(process.env.MYSQL_URL);
try {
  await connection.beginTransaction();
  const contents = {};
  for (const table of tables) {
    const [rows] = await connection.query(`SELECT * FROM \`${table}\` ORDER BY 1`);
    contents[table] = rows;
  }
  await connection.commit();
  const payload = JSON.stringify({ format: 1, createdAt: new Date().toISOString(), tables: contents });
  const backup = JSON.stringify({
    format: 1,
    sha256: createHash("sha256").update(payload).digest("hex"),
    payload: JSON.parse(payload),
  }, null, 2);
  const destination = path.resolve(output);
  await fs.writeFile(destination, backup, { flag: "wx", mode: 0o600 });
  console.info(`Created verified MySQL backup: ${destination}`);
  console.warn("This backup contains administrator password hashes and sessions. Store it encrypted and restrict access.");
} catch (error) {
  try {
    await connection.rollback();
  } catch (rollbackError) {
    throw new AggregateError([error, rollbackError], "Backup failed and the read transaction could not be rolled back.");
  }
  throw error;
} finally {
  await connection.end();
}
