import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.resolve(process.env.DATA_DIRECTORY || path.join(root, "data"));

export const uploadDirectory = path.join(directory, "uploads");
export const originalMediaDirectory = path.join(directory, "originals");
fs.mkdirSync(uploadDirectory, { recursive: true });
fs.mkdirSync(originalMediaDirectory, { recursive: true });

fs.mkdirSync(directory, { recursive: true });
const sqlite = new Database(path.join(directory, "chalinze.sqlite"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = {
  async all(sql, ...params) {
    return sqlite.prepare(sql).all(...params);
  },
  async get(sql, ...params) {
    return sqlite.prepare(sql).get(...params);
  },
  async run(sql, ...params) {
    return sqlite.prepare(sql).run(...params);
  },
  async transaction(callback) {
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
    sqlite.close();
  },
};

const sourceProfileDetails = {
  "leadership-1": {
    biography: "Mr. Amini N. Kimaro is a Tanzanian entrepreneur and business leader with experience in mining, mineral resources, industrial development and building-materials manufacturing. As Chief Executive Officer and Board Chairman of Chalinze Steel Mills Ltd, he provides strategic leadership for the company's planned industrial development.",
    background: "His professional focus includes mining and mineral resources, industrial development, and building-materials manufacturing.",
    responsibilities: "Strategic direction, corporate leadership, investment oversight and stakeholder engagement.",
  },
  "leadership-2": {
    biography: "Dr. Humphrey Musyoka is a business-development and infrastructure-project professional with experience in operations, project preparation, stakeholder engagement and resource mobilization. His career also includes earlier medical and humanitarian service.",
    background: "His experience spans business development and operations, infrastructure finance and project preparation, regional health management, and medical services.",
    qualifications: "Professional experience includes project preparation, demand assessment, stakeholder engagement, research, data analysis and resource mobilization.",
  },
  "leadership-5": {
    biography: "Denis A. Kimaro is an ICT and telecommunications professional with experience in networking, structured cabling, fibre-optic installation and splicing, PABX systems, computer systems and related infrastructure. His professional experience includes ICT training with Tanzania Ports Authority and technical work with C-NET Technologies (T) Ltd.",
    background: "His work includes installation, maintenance and support of structured cabling, PABX, networking and billing systems, fibre-optic systems, computers and related ICT equipment.",
    qualifications: "ICT qualification from Dar es Salaam Institute of Technology (DIT), with additional training in CCTV and surveillance, security systems, PABX, networking, structured cabling and fibre optics, including international ICT training in Dubai.",
  },
  "leadership-6": {
    biography: "Juliette A. Kimaro is a Tanzanian legal professional with a Bachelor of Laws (LL.B.) from Tumaini University Makumira, Dar es Salaam College. Her experience includes independent legal practice and engagement with private-sector firms on corporate, commercial and legal matters.",
    background: "Her experience includes legal advisory, research and analysis, contracts, corporate documentation and stakeholder engagement, as well as an internship with the National Social Security Fund (NSSF).",
    qualifications: "Bachelor of Laws (LL.B.), Tumaini University Makumira, Dar es Salaam College.",
  },
  "leadership-9": {
    biography: "Nickson Kimbori is a mining-operations professional with more than 20 years of experience in mine operations, logistics planning and community engagement.",
    background: "His experience spans mining operations, logistics planning, site coordination, contractor engagement and community relations.",
    responsibilities: "Operations and logistics coordination.",
  },
};

const priorSourceProfileDetails = {
  "leadership-5": {
    biography: "Denis A. Kimaro is an ICT and telecommunications specialist with experience in networking, structured cabling, fibre-optic installation and splicing, PABX, computer systems and related infrastructure. His experience includes work with Tanzania Ports Authority and C-NET Technologies (T) Ltd.",
    background: "Experience includes ICT infrastructure deployment and support, networking, fibre-optic systems, PABX, CCTV and security systems.",
    qualifications: "ICT qualification from Dar es Salaam Institute of Technology (DIT), with additional training in CCTV, security systems, PABX, networking, structured cabling and fibre optics.",
  },
  "leadership-6": {
    biography: "Juliette Kimaro is a legal professional with a Bachelor of Laws from Tumaini University Makumira, Dar es Salaam College. Her experience includes independent legal practice, private-sector corporate and commercial work, legal advisory, contracts and documentation.",
    background: "Her experience includes legal research and analysis, corporate and commercial advisory, contracts, documentation, regulatory compliance and an internship with the National Social Security Fund (NSSF).",
    qualifications: "Bachelor of Laws (LL.B.), Tumaini University Makumira, Dar es Salaam College.",
  },
};

const profiles = [
  {
    id: "leadership-1", section: "board", placement: "board", name: "Mr. Amini N. Kimaro",
    title: "Chief Executive Officer/ Board Chairman", sort_order: 10,
    photo_url: "/assets/leadership/amini-n-kimaro.webp",
  },
  {
    id: "leadership-2", section: "board", placement: "board", name: "Dr. Humphrey Musyoka",
    title: "Director", sort_order: 20, ...sourceProfileDetails["leadership-2"],
  },
  { id: "leadership-3", section: "board", placement: "board", name: "Dr. Alfred C. Msemo", title: "Director", sort_order: 30 },
  { id: "leadership-4", section: "board", placement: "board", name: "Technical Advisor", title: "Position Vacant", is_vacant: true, sort_order: 60 },
  {
    id: "leadership-5", section: "board", placement: "board", name: "Denis A. Kimaro",
    title: "Director", sort_order: 40, photo_url: "/assets/leadership/denis-a-kimaro.webp", ...sourceProfileDetails["leadership-5"],
  },
  {
    id: "leadership-6", section: "board", placement: "board", name: "Mrs. Juliette Kimaro",
    title: "Chief Legal Counsel", sort_order: 50, photo_url: "/assets/leadership/juliette-a-kimaro.webp", ...sourceProfileDetails["leadership-6"],
  },
  { id: "leadership-7", section: "management", placement: "governance", name: "Harish Kumar", title: "position/title to be confirmed", sort_order: 10 },
  { id: "leadership-8", section: "management", placement: "governance", name: "Chief Finance Officer (CFO)", title: "name to be confirmed", sort_order: 20 },
  {
    id: "leadership-9", section: "management", placement: "governance", name: "Nickson Kimbori",
    title: "Operations - Logistics", sort_order: 30, ...sourceProfileDetails["leadership-9"],
  },
  { id: "leadership-10", section: "management", placement: "governance", name: "Ridhiwani M. Mbaruku", title: "Mining Operations", sort_order: 40, photo_url: "/assets/leadership/ridhiwani-m-mbaruku.webp" },
  { id: "leadership-11", section: "management", placement: "governance", name: "Mr. Sospeter Urassa", title: "Chief Accountant", sort_order: 50 },
  { id: "leadership-12", section: "management", placement: "governance", name: "Godluck E. Urassa", title: "IT / Electrician Specialist", sort_order: 60 },
  { id: "leadership-13", section: "management", placement: "governance", name: "Mining Engineer", title: "Position Vacant", is_vacant: true, sort_order: 70 },
  { id: "leadership-14", section: "management", placement: "governance", name: "Geologist", title: "Position Vacant", is_vacant: true, sort_order: 80 },
  { id: "leadership-15", section: "support", placement: "governance", name: "Chief Cashier", title: "Chief Cashier", sort_order: 10 },
  { id: "leadership-16", section: "support", placement: "governance", name: "Drivers", title: "Drivers", sort_order: 20 },
  { id: "leadership-17", section: "support", placement: "governance", name: "Cleaners", title: "Cleaners", sort_order: 30 },
  { id: "leadership-18", section: "support", placement: "governance", name: "Machine Operators", title: "Machine Operators", sort_order: 40 },
];

const legacyAliases = {
  "leadership-5": ["Mr. Denis Kimaro", "Denis A. Kimaro"],
  "leadership-6": ["Ms. Juliette A. Kimaro", "Mrs. Juliette Kimaro"],
  "leadership-9": ["Mr. Nickson Kimbori", "Nickson Kimbori"],
  "leadership-10": ["Mr. Ridhiwani M. Mbaruku", "Ridhiwani M. Mbaruku"],
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

export async function recordChange(tx, { contentType, entityId, email, action, before, after }) {
  await tx.run("UPDATE change_history SET state = 'superseded' WHERE state = 'undone'");
  await tx.run(
    `INSERT INTO change_history (content_type, entity_id, admin_email, action, before_json, after_json, state, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'applied', ?)`,
    contentType, entityId, email, action, before === null ? null : JSON.stringify(before),
    after === null ? null : JSON.stringify(after), new Date().toISOString(),
  );
}

async function initialize() {
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
    CREATE TABLE IF NOT EXISTS change_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, content_type TEXT NOT NULL, entity_id TEXT NOT NULL,
      admin_email TEXT NOT NULL, action TEXT NOT NULL, before_json TEXT, after_json TEXT,
      state TEXT NOT NULL CHECK (state IN ('applied', 'undone', 'superseded')), created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_profiles_public ON profiles(status, section, sort_order);
    CREATE INDEX IF NOT EXISTS idx_audit_profile ON audit_log(profile_id, id DESC);
    CREATE INDEX IF NOT EXISTS idx_change_history_state ON change_history(state, id DESC);
  `);
  const adminColumns = sqlite.pragma("table_info(admins)").map((column) => column.name);
  if (!adminColumns.includes("role")) sqlite.exec("ALTER TABLE admins ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'");

  const manufacturingDefault = JSON.parse(fs.readFileSync(path.join(root, "manufacturing-content.json"), "utf8"));
  const now = new Date().toISOString();
  await db.run(
    "INSERT OR IGNORE INTO site_content (content_key, published_json, draft_json, updated_by, updated_at) VALUES ('manufacturing', ?, ?, 'system', ?)",
    JSON.stringify(manufacturingDefault), JSON.stringify(manufacturingDefault), now,
  );
  const siteConfigDefault = {
    version: 1,
    theme: { accent: "#f47721", background: "#090a0c", panel: "#111418", headingFont: "Manrope", bodyFont: "Arial" },
    layout: "cards",
    home: {},
    navigation: [],
    footer: { tagline: "", groups: [], email: "", phone: "", copyrightNote: "" },
    pages: {},
  };
  await db.run(
    "INSERT OR IGNORE INTO site_content (content_key, published_json, draft_json, updated_by, updated_at) VALUES ('site-config', ?, ?, 'system', ?)",
    JSON.stringify(siteConfigDefault), JSON.stringify(siteConfigDefault), now,
  );

  for (const profile of profiles) {
    const existing = await db.get("SELECT id FROM profiles WHERE id = ?", profile.id);
    if (existing) continue;
    const aliases = legacyAliases[profile.id];
    if (aliases && await db.get("SELECT id FROM profiles WHERE name = ? OR name = ? LIMIT 1", ...aliases)) continue;
    await db.run(`INSERT INTO profiles
      (id, section, placement, name, title, biography, background, qualifications, responsibilities, photo_url, is_vacant, status, sort_order, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)` ,
    profile.id, profile.section, profile.placement, profile.name, profile.title,
    profile.biography || "", profile.background || "", profile.qualifications || "",
    profile.responsibilities || "", profile.photo_url || "", profile.is_vacant ? 1 : 0,
    profile.sort_order, now);
  }

  const priorMigrationKey = "leadership-roster-confirmation-2026-11-v1";
  if (!await db.get("SELECT migration_key FROM applied_migrations WHERE migration_key = ?", priorMigrationKey)) {
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
      await tx.run("INSERT INTO applied_migrations (migration_key, applied_at) VALUES (?, ?)", priorMigrationKey, now);
    });
  }

  const publicRosterMigrationKey = "exact-public-leadership-roster-2026-11-v1";
  if (!await db.get("SELECT migration_key FROM applied_migrations WHERE migration_key = ?", publicRosterMigrationKey)) {
    await db.transaction(async (tx) => {
      const rosterIds = new Set();
      for (const source of profiles) {
        const aliases = legacyAliases[source.id];
        let row = await tx.get("SELECT * FROM profiles WHERE id = ?", source.id);
        if (!row && aliases) {
          row = await tx.get("SELECT * FROM profiles WHERE name = ? OR name = ? LIMIT 1", ...aliases);
        }
        if (!row) continue;
        rosterIds.add(row.id);
        const before = profileFromRow(row);
        const after = {
          ...before,
          section: source.section,
          placement: source.placement,
          name: source.name,
          title: source.title,
          biography: "",
          background: "",
          qualifications: "",
          responsibilities: "",
          photo_url: source.photo_url || "",
          is_vacant: Boolean(source.is_vacant),
          status: "published",
          sort_order: source.sort_order,
          updated_at: now,
        };
        if (JSON.stringify(before) === JSON.stringify(after)) continue;
        await tx.run(`UPDATE profiles SET section=?, placement=?, name=?, title=?, biography=?, background=?,
          qualifications=?, responsibilities=?, photo_url=?, is_vacant=?, status=?, sort_order=?, updated_at=? WHERE id=?`,
        after.section, after.placement, after.name, after.title, after.biography, after.background,
        after.qualifications, after.responsibilities, after.photo_url, after.is_vacant ? 1 : 0,
        after.status, after.sort_order, after.updated_at, before.id);
        await writeAuditWith(tx, {
          profileId: before.id,
          email: "system-migration",
          action: "published supplied leadership roster and removed unsupported profile details",
          before,
          after,
        });
      }

      const publishedProfiles = await tx.all("SELECT * FROM profiles WHERE status = 'published'");
      for (const row of publishedProfiles) {
        if (rosterIds.has(row.id)) continue;
        const before = profileFromRow(row);
        const after = { ...before, status: "archived", updated_at: now };
        await tx.run("UPDATE profiles SET status = ?, updated_at = ? WHERE id = ?", after.status, after.updated_at, before.id);
        await writeAuditWith(tx, {
          profileId: before.id,
          email: "system-migration",
          action: "archived profile outside supplied public leadership roster",
          before,
          after,
        });
      }
      await tx.run("INSERT INTO applied_migrations (migration_key, applied_at) VALUES (?, ?)", publicRosterMigrationKey, now);
    });
  }

  const sourceDetailsMigrationKey = "verified-leadership-source-details-2026-11-v1";
  if (!await db.get("SELECT migration_key FROM applied_migrations WHERE migration_key = ?", sourceDetailsMigrationKey)) {
    await db.transaction(async (tx) => {
      for (const source of profiles) {
        const details = sourceProfileDetails[source.id] || {};
        if (!Object.keys(details).length && !source.photo_url) continue;
        let row = await tx.get("SELECT * FROM profiles WHERE id = ?", source.id);
        const aliases = legacyAliases[source.id];
        if (!row && aliases) row = await tx.get("SELECT * FROM profiles WHERE name = ? OR name = ? LIMIT 1", ...aliases);
        if (!row) continue;
        const before = profileFromRow(row);
        const after = {
          ...before,
          ...Object.fromEntries(Object.entries(details).map(([field, value]) => [field, before[field] || value])),
          photo_url: source.photo_url || before.photo_url,
          updated_at: now,
        };
        if (JSON.stringify(before) === JSON.stringify(after)) continue;
        await tx.run(`UPDATE profiles SET biography=?, background=?, qualifications=?, responsibilities=?,
          photo_url=?, updated_at=? WHERE id=?`,
        after.biography, after.background, after.qualifications, after.responsibilities,
        after.photo_url, after.updated_at, before.id);
        await writeAuditWith(tx, {
          profileId: before.id,
          email: "system-migration",
          action: "added verified leadership source details and portraits",
          before,
          after,
        });
      }
      await tx.run("INSERT INTO applied_migrations (migration_key, applied_at) VALUES (?, ?)", sourceDetailsMigrationKey, now);
    });
  }

  const uploadedProfileDetailsMigrationKey = "uploaded-leadership-profiles-2026-11-v1";
  if (await db.get("SELECT migration_key FROM applied_migrations WHERE migration_key = ?", uploadedProfileDetailsMigrationKey)) return;
  await db.transaction(async (tx) => {
    for (const source of profiles) {
      const details = sourceProfileDetails[source.id];
      if (!details) continue;
      const row = await tx.get("SELECT * FROM profiles WHERE id = ?", source.id);
      if (!row) continue;
      const before = profileFromRow(row);
      const previousDetails = priorSourceProfileDetails[source.id] || {};
      const after = {
        ...before,
        ...Object.fromEntries(Object.entries(details).map(([field, value]) => [
          field,
          !before[field] || before[field] === previousDetails[field] ? value : before[field],
        ])),
        updated_at: now,
      };
      if (JSON.stringify(before) === JSON.stringify(after)) continue;
      await tx.run(`UPDATE profiles SET biography=?, background=?, qualifications=?, responsibilities=?, updated_at=?
        WHERE id=?`,
      after.biography, after.background, after.qualifications, after.responsibilities, after.updated_at, before.id);
      await writeAuditWith(tx, {
        profileId: before.id,
        email: "system-migration",
        action: "updated leadership profiles from supplied professional documents",
        before,
        after,
      });
    }
    await tx.run("INSERT INTO applied_migrations (migration_key, applied_at) VALUES (?, ?)", uploadedProfileDetailsMigrationKey, now);
  });
}

export const ready = initialize();
export { profileFromRow };
