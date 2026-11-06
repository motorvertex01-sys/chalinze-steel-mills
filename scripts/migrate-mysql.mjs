import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkMySqlHealth, connectMySqlUrl } from "../server/mysql.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationKey = "mysql-0001-initial-schema";

if (!process.env.MYSQL_URL) {
  throw new Error("Set MYSQL_URL in the private environment before applying MySQL migrations.");
}

const connection = await connectMySqlUrl(process.env.MYSQL_URL);

try {
  if (!(await checkMySqlHealth(connection))) {
    throw new Error("The configured MySQL server did not pass its health check.");
  }
  const [tables] = await connection.query("SHOW TABLES LIKE 'schema_migrations'");
  if (tables.length > 0) {
    const [existing] = await connection.execute(
      "SELECT migration_key FROM schema_migrations WHERE migration_key = ?",
      [migrationKey],
    );
    if (existing.length > 0) {
      console.info(`${migrationKey} is already applied.`);
      process.exitCode = 0;
    } else {
      await applyMigration();
    }
  } else {
    await applyMigration();
  }
} finally {
  await connection.end();
}

async function applyMigration() {
  const sql = await fs.readFile(path.join(root, "migrations", "mysql", "0001_initial_schema.sql"), "utf8");
  for (const statement of sql.split(";").map((part) => part.trim()).filter(Boolean)) {
    await connection.query(statement);
  }
  await connection.execute(
    "INSERT IGNORE INTO schema_migrations (migration_key, applied_at) VALUES (?, ?)",
    [migrationKey, new Date().toISOString()],
  );
  console.info(`Applied ${migrationKey}.`);
}
