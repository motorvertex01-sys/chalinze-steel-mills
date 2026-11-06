import "dotenv/config";
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { connectMySqlUrl, withTransaction } from "../server/mysql.js";

function ask(question) {
  return new Promise((resolve) => {
    const readline = createInterface({ input: stdin, output: stdout });
    readline.question(question, (answer) => {
      readline.close();
      resolve(answer.trim());
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
    const onData = (chunk) => {
      for (const character of chunk.toString()) {
        if (character === "\u0003") {
          cleanup();
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
        value += character;
        stdout.write("*");
      }
    };
    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
    };
    stdin.on("data", onData);
  });
}

const email = (await ask("Administrator email to reset: ")).toLowerCase();
const password = await askSecret("New password (hidden): ");
const confirmation = await askSecret("Repeat new password (hidden): ");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid administrator email.");
if (password.length < 14 || password.length > 200 || password !== confirmation) {
  throw new Error("Passwords must match and be between 14 and 200 characters.");
}

const salt = randomBytes(32).toString("hex");
const hash = pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");
const connection = await connectMySqlUrl(process.env.MYSQL_URL);
try {
  await withTransaction(connection, async (transaction) => {
    const [admins] = await transaction.execute("SELECT id FROM admins WHERE email = ? LIMIT 1", [email]);
    if (admins.length !== 1) throw new Error("No matching administrator exists; no account was changed.");
    const adminId = admins[0].id;
    await transaction.execute("UPDATE admins SET password_hash = ?, password_salt = ? WHERE id = ?", [hash, salt, adminId]);
    await transaction.execute("DELETE FROM sessions WHERE admin_id = ?", [adminId]);
    await transaction.execute(
      "INSERT INTO audit_log (profile_id, admin_email, action, before_json, after_json, created_at) VALUES (?, ?, ?, NULL, NULL, ?)",
      [`admin:${adminId}`, email, "administrator password reset; existing sessions revoked", new Date().toISOString()],
    );
  });
  console.info("Administrator password updated and existing sessions revoked.");
} finally {
  await connection.end();
}
