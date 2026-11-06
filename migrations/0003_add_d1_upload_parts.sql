CREATE TABLE IF NOT EXISTS upload_parts (
  object_key TEXT NOT NULL,
  part_number INTEGER NOT NULL CHECK (part_number >= 0),
  data BLOB NOT NULL,
  PRIMARY KEY (object_key, part_number),
  FOREIGN KEY (object_key) REFERENCES uploads(object_key) ON DELETE CASCADE
);
