CREATE TABLE IF NOT EXISTS uploads (
  object_key TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  original_name TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at);
