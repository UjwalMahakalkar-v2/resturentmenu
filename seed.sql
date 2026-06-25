-- ============================================================
-- MenuMate D1 Seed Data
-- Run AFTER schema.sql:
-- npx wrangler d1 execute restaurant_menu --file=seed.sql
-- ============================================================

-- Super Admin user
INSERT OR IGNORE INTO users (id, tenant_id, email, password, name, role, active, permissions)
VALUES (
  'user_super_admin_001',
  NULL,
  'admin@menumate.com',
  'admin123',
  'Super Admin',
  'super_admin',
  1,
  '*'
);

-- ── Tenant 1: Sushi Spot ──────────────────────────────────────
INSERT OR IGNORE INTO tenants (id, slug, subdomain, name, email, phone, status, subscription_plan)
VALUES ('tenant_sushi_spot', 'sushi-spot', 'sushi-spot', 'Sushi Spot', 'hello@sushispot.com', '', 'active', 'starter');

INSERT OR IGNORE INTO users (id, tenant_id, email, password, name, role, active)
VALUES ('user_sushi_admin', 'tenant_sushi_spot', 'hello@sushispot.com', 'admin123', 'Sushi Admin', 'owner', 1);

INSERT OR IGNORE INTO categories (id, tenant_id, name, description, icon, sort_order) VALUES
  ('cat_sushi_rolls', 'tenant_sushi_spot', 'Rolls', 'Sushi rolls', '🍣', 1),
  ('cat_sushi_mains', 'tenant_sushi_spot', 'Main Course', 'Main dishes', '🍱', 2);

INSERT OR IGNORE INTO menu_items (id, tenant_id, category_id, name, description, price, type, available, popular) VALUES
  ('item_sushi_1', 'tenant_sushi_spot', 'cat_sushi_rolls', 'California Roll', 'Classic crab & avocado roll', 280, 'non-veg', 1, 1),
  ('item_sushi_2', 'tenant_sushi_spot', 'cat_sushi_rolls', 'Veggie Roll', 'Fresh vegetable roll', 220, 'veg', 1, 0),
  ('item_sushi_3', 'tenant_sushi_spot', 'cat_sushi_mains', 'Chicken Teriyaki', 'Grilled chicken with teriyaki sauce', 350, 'non-veg', 1, 1);

-- ── Tenant 2: Pizza Palace ────────────────────────────────────
INSERT OR IGNORE INTO tenants (id, slug, subdomain, name, email, phone, status, subscription_plan)
VALUES ('tenant_pizza_palace', 'pizza-palace', 'pizza-palace', 'Pizza Palace', 'admin@pizzapalace.com', '', 'active', 'starter');

INSERT OR IGNORE INTO users (id, tenant_id, email, password, name, role, active)
VALUES ('user_pizza_admin', 'tenant_pizza_palace', 'admin@pizzapalace.com', 'admin123', 'Pizza Admin', 'owner', 1);

INSERT OR IGNORE INTO categories (id, tenant_id, name, description, icon, sort_order) VALUES
  ('cat_pizza_starters', 'tenant_pizza_palace', 'Starters', 'Starters & appetizers', '🥗', 1),
  ('cat_pizza_mains', 'tenant_pizza_palace', 'Pizzas', 'Our signature pizzas', '🍕', 2);

INSERT OR IGNORE INTO menu_items (id, tenant_id, category_id, name, description, price, type, available, popular) VALUES
  ('item_pizza_1', 'tenant_pizza_palace', 'cat_pizza_starters', 'Garlic Bread', 'Crispy garlic bread', 120, 'veg', 1, 0),
  ('item_pizza_2', 'tenant_pizza_palace', 'cat_pizza_mains', 'Margherita', 'Classic tomato & mozzarella', 250, 'veg', 1, 1),
  ('item_pizza_3', 'tenant_pizza_palace', 'cat_pizza_mains', 'Pepperoni', 'Loaded with pepperoni', 320, 'non-veg', 1, 1);

-- ── Tenant 3: Burger Hub ──────────────────────────────────────
INSERT OR IGNORE INTO tenants (id, slug, subdomain, name, email, phone, status, subscription_plan)
VALUES ('tenant_burger_hub', 'burger-hub', 'burger-hub', 'Burger Hub', 'contact@burgerhub.com', '', 'active', 'starter');

INSERT OR IGNORE INTO users (id, tenant_id, email, password, name, role, active)
VALUES ('user_burger_admin', 'tenant_burger_hub', 'contact@burgerhub.com', 'admin123', 'Burger Admin', 'owner', 1);

INSERT OR IGNORE INTO categories (id, tenant_id, name, description, icon, sort_order) VALUES
  ('cat_burger_apps', 'tenant_burger_hub', 'Appetizers', 'Starters', '🍟', 1),
  ('cat_burger_mains', 'tenant_burger_hub', 'Main Course', 'Burgers & mains', '🍔', 2);

INSERT OR IGNORE INTO menu_items (id, tenant_id, category_id, name, description, price, type, available, popular) VALUES
  ('item_burger_1', 'tenant_burger_hub', 'cat_burger_apps', 'Spring Rolls', 'Crispy veg spring rolls', 120, 'veg', 1, 0),
  ('item_burger_2', 'tenant_burger_hub', 'cat_burger_apps', 'Chicken Wings', 'Spicy wings', 180, 'non-veg', 1, 0),
  ('item_burger_3', 'tenant_burger_hub', 'cat_burger_mains', 'Classic Burger', 'Beef patty with all toppings', 280, 'non-veg', 1, 1),
  ('item_burger_4', 'tenant_burger_hub', 'cat_burger_mains', 'Veg Burger', 'Garden veggie patty', 220, 'veg', 1, 0);
