CREATE TABLE IF NOT EXISTS schema_migrations (
  migration_key VARCHAR(191) PRIMARY KEY,
  applied_at VARCHAR(40) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(191) PRIMARY KEY,
  section VARCHAR(32) NOT NULL,
  placement VARCHAR(32) NOT NULL,
  name VARCHAR(160) NOT NULL,
  title VARCHAR(200) NOT NULL,
  biography TEXT NOT NULL,
  background TEXT NOT NULL,
  qualifications TEXT NOT NULL,
  responsibilities TEXT NOT NULL,
  photo_url VARCHAR(1000) NOT NULL DEFAULT '',
  is_vacant TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at VARCHAR(40) NOT NULL,
  INDEX idx_profiles_public (status, section, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admins (
  id VARCHAR(191) PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(256) NOT NULL,
  password_salt VARCHAR(256) NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'admin',
  created_at VARCHAR(40) NOT NULL,
  CONSTRAINT chk_admin_role CHECK (role IN ('admin', 'editor'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) PRIMARY KEY,
  admin_id VARCHAR(191) NOT NULL,
  expires_at VARCHAR(40) NOT NULL,
  INDEX idx_sessions_expiry (expires_at),
  CONSTRAINT fk_sessions_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  profile_id VARCHAR(191) NOT NULL,
  admin_email VARCHAR(254) NOT NULL,
  action VARCHAR(255) NOT NULL,
  before_json LONGTEXT NULL,
  after_json LONGTEXT NULL,
  created_at VARCHAR(40) NOT NULL,
  INDEX idx_audit_profile (profile_id, id DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS applied_migrations (
  migration_key VARCHAR(191) PRIMARY KEY,
  applied_at VARCHAR(40) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_content (
  content_key VARCHAR(64) PRIMARY KEY,
  published_json LONGTEXT NOT NULL,
  draft_json LONGTEXT NOT NULL,
  updated_by VARCHAR(254) NOT NULL,
  updated_at VARCHAR(40) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS change_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  content_type VARCHAR(32) NOT NULL,
  entity_id VARCHAR(191) NOT NULL,
  admin_email VARCHAR(254) NOT NULL,
  action VARCHAR(255) NOT NULL,
  before_json LONGTEXT NULL,
  after_json LONGTEXT NULL,
  state VARCHAR(16) NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  INDEX idx_change_history_state (state, id DESC),
  CONSTRAINT chk_change_history_state CHECK (state IN ('applied', 'undone', 'superseded'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_attempts (
  ip VARCHAR(64) NOT NULL,
  attempted_at BIGINT NOT NULL,
  INDEX idx_login_attempts_recent (ip, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS uploads (
  object_key VARCHAR(512) PRIMARY KEY,
  content_type VARCHAR(127) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  uploaded_by VARCHAR(254) NOT NULL,
  created_at VARCHAR(40) NOT NULL,
  INDEX idx_uploads_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
