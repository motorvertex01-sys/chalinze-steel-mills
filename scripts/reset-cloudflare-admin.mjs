import { pbkdf2Sync, randomBytes } from "node:crypto";
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wranglerCli = path.join(root, "node_modules", "wrangler", "bin", "wrangler.js");
const database = "chalinze-steel-mills";

export function hashPassword(password, salt) {
  return pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");
}

export function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function resetSql(admin, passwordHash, salt) {
  const adminId = sqlString(admin.id);
  const email = sqlString(admin.email);
  const now = sqlString(new Date().toISOString());
  return [
    `UPDATE admins SET password_hash = ${sqlString(passwordHash)}, password_salt = ${sqlString(salt)} WHERE id = ${adminId};`,
    `DELETE FROM sessions WHERE admin_id = ${adminId};`,
    "DELETE FROM login_attempts;",
    `INSERT INTO audit_log (profile_id, admin_email, action, before_json, after_json, created_at) VALUES (${sqlString(`admin:${admin.id}`)}, ${email}, 'administrator password reset; sessions revoked', NULL, NULL, ${now});`,
  ].join("\n");
}

function runWrangler(args) {
  return execFileSync(process.execPath, [wranglerCli, ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    windowsHide: true,
  });
}

async function executeSql(sql) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "chalinze-admin-reset-"));
  const file = path.join(directory, "reset.sql");
  try {
    await writeFile(file, sql, { encoding: "utf8", mode: 0o600, flag: "wx" });
    runWrangler(["d1", "execute", database, "--remote", "--file", file]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function ask(question) {
  return new Promise((resolve) => {
    const readline = createInterface({ input: stdin, output: stdout });
    readline.question(question, (answer) => {
      readline.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function askSecret(question) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("Run this command from an interactive terminal so the new password is not echoed.");
  }
  return new Promise((resolve, reject) => {
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    let value = "";
    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
    };
    const onData = (chunk) => {
      for (const character of chunk.toString()) {
        if (character === "\u0003") {
          cleanup();
          stdout.write("\n");
          reject(new Error("Password reset cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          cleanup();
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (character === "\u0008" || character === "\u007f") {
          value = value.slice(0, -1);
          stdout.write("\b \b");
          continue;
        }
        if (character < " " || character === "\u007f") continue;
        value += character;
        stdout.write("*");
      }
    };
    stdin.on("data", onData);
  });
}

function parseResults(output) {
  const result = JSON.parse(output);
  if (!Array.isArray(result) || result.some((item) => item.success !== true)) {
    throw new Error("Wrangler did not return a successful D1 query result.");
  }
  return result.flatMap((item) => Array.isArray(item.results) ? item.results : []);
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log("Usage: npm run admin:reset:cloudflare");
    console.log("Prompts for an existing administrator email and a new hidden password, then resets the remote D1 password and revokes sessions.");
    return;
  }

  const email = await ask("Administrator email to reset: ");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid administrator email.");

  const rows = parseResults(runWrangler([
    "d1", "execute", database, "--remote", "--command",
    `SELECT id, email FROM admins WHERE email = ${sqlString(email)};`, "--json",
  ]));
  if (rows.length !== 1 || typeof rows[0].id !== "string" || typeof rows[0].email !== "string") {
    throw new Error("No matching administrator exists; no account was changed.");
  }
  const admin = { id: rows[0].id, email: rows[0].email };

  let password = await askSecret("New password (hidden): ");
  let confirmation = await askSecret("Repeat new password (hidden): ");
  if (password.length < 14 || password.length > 200 || password !== confirmation) {
    password = "";
    confirmation = "";
    throw new Error("Passwords must match and be between 14 and 200 characters.");
  }

  const salt = randomBytes(32).toString("hex");
  const passwordHash = hashPassword(password, salt);
  password = "";
  confirmation = "";
  await executeSql(resetSql(admin, passwordHash, salt));
  console.info(`Password reset for ${admin.email}; all existing sessions have been revoked.`);
  console.info("If the ADMIN_PASSWORD bootstrap secret may have been exposed, remove it with: npx wrangler secret delete ADMIN_PASSWORD");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Cloudflare administrator password reset failed.");
    process.exitCode = 1;
  });
}
