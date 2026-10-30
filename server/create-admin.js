import "dotenv/config";
import crypto from "node:crypto";
import { db } from "./store.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const role = process.env.ADMIN_ROLE?.trim().toLowerCase() || "admin";

if (!email || !password) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in the local environment before creating an administrator.");
  process.exitCode = 1;
} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("ADMIN_EMAIL must be a valid email address.");
  process.exitCode = 1;
} else if (password.length < 14 || password.length > 200) {
  console.error("ADMIN_PASSWORD must be between 14 and 200 characters.");
  process.exitCode = 1;
} else if (!["admin", "editor"].includes(role)) {
  console.error("ADMIN_ROLE must be either admin or editor.");
  process.exitCode = 1;
} else if (db.prepare("SELECT id FROM admins WHERE email = ?").get(email)) {
  console.error("An administrator with this email already exists. Use a different address or contact your database administrator.");
  process.exitCode = 1;
} else {
  const salt = crypto.randomBytes(32).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  db.prepare("INSERT INTO admins (id, email, password_hash, password_salt, role, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(crypto.randomUUID(), email, hash, salt, role, new Date().toISOString());
  console.log(`${role === "admin" ? "Administrator" : "Content editor"} ${email} created. Remove the bootstrap credentials from your environment when finished.`);
}

db.close();
