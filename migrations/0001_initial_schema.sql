CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  section TEXT NOT NULL,
  placement TEXT NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  biography TEXT NOT NULL DEFAULT '',
  background TEXT NOT NULL DEFAULT '',
  qualifications TEXT NOT NULL DEFAULT '',
  responsibilities TEXT NOT NULL DEFAULT '',
  photo_url TEXT NOT NULL DEFAULT '',
  is_vacant INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

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

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_content (
  content_key TEXT PRIMARY KEY,
  published_json TEXT NOT NULL,
  draft_json TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS change_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  state TEXT NOT NULL CHECK (state IN ('applied', 'undone', 'superseded')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT NOT NULL,
  attempted_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_public ON profiles(status, section, sort_order);
CREATE INDEX IF NOT EXISTS idx_audit_profile ON audit_log(profile_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_change_history_state ON change_history(state, id DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_recent ON login_attempts(ip, attempted_at);

INSERT OR IGNORE INTO profiles
  (id, section, placement, name, title, photo_url, is_vacant, status, sort_order, updated_at)
VALUES
  ('leadership-1', 'board', 'board', 'Mr. Amini N. Kimaro', 'Chief Executive Officer/ Board Chairman', '/assets/leadership/amini-n-kimaro.webp', 0, 'published', 10, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('leadership-2', 'board', 'board', 'Dr. Humphrey Musyoka', 'Director', '', 0, 'published', 20, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('leadership-3', 'board', 'board', 'Dr. Alfred C. Msemo', 'Director', '', 0, 'published', 30, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('leadership-5', 'board', 'board', 'Denis A. Kimaro', 'Director', '/assets/leadership/denis-a-kimaro.webp', 0, 'published', 40, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('leadership-6', 'board', 'board', 'Mrs. Juliette Kimaro', 'Chief Legal Counsel', '/assets/leadership/juliette-a-kimaro.webp', 0, 'published', 50, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('leadership-4', 'board', 'board', 'Technical Advisor', 'Position Vacant', '', 1, 'published', 60, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('leadership-7', 'management', 'governance', 'Harish Kumar', 'position/title to be confirmed', '', 0, 'published', 10, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('leadership-8', 'management', 'governance', 'Chief Finance Officer (CFO)', 'name to be confirmed', '', 0, 'published', 20, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('leadership-9', 'management', 'governance', 'Nickson Kimbori', 'Operations - Logistics', '', 0, 'published', 30, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('leadership-10', 'management', 'governance', 'Ridhiwani M. Mbaruku', 'Mining Operations', '/assets/leadership/ridhiwani-m-mbaruku.webp', 0, 'published', 40, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('leadership-11', 'management', 'governance', 'Mr. Sospeter Urassa', 'Chief Accountant', '', 0, 'published', 50, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('leadership-12', 'management', 'governance', 'Godluck E. Urassa', 'IT / Electrician Specialist', '', 0, 'published', 60, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('leadership-13', 'management', 'governance', 'Mining Engineer', 'Position Vacant', '', 1, 'published', 70, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('leadership-14', 'management', 'governance', 'Geologist', 'Position Vacant', '', 1, 'published', 80, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('leadership-15', 'support', 'governance', 'Chief Cashier', 'Chief Cashier', '', 0, 'published', 10, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('leadership-16', 'support', 'governance', 'Drivers', 'Drivers', '', 0, 'published', 20, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('leadership-17', 'support', 'governance', 'Cleaners', 'Cleaners', '', 0, 'published', 30, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('leadership-18', 'support', 'governance', 'Machine Operators', 'Machine Operators', '', 0, 'published', 40, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
