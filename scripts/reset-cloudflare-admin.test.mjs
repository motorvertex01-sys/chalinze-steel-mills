import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { hashPassword, resetSql, sqlString } from "./reset-cloudflare-admin.mjs";

test("Cloudflare reset derives the same PBKDF2 hash as Worker login", async () => {
  assert.equal(hashPassword("example password", "example salt").length, 64);
  assert.equal(hashPassword("example password", "example salt"), hashPassword("example password", "example salt"));
  assert.notEqual(hashPassword("different password", "example salt"), hashPassword("example password", "example salt"));
  const key = await webcrypto.subtle.importKey("raw", new TextEncoder().encode("example password"), "PBKDF2", false, ["deriveBits"]);
  const bits = await webcrypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt: new TextEncoder().encode("example salt"),
    iterations: 100000,
  }, key, 256);
  assert.equal(hashPassword("example password", "example salt"), Buffer.from(bits).toString("hex"));
});

test("Cloudflare reset SQL updates only the selected account and revokes its sessions", () => {
  const sql = resetSql({ id: "admin-1", email: "admin@example.com" }, "a".repeat(64), "b".repeat(64));
  assert.match(sql, /UPDATE admins SET password_hash/);
  assert.match(sql, /WHERE id = 'admin-1'/);
  assert.match(sql, /DELETE FROM sessions WHERE admin_id = 'admin-1'/);
  assert.match(sql, /DELETE FROM login_attempts/);
  assert.match(sql, /administrator password reset; sessions revoked/);
});

test("SQL values are escaped and reset SQL never contains a plaintext password", () => {
  const password = "never-put-this-in-sql";
  const sql = resetSql({ id: "admin'1", email: "admin@example.com" }, hashPassword(password, "salt"), "salt");
  assert.equal(sqlString("admin'1"), "'admin''1'");
  assert.equal(sql.includes(password), false);
  assert.match(sql, /WHERE id = 'admin''1'/);
});
