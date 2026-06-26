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
