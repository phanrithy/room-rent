-- Migration 002: Room applications and tenant document association
CREATE TABLE IF NOT EXISTS room_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  move_in_date TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_room_applications_room ON room_applications(room_id);
CREATE INDEX IF NOT EXISTS idx_room_applications_tenant ON room_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_room_applications_status ON room_applications(status);

-- Add tenant_id to documents to support ID Card / Passport uploads before contract creation
ALTER TABLE documents ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;

-- Insert default telegram settings if not already present
INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_telegram_chat_id', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('telegram_bot_token', '');
