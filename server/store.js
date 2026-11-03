import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.resolve(process.env.DATA_DIRECTORY || path.join(root, "data"));
const production = process.env.NODE_ENV === "production";

if (production && !process.env.MYSQL_URL) {
  throw new Error("MYSQL_URL is required in production. Configure a persistent MySQL or MariaDB database.");
}

export const uploadDirectory = path.join(directory, "uploads");
export const originalMediaDirectory = path.join(directory, "originals");
fs.mkdirSync(uploadDirectory, { recursive: true });
fs.mkdirSync(originalMediaDirectory, { recursive: true });

let sqlite;
let mysql;
const useMysql = Boolean(process.env.MYSQL_URL);
if (useMysql) {
  const { createPool } = await import("mysql2/promise");
  mysql = createPool(process.env.MYSQL_URL);
} else {
  fs.mkdirSync(directory, { recursive: true });
  sqlite = new Database(path.join(directory, "chalinze.sqlite"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
}

async function query(connection, sql, params = []) {
  if (useMysql) {
    const compatibleSql = sql.replace(/^\s*INSERT OR IGNORE\b/i, "INSERT IGNORE");
    const [result] = await connection.execute(compatibleSql, params);
    return result;
  }
  const statement = connection.prepare(sql);
  if (/^\s*SELECT\b/i.test(sql) || /^\s*PRAGMA\b/i.test(sql) || /^\s*SHOW\b/i.test(sql)) {
    return { rows: statement.all(...params) };
  }
  return statement.run(...params);
}

export const db = {
  async all(sql, ...params) {
    const result = await query(useMysql ? mysql : sqlite, sql, params);
    return useMysql ? result : result.rows;
  },
  async get(sql, ...params) {
    const result = await query(useMysql ? mysql : sqlite, sql, params);
    return useMysql ? result[0] : result.rows[0];
  },
  async run(sql, ...params) {
    return query(useMysql ? mysql : sqlite, sql, params);
  },
  async transaction(callback) {
    if (useMysql) {
      const connection = await mysql.getConnection();
      try {
        await connection.beginTransaction();
        const tx = {
          all: async (sql, ...params) => (await query(connection, sql, params)),
          get: async (sql, ...params) => (await query(connection, sql, params))[0],
          run: async (sql, ...params) => query(connection, sql, params),
        };
        const value = await callback(tx);
        await connection.commit();
        return value;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    sqlite.exec("BEGIN IMMEDIATE");
    try {
      const value = await callback({
        all: async (sql, ...params) => sqlite.prepare(sql).all(...params),
        get: async (sql, ...params) => sqlite.prepare(sql).get(...params),
        run: async (sql, ...params) => sqlite.prepare(sql).run(...params),
      });
      sqlite.exec("COMMIT");
      return value;
    } catch (error) {
      sqlite.exec("ROLLBACK");
      throw error;
    }
  },
  async close() {
    if (useMysql) await mysql.end();
    else sqlite.close();
  },
};

const profileSchema = `
  CREATE TABLE IF NOT EXISTS profiles (
    id VARCHAR(64) PRIMARY KEY,
    section VARCHAR(24) NOT NULL,
    placement VARCHAR(24) NOT NULL,
    name VARCHAR(160) NOT NULL,
    title VARCHAR(200) NOT NULL,
    biography TEXT NOT NULL,
    background TEXT NOT NULL,
    qualifications TEXT NOT NULL,
    responsibilities TEXT NOT NULL,
    photo_url VARCHAR(500) NOT NULL,
    is_vacant INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at VARCHAR(40) NOT NULL
  )`;

const profiles = [
  {
    id: "leadership-1", section: "board", placement: "board", name: "Mr. Amini N. Kimaro",
    title: "Chief Executive Officer/ Board Chairman", sort_order: 10,
    photo_url: "/assets/leadership/amini-n-kimaro.webp",
    biography: "Mr. Amini N. Kimaro is a Tanzanian entrepreneur and business leader with experience in mining, mineral resources, industrial development and building-materials manufacturing. As Chief Executive Officer and Board Chairman of Chalinze Steel Mills Ltd, he provides strategic leadership focused on the sustainable development and value addition of Tanzania's mineral resources.",
    background: "His supplied profile describes experience across mining, mineral resources, industrial development and building-materials manufacturing, and leadership of Chalinze Steel Mills Ltd and other businesses.",
    responsibilities: "The supplied profile describes strategic direction, corporate leadership, investment oversight and stakeholder engagement. Company approval of the role description is pending.",
  },
  {
    id: "leadership-2", section: "board", placement: "governance", name: "Dr. Humphrey Musyoka",
    title: "Appointment to be confirmed", sort_order: 20,
    biography: "Dr. Humphrey M. Musyoka is a business development and operations professional with experience in healthcare, infrastructure project preparation and finance mobilization. His work includes resource mobilization, stakeholder engagement, research and development of infrastructure opportunities across Sub-Saharan Africa.",
    background: "His professional background includes Operations and Business Development Lead, East Africa, at Bankability Advisory (Pty) South Africa; Operations and Business Development Lead at Quillion Group Africa Consultants; Founding Secretary of the Kenya Cities Forum (now Kenya Urban Forum); and earlier medical and healthcare-management roles in Kenya.",
    qualifications: "Brokaw Fellowship Program, New York.",
  },
  { id: "leadership-3", section: "board", placement: "board", name: "Dr. Alfred C. Msemo", title: "Director", sort_order: 20 },
  { id: "leadership-4", section: "board", placement: "board", name: "Technical Advisor", title: "Position Vacant", is_vacant: true, sort_order: 50 },
  {
    id: "leadership-5", section: "board", placement: "board", name: "Denis A. Kimaro",
    title: "Director", sort_order: 30, photo_url: "/assets/leadership/denis-a-kimaro.webp",
    biography: "Mr. Denis Kimaro is an ICT and telecommunications professional with practical experience in networking, structured cabling, fibre-optic installation and splicing, PABX systems, computer systems and related infrastructure. His supplied profile describes work as an ICT trainee with the Tanzania Ports Authority and subsequent technical work with C-NET Technologies (T) Ltd. The profile identifies him as a shareholder of NextGen Cement Co. Ltd; his Chalinze Steel Mills shareholder status, appointment and governance classification require company confirmation.",
    background: "Experience described in the supplied profile includes installation, maintenance and support of structured cabling, PABX, network and fibre-optic systems, MAN3000 billing systems, computers and related ICT equipment.",
    qualifications: "The supplied profile states that he holds an ICT qualification from the Dar es Salaam Institute of Technology (DIT). It also lists specialized training in Hikvision CCTV, PIMA security systems, Panasonic Smart PABX, Zyxel networking, structured cabling and fibre-optic systems, including training in Dubai.",
    responsibilities: "The supplied profile describes ICT infrastructure, telecommunications, network systems, fibre-optic connectivity, surveillance and technical support as areas of expertise. A Chalinze-specific appointment or responsibility has not been confirmed.",
  },
  {
    id: "leadership-6", section: "board", placement: "board", name: "Mrs. Juliette Kimaro",
    title: "Chief Legal Counsel", sort_order: 40, photo_url: "/assets/leadership/juliette-a-kimaro.webp",
    biography: "Juliette A. Kimaro is a Tanzanian legal professional with practical experience in independent legal practice and private-sector firms. Her supplied profile describes experience in corporate and commercial legal advisory, documentation, contracts and stakeholder engagement. It identifies her as a shareholder in the profile's NextGen Cement Co. Ltd context; her Chalinze Steel Mills shareholder status and any formal governance appointment require confirmation.",
    background: "The supplied profile describes independent legal practice, engagement with private-sector firms and an internship with the National Social Security Fund (NSSF).",
    qualifications: "Bachelor of Laws (LL.B.), Tumaini Makumira University, Dar es Salaam College. The profile also notes English and Swahili communication skills and Microsoft Office competence.",
    responsibilities: "Areas of professional expertise described in the supplied profile include legal research and analysis, legal advisory, corporate and contractual documentation, regulatory matters, compliance and stakeholder engagement. No Chalinze-specific appointment is confirmed.",
  },
  { id: "leadership-7", section: "management", placement: "governance", name: "Harish Kumar", title: "Position/title to be confirmed.", sort_order: 10 },
  { id: "leadership-8", section: "management", placement: "governance", name: "Chief Finance Officer (CFO)", title: "Name to be confirmed.", sort_order: 20 },
  {
    id: "leadership-9", section: "management", placement: "governance", name: "Nickson Kimbori",
    title: "Operations – Logistics", sort_order: 30,
    biography: "Nickson Kimbori is a mining professional with more than two decades of practical experience in mining operations, logistics planning and community engagement, as described in the supplied profile. His experience includes field coordination, resource movement, transport and logistics, contractor engagement and stakeholder relations.",
    background: "The supplied profile describes field-based work in mining operations, site coordination, transport and logistics, contractor engagement and community relations.",
    responsibilities: "The supplied profile describes mining operations planning, raw-material supply logistics, community engagement and coordination between upstream mining and downstream industrial activities.",
  },
  { id: "leadership-10", section: "management", placement: "governance", name: "Mr. Ridhiwani M. Mbaruku", title: "Mining Operations", sort_order: 40, photo_url: "/assets/leadership/ridhiwani-m-mbaruku.webp" },
  { id: "leadership-11", section: "management", placement: "governance", name: "Mr. Sospeter Urassa", title: "Chief Accountant", sort_order: 50 },
  { id: "leadership-12", section: "management", placement: "governance", name: "Godluck E. Urassa", title: "IT / Electrician Specialist", sort_order: 60 },
  { id: "leadership-13", section: "management", placement: "governance", name: "Mining Engineer", title: "Position Vacant", is_vacant: true, sort_order: 70 },
  { id: "leadership-14", section: "management", placement: "governance", name: "Geologist", title: "Position Vacant", is_vacant: true, sort_order: 80 },
  { id: "leadership-15", section: "support", placement: "governance", name: "Chief Cashier", title: "Supporting Staff", sort_order: 10 },
  { id: "leadership-16", section: "support", placement: "governance", name: "Drivers", title: "Supporting Staff", sort_order: 20 },
  { id: "leadership-17", section: "support", placement: "governance", name: "Cleaners", title: "Supporting Staff", sort_order: 30 },
  { id: "leadership-18", section: "support", placement: "governance", name: "Machine Operators", title: "Supporting Staff", sort_order: 40 },
];

const legacyAliases = {
  "leadership-5": ["Mr. Denis Kimaro", "Denis A. Kimaro"],
  "leadership-6": ["Ms. Juliette A. Kimaro", "Mrs. Juliette Kimaro"],
  "leadership-9": ["Mr. Nickson Kimbori", "Nickson Kimbori"],
};

function profileFromRow(row) {
  return row ? { ...row, is_vacant: Boolean(row.is_vacant) } : null;
}

async function writeAuditWith(tx, { profileId, email, action, before, after }) {
  await tx.run(
    "INSERT INTO audit_log (profile_id, admin_email, action, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    profileId, email, action, before ? JSON.stringify(before) : null,
    after ? JSON.stringify(after) : null, new Date().toISOString(),
  );
}

export async function writeAudit(entry) {
  await writeAuditWith(entry.tx ?? db, entry);
}

async function importLegacySqlite() {
  const legacyPath = path.join(directory, "chalinze.sqlite");
  if (!useMysql || !fs.existsSync(legacyPath) ||
      await db.get("SELECT migration_key FROM applied_migrations WHERE migration_key = ?", "legacy-sqlite-import-v1")) return;

  const legacy = new Database(legacyPath, { readonly: true, fileMustExist: true });
  const tables = new Set(legacy.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
  const fields = {
    admins: ["id", "email", "password_hash", "password_salt", "role", "created_at"],
    sessions: ["token_hash", "admin_id", "expires_at"],
    profiles: ["id", "section", "placement", "name", "title", "biography", "background", "qualifications", "responsibilities", "photo_url", "is_vacant", "status", "sort_order", "updated_at"],
    audit_log: ["id", "profile_id", "admin_email", "action", "before_json", "after_json", "created_at"],
    applied_migrations: ["migration_key", "applied_at"],
    site_content: ["content_key", "published_json", "draft_json", "updated_by", "updated_at"],
  };
  try {
    await db.transaction(async (tx) => {
      for (const [table, columns] of Object.entries(fields)) {
        if (!tables.has(table)) continue;
        const sourceColumns = new Set(legacy.pragma(`table_info(${table})`).map((column) => column.name));
        const available = columns.filter((column) => sourceColumns.has(column));
        if (table === "admins" && !sourceColumns.has("role")) available.splice(4, 0, "role");
        for (const row of legacy.prepare(`SELECT * FROM ${table}`).all()) {
          const values = available.map((column) => column === "role" && !sourceColumns.has("role") ? "admin" : row[column]);
          const placeholders = available.map(() => "?").join(", ");
          await tx.run(`INSERT IGNORE INTO ${table} (${available.join(", ")}) VALUES (${placeholders})`, ...values);
        }
      }
      await tx.run("INSERT IGNORE INTO applied_migrations (migration_key, applied_at) VALUES (?, ?)",
        "legacy-sqlite-import-v1", new Date().toISOString());
    });
  } finally {
    legacy.close();
  }
}

async function initialize() {
  if (useMysql) {
    await db.run(`CREATE TABLE IF NOT EXISTS admins (
      id VARCHAR(64) PRIMARY KEY, email VARCHAR(254) NOT NULL UNIQUE, password_hash VARCHAR(128) NOT NULL,
      password_salt VARCHAR(128) NOT NULL, role VARCHAR(16) NOT NULL DEFAULT 'admin', created_at VARCHAR(40) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await db.run(`CREATE TABLE IF NOT EXISTS sessions (
      token_hash VARCHAR(64) PRIMARY KEY, admin_id VARCHAR(64) NOT NULL, expires_at VARCHAR(40) NOT NULL,
      CONSTRAINT sessions_admin_fk FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await db.run(`${profileSchema} ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await db.run(`CREATE TABLE IF NOT EXISTS audit_log (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, profile_id VARCHAR(64) NOT NULL, admin_email VARCHAR(254) NOT NULL,
      action VARCHAR(160) NOT NULL, before_json LONGTEXT, after_json LONGTEXT, created_at VARCHAR(40) NOT NULL,
      KEY idx_audit_profile (profile_id, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await db.run(`CREATE TABLE IF NOT EXISTS applied_migrations (
      migration_key VARCHAR(191) PRIMARY KEY, applied_at VARCHAR(40) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await db.run(`CREATE TABLE IF NOT EXISTS site_content (
      content_key VARCHAR(64) PRIMARY KEY, published_json LONGTEXT NOT NULL, draft_json LONGTEXT NOT NULL,
      updated_by VARCHAR(254) NOT NULL, updated_at VARCHAR(40) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    const adminColumns = await db.all(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admins'",
    );
    if (!adminColumns.some((column) => column.COLUMN_NAME === "role")) {
      await db.run("ALTER TABLE admins ADD COLUMN role VARCHAR(16) NOT NULL DEFAULT 'admin'");
    }
    await importLegacySqlite();
  } else {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'editor')), created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE, expires_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY, section TEXT NOT NULL, placement TEXT NOT NULL, name TEXT NOT NULL, title TEXT NOT NULL,
        biography TEXT NOT NULL DEFAULT '', background TEXT NOT NULL DEFAULT '', qualifications TEXT NOT NULL DEFAULT '',
        responsibilities TEXT NOT NULL DEFAULT '', photo_url TEXT NOT NULL DEFAULT '', is_vacant INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id TEXT NOT NULL, admin_email TEXT NOT NULL, action TEXT NOT NULL,
        before_json TEXT, after_json TEXT, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS applied_migrations (migration_key TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS site_content (
        content_key TEXT PRIMARY KEY, published_json TEXT NOT NULL, draft_json TEXT NOT NULL, updated_by TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_profiles_public ON profiles(status, section, sort_order);
      CREATE INDEX IF NOT EXISTS idx_audit_profile ON audit_log(profile_id, id DESC);
    `);
    const adminColumns = sqlite.pragma("table_info(admins)").map((column) => column.name);
    if (!adminColumns.includes("role")) sqlite.exec("ALTER TABLE admins ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'");
  }

  const manufacturingDefault = JSON.parse(fs.readFileSync(path.join(root, "manufacturing-content.json"), "utf8"));
  const now = new Date().toISOString();
  await db.run(
    "INSERT OR IGNORE INTO site_content (content_key, published_json, draft_json, updated_by, updated_at) VALUES ('manufacturing', ?, ?, 'system', ?)",
    JSON.stringify(manufacturingDefault), JSON.stringify(manufacturingDefault), now,
  );

  for (const profile of profiles) {
    const existing = await db.get("SELECT id FROM profiles WHERE id = ?", profile.id);
    if (existing) continue;
    const aliases = legacyAliases[profile.id];
    if (aliases && await db.get("SELECT id FROM profiles WHERE name = ? OR name = ? LIMIT 1", ...aliases)) continue;
    await db.run(`INSERT INTO profiles
      (id, section, placement, name, title, biography, background, qualifications, responsibilities, photo_url, is_vacant, status, sort_order, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval', ?, ?)`,
    profile.id, profile.section, profile.placement, profile.name, profile.title,
    profile.biography || "", profile.background || "", profile.qualifications || "",
    profile.responsibilities || "", profile.photo_url || "", profile.is_vacant ? 1 : 0,
    profile.sort_order, now);
  }

  const migrationKey = "leadership-roster-confirmation-2026-11-v1";
  if (await db.get("SELECT migration_key FROM applied_migrations WHERE migration_key = ?", migrationKey)) return;
  await db.transaction(async (tx) => {
    for (const source of profiles) {
      const aliases = legacyAliases[source.id];
      let row = await tx.get("SELECT * FROM profiles WHERE id = ?", source.id);
      if (!row && aliases) {
        row = await tx.get("SELECT * FROM profiles WHERE name = ? OR name = ? LIMIT 1", ...aliases);
      }
      if (!row) continue;
      const before = profileFromRow(row);
      const after = {
        ...before,
        section: source.section,
        placement: source.placement,
        name: source.name,
        title: source.title,
        is_vacant: Boolean(source.is_vacant),
        status: "pending_approval",
        sort_order: source.sort_order,
        photo_url: before.photo_url || source.photo_url || "",
        updated_at: now,
      };
      if (JSON.stringify(before) === JSON.stringify(after)) continue;
      await tx.run(`UPDATE profiles SET section=?, placement=?, name=?, title=?, is_vacant=?, status=?,
        sort_order=?, photo_url=?, updated_at=? WHERE id=?`,
      after.section, after.placement, after.name, after.title, after.is_vacant ? 1 : 0,
      after.status, after.sort_order, after.photo_url, after.updated_at, before.id);
      await writeAuditWith(tx, {
        profileId: before.id, email: "system-migration",
        action: "leadership roster classification updated; company approval required", before, after,
      });
    }
    const remainingPublished = await tx.all("SELECT * FROM profiles WHERE status = 'published'");
    for (const row of remainingPublished) {
      const before = profileFromRow(row);
      const after = { ...before, status: "pending_approval", updated_at: now };
      await tx.run("UPDATE profiles SET status = ?, updated_at = ? WHERE id = ?", after.status, after.updated_at, before.id);
      await writeAuditWith(tx, {
        profileId: before.id, email: "system-migration",
        action: "publication withdrawn pending company approval", before, after,
      });
    }
    await tx.run("INSERT INTO applied_migrations (migration_key, applied_at) VALUES (?, ?)", migrationKey, now);
  });
}

export const ready = initialize();
export { profileFromRow, useMysql };
