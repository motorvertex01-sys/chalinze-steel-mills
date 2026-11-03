import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.resolve(process.env.DATA_DIRECTORY || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data"));
fs.mkdirSync(directory, { recursive: true });

export const uploadDirectory = path.join(directory, "uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });
export const originalMediaDirectory = path.join(directory, "originals");
fs.mkdirSync(originalMediaDirectory, { recursive: true });

export const db = new Database(path.join(directory, "chalinze.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'editor')),
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    section TEXT NOT NULL CHECK (section IN ('board', 'management', 'support')),
    placement TEXT NOT NULL CHECK (placement IN ('board', 'governance')),
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    biography TEXT NOT NULL DEFAULT '',
    background TEXT NOT NULL DEFAULT '',
    qualifications TEXT NOT NULL DEFAULT '',
    responsibilities TEXT NOT NULL DEFAULT '',
    photo_url TEXT NOT NULL DEFAULT '',
    is_vacant INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('draft', 'pending_approval', 'published', 'archived')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id TEXT NOT NULL,
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    before_json TEXT,
    after_json TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS applied_migrations (
    migration_key TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS site_content (
    content_key TEXT PRIMARY KEY,
    published_json TEXT NOT NULL,
    draft_json TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_profiles_public ON profiles(status, section, sort_order);
  CREATE INDEX IF NOT EXISTS idx_audit_profile ON audit_log(profile_id, id DESC);
`);

const adminColumns = new Set(db.pragma("table_info(admins)").map((column) => column.name));
if (!adminColumns.has("role")) db.exec("ALTER TABLE admins ADD COLUMN role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'editor'))");

const manufacturingDefault = JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "manufacturing-content.json"), "utf8"));
const now = new Date().toISOString();
db.prepare(`
  INSERT OR IGNORE INTO site_content (content_key, published_json, draft_json, updated_by, updated_at)
  VALUES ('manufacturing', ?, ?, 'system', ?)
`).run(JSON.stringify(manufacturingDefault), JSON.stringify(manufacturingDefault), now);

const suppliedProfiles = [
  {
    id: "leadership-1", section: "board", placement: "board", name: "Mr. Amini N. Kimaro",
    title: "Chief Executive Officer / Board Chairman", sort_order: 10,
    photo_url: "/assets/leadership/amini-n-kimaro.webp",
    biography: "Mr. Amini N. Kimaro is a Tanzanian entrepreneur and business leader with experience in mining, mineral resources, industrial development and building-materials manufacturing. As Chief Executive Officer and Board Chairman of Chalinze Steel Mills Ltd, he provides strategic leadership focused on the sustainable development and value addition of Tanzania's mineral resources.",
    background: "His supplied profile describes experience across mining, mineral resources, industrial development and building-materials manufacturing, and leadership of Chalinze Steel Mills Ltd and other businesses.",
    qualifications: "",
    responsibilities: "The supplied profile describes strategic direction, corporate leadership, investment oversight and stakeholder engagement. Company approval of the role description is pending.",
  },
  {
    id: "leadership-2", section: "board", placement: "board", name: "Dr. Humphrey Musyoka", title: "Director", sort_order: 20,
    biography: "Dr. Humphrey M. Musyoka is a business development and operations professional with experience in healthcare, infrastructure project preparation and finance mobilization. His work includes resource mobilization, stakeholder engagement, research and development of infrastructure opportunities across Sub-Saharan Africa.",
    background: "His professional background includes Operations and Business Development Lead, East Africa, at Bankability Advisory (Pty) South Africa; Operations and Business Development Lead at Quillion Group Africa Consultants; Founding Secretary of the Kenya Cities Forum (now Kenya Urban Forum); and earlier medical and healthcare-management roles in Kenya.",
    qualifications: "Brokaw Fellowship Program, New York.",
    responsibilities: "",
  },
  { id: "leadership-3", section: "board", placement: "board", name: "Dr. Alfred C. Msemo", title: "Director", sort_order: 30 },
  {
    id: "leadership-4", section: "board", placement: "board", name: "Technical Advisor",
    title: "Position Vacant", is_vacant: true, sort_order: 40,
  },
  {
    id: "leadership-5", section: "board", placement: "governance", name: "Mr. Denis Kimaro",
    title: "ICT & Telecommunications Specialist – Networking, Fibre Optics & Technical Infrastructure", sort_order: 50,
    photo_url: "/assets/leadership/denis-a-kimaro.webp",
    biography: "Mr. Denis Kimaro is an ICT and telecommunications professional with practical experience in networking, structured cabling, fibre-optic installation and splicing, PABX systems, computer systems and related infrastructure. His supplied profile describes work as an ICT trainee with the Tanzania Ports Authority and subsequent technical work with C-NET Technologies (T) Ltd. The profile identifies him as a shareholder of NextGen Cement Co. Ltd; his Chalinze Steel Mills shareholder status, appointment and governance classification require company confirmation.",
    background: "Experience described in the supplied profile includes installation, maintenance and support of structured cabling, PABX, network and fibre-optic systems, MAN3000 billing systems, computers and related ICT equipment.",
    qualifications: "The supplied profile states that he holds an ICT qualification from the Dar es Salaam Institute of Technology (DIT). It also lists specialized training in Hikvision CCTV, PIMA security systems, Panasonic Smart PABX, Zyxel networking, structured cabling and fibre-optic systems, including training in Dubai.",
    responsibilities: "The supplied profile describes ICT infrastructure, telecommunications, network systems, fibre-optic connectivity, surveillance and technical support as areas of expertise. A Chalinze-specific appointment or responsibility has not been confirmed.",
  },
  {
    id: "leadership-6", section: "board", placement: "governance", name: "Ms. Juliette A. Kimaro",
    title: "Legal Professional | Corporate, Commercial & Legal Advisory", sort_order: 60,
    photo_url: "/assets/leadership/juliette-a-kimaro.webp",
    biography: "Juliette A. Kimaro is a Tanzanian legal professional with practical experience in independent legal practice and private-sector firms. Her supplied profile describes experience in corporate and commercial legal advisory, documentation, contracts and stakeholder engagement. It identifies her as a shareholder in the profile's NextGen Cement Co. Ltd context; her Chalinze Steel Mills shareholder status and any formal governance appointment require confirmation.",
    background: "The supplied profile describes independent legal practice, engagement with private-sector firms and an internship with the National Social Security Fund (NSSF).",
    qualifications: "Bachelor of Laws (LL.B.), Tumaini Makumira University, Dar es Salaam College. The profile also notes English and Swahili communication skills and Microsoft Office competence.",
    responsibilities: "Areas of professional expertise described in the supplied profile include legal research and analysis, legal advisory, corporate and contractual documentation, regulatory matters, compliance and stakeholder engagement. No Chalinze-specific appointment is confirmed.",
  },
  { id: "leadership-7", section: "management", placement: "board", name: "Harish Kumar", title: "Position/title to be confirmed.", sort_order: 10 },
  { id: "leadership-8", section: "management", placement: "board", name: "Chief Finance Officer (CFO)", title: "Name to be confirmed.", sort_order: 20 },
  {
    id: "leadership-9", section: "management", placement: "board", name: "Nickson Kimbori",
    title: "Operations – Logistics", sort_order: 30,
    biography: "Nickson Kimbori is a mining professional with more than two decades of practical experience in mining operations, logistics planning and community engagement, as described in the supplied profile. His experience includes field coordination, resource movement, transport and logistics, contractor engagement and stakeholder relations.",
    background: "The supplied profile describes field-based work in mining operations, site coordination, transport and logistics, contractor engagement and community relations.",
    qualifications: "",
    responsibilities: "The supplied profile describes mining operations planning, raw-material supply logistics, community engagement and coordination between upstream mining and downstream industrial activities.",
  },
  {
    id: "leadership-10", section: "management", placement: "board", name: "Mr. Ridhiwani M. Mbaruku",
    title: "Mining Operations", sort_order: 40,
    photo_url: "/assets/leadership/ridhiwani-m-mbaruku.webp",
  },
  { id: "leadership-11", section: "management", placement: "board", name: "Mr. Sospeter Urassa", title: "Chief Accountant", sort_order: 50 },
  { id: "leadership-12", section: "management", placement: "board", name: "Godluck E. Urassa", title: "IT / Electrician Specialist", sort_order: 60 },
  { id: "leadership-13", section: "management", placement: "board", name: "Mining Engineer", title: "Position Vacant", is_vacant: true, sort_order: 70 },
  { id: "leadership-14", section: "management", placement: "board", name: "Geologist", title: "Position Vacant", is_vacant: true, sort_order: 80 },
  { id: "leadership-15", section: "support", placement: "board", name: "Chief Cashier", title: "Supporting Staff", sort_order: 10 },
  { id: "leadership-16", section: "support", placement: "board", name: "Drivers", title: "Supporting Staff", sort_order: 20 },
  { id: "leadership-17", section: "support", placement: "board", name: "Cleaners", title: "Supporting Staff", sort_order: 30 },
  { id: "leadership-18", section: "support", placement: "board", name: "Machine Operators", title: "Supporting Staff", sort_order: 40 },
];

const insertProfile = db.prepare(`
  INSERT OR IGNORE INTO profiles
    (id, section, placement, name, title, biography, background, qualifications, responsibilities, photo_url, is_vacant, status, sort_order, updated_at)
  VALUES
    (@id, @section, @placement, @name, @title, @biography, @background, @qualifications, @responsibilities, @photo_url, @is_vacant, @status, @sort_order, @updated_at)
`);
const initiallyPublishedProfileIds = new Set(["leadership-2", "leadership-9", "leadership-15", "leadership-16", "leadership-17", "leadership-18"]);
const profileSeedTimestamp = new Date().toISOString();
const seed = db.transaction(() => {
  for (const profile of suppliedProfiles) {
    insertProfile.run({
      biography: "",
      background: "",
      qualifications: "",
      responsibilities: "",
      photo_url: "",
      ...profile,
      is_vacant: profile.is_vacant ? 1 : 0,
      status: initiallyPublishedProfileIds.has(profile.id) ? "published" : "pending_approval",
      updated_at: profileSeedTimestamp,
    });
  }

  const legacyUpdates = [
    { oldName: "Denis A. Kimaro", newName: "Mr. Denis Kimaro", placement: "governance" },
    { oldName: "Mrs. Juliette Kimaro", newName: "Ms. Juliette A. Kimaro", placement: "governance" },
    { oldName: "Mr. Nickson Kimbori", newName: "Nickson Kimbori", placement: "board" },
  ];
  for (const update of legacyUpdates) {
    const profile = db.prepare("SELECT * FROM profiles WHERE name IN (?, ?, ?) ORDER BY CASE name WHEN ? THEN 0 ELSE 1 END LIMIT 1")
      .get(update.oldName, update.newName, update.newName, update.oldName);
    const current = profileFromRow(profile);
    const source = suppliedProfiles.find((item) => item.name === update.newName);
    if (!current || !source) continue;
    const replaceCopy = !current.biography || /placeholder|pending|not supplied|not yet approved/i.test(current.biography);
    const after = {
      ...current,
      name: source.name,
      title: source.title,
      section: source.section,
      placement: update.placement,
      biography: replaceCopy ? source.biography : current.biography,
      background: replaceCopy ? source.background : current.background,
      qualifications: replaceCopy ? source.qualifications : current.qualifications,
      responsibilities: replaceCopy ? source.responsibilities : current.responsibilities,
      status: update.newName === "Nickson Kimbori" ? current.status : "pending_approval",
      updated_at: profileSeedTimestamp,
    };
    if (JSON.stringify(current) !== JSON.stringify(after)) {
      db.prepare(`UPDATE profiles SET name=@name, title=@title, section=@section, placement=@placement,
        biography=@biography, background=@background, qualifications=@qualifications,
        responsibilities=@responsibilities, status=@status, updated_at=@updated_at WHERE id=@id`).run(after);
      writeAudit({ profileId: current.id, email: "system-migration", action: "leadership source update; approval required", before: current, after });
    }
  }

  const amini = db.prepare("SELECT * FROM profiles WHERE name = ?").get("Mr. Amini N. Kimaro");
  const aminiCurrent = profileFromRow(amini);
  const aminiSource = suppliedProfiles[0];
  if (aminiCurrent && (aminiCurrent.title !== aminiSource.title || !aminiCurrent.biography || /placeholder|pending|not supplied|not yet approved/i.test(aminiCurrent.biography))) {
    const after = {
      ...aminiCurrent,
      title: aminiSource.title,
      biography: aminiSource.biography,
      background: aminiCurrent.background || aminiSource.background,
      responsibilities: aminiCurrent.responsibilities || aminiSource.responsibilities,
      status: "pending_approval",
      updated_at: profileSeedTimestamp,
    };
    db.prepare(`UPDATE profiles SET title=@title, biography=@biography, background=@background,
      responsibilities=@responsibilities, status=@status, updated_at=@updated_at WHERE id=@id`).run(after);
    writeAudit({ profileId: aminiCurrent.id, email: "system-migration", action: "leadership source update; approval required", before: aminiCurrent, after });
  }

  const humphreySource = suppliedProfiles[1];
  const humphreyCurrent = profileFromRow(db.prepare("SELECT * FROM profiles WHERE id = ?").get(humphreySource.id));
  const refreshHumphreySource = humphreyCurrent && (
    !humphreyCurrent.biography ||
    /does not specify academic qualifications/i.test(humphreyCurrent.qualifications) ||
    /No Chalinze Steel Mills-specific Board responsibilities/i.test(humphreyCurrent.responsibilities)
  );
  if (humphreyCurrent && refreshHumphreySource) {
    const after = {
      ...humphreyCurrent,
      biography: humphreySource.biography,
      background: humphreySource.background,
      qualifications: humphreySource.qualifications,
      responsibilities: humphreySource.responsibilities,
      updated_at: profileSeedTimestamp,
    };
    db.prepare(`UPDATE profiles SET biography=@biography, background=@background,
      qualifications=@qualifications, responsibilities=@responsibilities, updated_at=@updated_at WHERE id=@id`).run(after);
    writeAudit({ profileId: humphreyCurrent.id, email: "system-migration", action: "leadership source profile details updated", before: humphreyCurrent, after });
  }

  const publicationMigrationKey = "publish-source-backed-profiles-and-support-roles-2026-11";
  const publicationMigration = db.prepare("SELECT migration_key FROM applied_migrations WHERE migration_key = ?").get(publicationMigrationKey);
  if (!publicationMigration) {
    for (const id of initiallyPublishedProfileIds) {
      const current = profileFromRow(db.prepare("SELECT * FROM profiles WHERE id = ?").get(id));
      if (!current || current.status !== "pending_approval") continue;
      const after = { ...current, status: "published", updated_at: profileSeedTimestamp };
      db.prepare("UPDATE profiles SET status = ?, updated_at = ? WHERE id = ?").run(after.status, after.updated_at, current.id);
      writeAudit({ profileId: current.id, email: "system-migration", action: "source-backed leadership profile published", before: current, after });
    }
    db.prepare("INSERT INTO applied_migrations (migration_key, applied_at) VALUES (?, ?)").run(publicationMigrationKey, profileSeedTimestamp);
  }

  for (const source of suppliedProfiles) {
    if (!source.photo_url) continue;
    const current = profileFromRow(db.prepare("SELECT * FROM profiles WHERE name = ?").get(source.name));
    if (!current || current.photo_url) continue;
    const after = { ...current, photo_url: source.photo_url, updated_at: profileSeedTimestamp };
    db.prepare("UPDATE profiles SET photo_url = ?, updated_at = ? WHERE id = ?")
      .run(after.photo_url, after.updated_at, current.id);
    writeAudit({ profileId: current.id, email: "system-migration", action: "leadership portrait added", before: current, after });
  }
});
seed();

export function profileFromRow(row) {
  if (!row) return null;
  return {
    ...row,
    is_vacant: Boolean(row.is_vacant),
  };
}

export function writeAudit({ profileId, email, action, before, after }) {
  db.prepare(`
    INSERT INTO audit_log (profile_id, admin_email, action, before_json, after_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    profileId,
    email,
    action,
    before ? JSON.stringify(before) : null,
    after ? JSON.stringify(after) : null,
    new Date().toISOString(),
  );
}
