-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'staff', 'tenant')),
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  language TEXT NOT NULL DEFAULT 'en' CHECK(language IN ('en', 'km')),
  theme TEXT NOT NULL DEFAULT 'system' CHECK(theme IN ('light', 'dark', 'system')),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Properties
CREATE TABLE IF NOT EXISTS properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT NOT NULL
);

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  floor INTEGER NOT NULL,
  monthly_rent INTEGER NOT NULL CHECK(monthly_rent >= 0),
  status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'maintenance')),
  note TEXT,
  UNIQUE(property_id, room_number)
);

-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  id_number TEXT,
  email TEXT,
  telegram_chat_id TEXT,
  language TEXT NOT NULL DEFAULT 'km' CHECK(language IN ('en', 'km')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Contracts
CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  deposit INTEGER NOT NULL CHECK(deposit >= 0),
  rent_amount INTEGER NOT NULL CHECK(rent_amount >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'ended')),
  ended_at TEXT
);

-- Partial unique index for active contract per room
CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_room_active ON contracts(room_id) WHERE status = 'active';

-- Meter readings
CREATE TABLE IF NOT EXISTS meter_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  month TEXT NOT NULL,
  electric_prev INTEGER NOT NULL CHECK(electric_prev >= 0),
  electric_current INTEGER NOT NULL CHECK(electric_current >= electric_prev),
  water_prev INTEGER NOT NULL CHECK(water_prev >= 0),
  water_current INTEGER NOT NULL CHECK(water_current >= water_prev),
  UNIQUE(room_id, month)
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL REFERENCES contracts(id),
  month TEXT NOT NULL,
  rent INTEGER NOT NULL CHECK(rent >= 0),
  electric_cost INTEGER NOT NULL CHECK(electric_cost >= 0),
  water_cost INTEGER NOT NULL CHECK(water_cost >= 0),
  other_charges INTEGER NOT NULL DEFAULT 0,
  late_fee INTEGER NOT NULL DEFAULT 0 CHECK(late_fee >= 0),
  total INTEGER NOT NULL CHECK(total >= 0),
  paid_amount INTEGER NOT NULL DEFAULT 0 CHECK(paid_amount >= 0 AND paid_amount <= total),
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid', 'partial', 'paid', 'overdue')),
  due_date TEXT NOT NULL,
  khqr_string TEXT,
  khqr_md5 TEXT,
  UNIQUE(contract_id, month)
);

-- Invoice items
CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id),
  amount INTEGER NOT NULL CHECK(amount > 0),
  method TEXT NOT NULL CHECK(method IN ('cash', 'bank', 'qr')),
  paid_at TEXT NOT NULL DEFAULT (datetime('now')),
  note TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual', 'khqr_auto'))
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL REFERENCES properties(id),
  room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK(category IN ('repair', 'cleaning', 'utilities', 'other')),
  amount INTEGER NOT NULL CHECK(amount >= 0),
  spent_at TEXT NOT NULL,
  note TEXT
);

-- Maintenance Requests
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'done')),
  cost INTEGER NOT NULL DEFAULT 0 CHECK(cost >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  done_at TEXT
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('id_copy', 'contract', 'other')),
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('before_due', 'overdue')),
  channel TEXT NOT NULL CHECK(channel IN ('telegram', 'email')),
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(invoice_id, type)
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id INTEGER,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_property ON rooms(property_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant ON contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_room ON contracts(room_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_room_month ON meter_readings(room_id, month);
CREATE INDEX IF NOT EXISTS idx_invoices_contract_month ON invoices(contract_id, month);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_expenses_property_spent ON expenses(property_id, spent_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_room ON maintenance_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_documents_contract ON documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_table ON audit_logs(user_id, table_name);
