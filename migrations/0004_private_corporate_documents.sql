CREATE TABLE IF NOT EXISTS corporate_documents (
  document_key TEXT PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type = 'application/pdf'),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 1800000),
  document_data BLOB NOT NULL,
  uploaded_by TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
