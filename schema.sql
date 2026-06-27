-- ============================================================
-- MenuMate D1 Schema
-- Run: npx wrangler d1 execute restaurant_menu --file=schema.sql
-- ============================================================

PRAGMA foreign_keys = ON;

-- ── Tenants ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  subdomain       TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  address         TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  subscription_plan TEXT NOT NULL DEFAULT 'starter',
  pos_enabled     INTEGER NOT NULL DEFAULT 0,
  whatsapp_clicks INTEGER NOT NULL DEFAULT 0,
  instagram_clicks INTEGER NOT NULL DEFAULT 0,
  facebook_clicks INTEGER NOT NULL DEFAULT 0,
  twitter_clicks  INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Users ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT,
  email           TEXT NOT NULL UNIQUE,
  password        TEXT NOT NULL,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'owner',
  active          INTEGER NOT NULL DEFAULT 1,
  permissions     TEXT,
  last_login_at   TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── Categories ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  icon            TEXT DEFAULT '🍽️',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── Menu Items ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  category_id     TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  price           REAL NOT NULL,
  type            TEXT NOT NULL DEFAULT 'veg',
  image           TEXT,
  available       INTEGER NOT NULL DEFAULT 1,
  popular         INTEGER NOT NULL DEFAULT 0,
  sort_order      INTEGER DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- ── Restaurant Settings ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  tenant_id       TEXT NOT NULL UNIQUE,
  name            TEXT,
  tagline         TEXT,
  logo            TEXT,
  hero_image      TEXT,
  phone           TEXT,
  email           TEXT,
  location        TEXT,
  about           TEXT,
  -- Social media links
  social_facebook TEXT,
  social_instagram TEXT,
  social_twitter  TEXT,
  social_whatsapp TEXT,
  whatsapp_message TEXT,
  enable_whatsapp INTEGER DEFAULT 1,
  enable_instagram INTEGER DEFAULT 1,
  -- Click tracking
  enable_click_tracking INTEGER DEFAULT 1,
  click_retention_days INTEGER DEFAULT 30,
  -- Theme stored as JSON string
  theme           TEXT,
  -- Template: 'classic' | 'modern-bistro' | 'premium-dark'
  template        TEXT DEFAULT 'classic',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant         ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categories_tenant    ON categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_tenant    ON menu_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category  ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_tenants_slug         ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain    ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_rs_tenant            ON restaurant_settings(tenant_id);

-- ── Staff ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  name              TEXT NOT NULL,
  photo             TEXT,
  phone             TEXT,
  email             TEXT,
  role              TEXT NOT NULL DEFAULT 'helper',
  joining_date      TEXT NOT NULL,
  salary_type       TEXT NOT NULL DEFAULT 'monthly',
  salary_amount     REAL NOT NULL DEFAULT 0,
  emergency_contact TEXT,
  active            INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── Attendance ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id         TEXT PRIMARY KEY,
  tenant_id  TEXT NOT NULL,
  staff_id   TEXT NOT NULL,
  date       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'present',
  check_in   TEXT,
  check_out  TEXT,
  notes      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, staff_id, date),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id)  REFERENCES staff(id)   ON DELETE CASCADE
);

-- ── Payroll ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  staff_id          TEXT NOT NULL,
  month             TEXT NOT NULL,
  base_salary       REAL NOT NULL DEFAULT 0,
  overtime_amount   REAL NOT NULL DEFAULT 0,
  advance_deduction REAL NOT NULL DEFAULT 0,
  absent_deduction  REAL NOT NULL DEFAULT 0,
  final_amount      REAL NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'pending',
  paid_date         TEXT,
  notes             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, staff_id, month),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id)  REFERENCES staff(id)   ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_staff_tenant        ON staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant   ON attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_staff    ON attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date     ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_payroll_tenant      ON payroll(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_staff       ON payroll(staff_id);
CREATE INDEX IF NOT EXISTS idx_payroll_month       ON payroll(month);

-- ── POS Settings ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pos_settings (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL UNIQUE,
  gst_enabled       INTEGER NOT NULL DEFAULT 0,
  gst_rate          REAL NOT NULL DEFAULT 18.0,
  cgst_rate         REAL NOT NULL DEFAULT 9.0,
  sgst_rate         REAL NOT NULL DEFAULT 9.0,
  currency          TEXT NOT NULL DEFAULT 'INR',
  currency_symbol   TEXT NOT NULL DEFAULT '₹',
  bill_prefix       TEXT NOT NULL DEFAULT 'INV',
  next_bill_number  INTEGER NOT NULL DEFAULT 1,
  enable_kot        INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── POS Sections ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pos_sections (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── POS Tables ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pos_tables (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL,
  section_id  TEXT NOT NULL,
  name        TEXT NOT NULL,
  capacity    INTEGER NOT NULL DEFAULT 4,
  status      TEXT NOT NULL DEFAULT 'available',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id)  REFERENCES tenants(id)      ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES pos_sections(id) ON DELETE CASCADE
);

-- ── POS Orders ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pos_orders (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  order_number    TEXT NOT NULL,
  order_type      TEXT NOT NULL DEFAULT 'dine-in',
  section_id      TEXT,
  table_id        TEXT,
  table_name      TEXT,
  customer_name   TEXT,
  customer_phone  TEXT,
  status          TEXT NOT NULL DEFAULT 'open',
  subtotal        REAL NOT NULL DEFAULT 0,
  discount_amount REAL NOT NULL DEFAULT 0,
  gst_amount      REAL NOT NULL DEFAULT 0,
  total_amount    REAL NOT NULL DEFAULT 0,
  payment_method  TEXT,
  payment_status  TEXT NOT NULL DEFAULT 'pending',
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── POS Order Items ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pos_order_items (
  id           TEXT PRIMARY KEY,
  order_id     TEXT NOT NULL,
  tenant_id    TEXT NOT NULL,
  menu_item_id TEXT NOT NULL,
  name         TEXT NOT NULL,
  price        REAL NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1,
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (order_id)  REFERENCES pos_orders(id)  ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)     ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pos_settings_tenant    ON pos_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_sections_tenant    ON pos_sections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_tables_tenant      ON pos_tables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_tables_section     ON pos_tables(section_id);
CREATE INDEX IF NOT EXISTS idx_pos_orders_tenant      ON pos_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_orders_status      ON pos_orders(status);
CREATE INDEX IF NOT EXISTS idx_pos_order_items_order  ON pos_order_items(order_id);

-- ── Migration note ────────────────────────────────────────────
-- For existing databases run:
--   ALTER TABLE tenants ADD COLUMN pos_enabled INTEGER NOT NULL DEFAULT 0;
