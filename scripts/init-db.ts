/**
 * Initialize the D1 database with schema + sample data.
 *
 * Usage (remote):  npx tsx scripts/init-db.ts
 * Usage (local):   npx tsx scripts/init-db.ts --local
 *
 * Runs:  npx wrangler d1 execute restaurant_menu --file=schema.sql
 *        then inserts sample categories, menu items, and a default admin user.
 */
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';

const DB = 'restaurant_menu';
const isLocal = process.argv.includes('--local');
const flag = isLocal ? '--local' : '--remote';

function run(sql: string) {
  const escaped = sql.replace(/'/g, `'\\''`);
  execSync(`npx wrangler d1 execute ${DB} ${flag} --command='${escaped}'`, {
    stdio: 'inherit',
  });
}

function runFile(file: string) {
  execSync(`npx wrangler d1 execute ${DB} ${flag} --file=${file}`, {
    stdio: 'inherit',
  });
}

// ── Sample Data ──────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant_demo';
const TENANT_SLUG = 'demo';

const sampleCategories = [
  { id: 'cat_starters',   name: 'Starters',     description: 'Light bites to begin your meal', icon: '🥗', sort_order: 1 },
  { id: 'cat_mains',      name: 'Main Course',   description: 'Hearty main dishes',             icon: '🍛', sort_order: 2 },
  { id: 'cat_breads',     name: 'Breads',        description: 'Fresh-baked breads',             icon: '🫓', sort_order: 3 },
  { id: 'cat_beverages',  name: 'Beverages',     description: 'Refreshing drinks',              icon: '🥤', sort_order: 4 },
  { id: 'cat_desserts',   name: 'Desserts',      description: 'Sweet treats',                   icon: '🍮', sort_order: 5 },
];

const sampleMenuItems = [
  { id: 'item_001', category: 'cat_starters',  name: 'Paneer Tikka',        description: 'Grilled cottage cheese with spices',        price: 220, type: 'veg',    popular: 1 },
  { id: 'item_002', category: 'cat_starters',  name: 'Chicken Kebab',       description: 'Tender chicken skewers',                     price: 280, type: 'nonveg', popular: 1 },
  { id: 'item_003', category: 'cat_starters',  name: 'Veg Spring Rolls',    description: 'Crispy fried rolls with vegetable filling',  price: 160, type: 'veg',    popular: 0 },
  { id: 'item_004', category: 'cat_mains',     name: 'Butter Chicken',      description: 'Creamy tomato-based chicken curry',          price: 320, type: 'nonveg', popular: 1 },
  { id: 'item_005', category: 'cat_mains',     name: 'Paneer Makhani',      description: 'Rich paneer in butter masala gravy',         price: 280, type: 'veg',    popular: 1 },
  { id: 'item_006', category: 'cat_mains',     name: 'Dal Makhani',         description: 'Slow-cooked black lentils',                  price: 220, type: 'veg',    popular: 0 },
  { id: 'item_007', category: 'cat_mains',     name: 'Mutton Rogan Josh',   description: 'Aromatic mutton curry from Kashmir',         price: 380, type: 'nonveg', popular: 0 },
  { id: 'item_008', category: 'cat_breads',    name: 'Butter Naan',         description: 'Soft leavened bread with butter',            price: 45,  type: 'veg',    popular: 1 },
  { id: 'item_009', category: 'cat_breads',    name: 'Garlic Roti',         description: 'Whole-wheat bread with garlic butter',       price: 40,  type: 'veg',    popular: 0 },
  { id: 'item_010', category: 'cat_beverages', name: 'Mango Lassi',         description: 'Chilled yogurt drink with fresh mango',      price: 120, type: 'veg',    popular: 1 },
  { id: 'item_011', category: 'cat_beverages', name: 'Masala Chai',         description: 'Spiced Indian tea',                         price: 60,  type: 'veg',    popular: 0 },
  { id: 'item_012', category: 'cat_desserts',  name: 'Gulab Jamun',         description: 'Soft milk-solid balls in sugar syrup',       price: 80,  type: 'veg',    popular: 1 },
  { id: 'item_013', category: 'cat_desserts',  name: 'Kheer',               description: 'Creamy rice pudding with saffron',           price: 90,  type: 'veg',    popular: 0 },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔄 Initializing D1 database (${isLocal ? 'local' : 'remote'})…\n`);

  // 1. Apply schema
  console.log('📐 Applying schema…');
  runFile('schema.sql');
  console.log('✅ Schema applied\n');

  // 2. Upsert demo tenant
  console.log('🏪 Upserting demo tenant…');
  run(
    `INSERT INTO tenants (id, slug, subdomain, name, email, status, subscription_plan)
     VALUES ('${TENANT_ID}', '${TENANT_SLUG}', '${TENANT_SLUG}', 'Demo Restaurant', 'demo@menumate.com', 'active', 'starter')
     ON CONFLICT(id) DO NOTHING;`
  );
  console.log('✅ Demo tenant ready\n');

  // 3. Categories
  console.log('📁 Inserting categories…');
  for (const c of sampleCategories) {
    run(
      `INSERT INTO categories (id, tenant_id, name, description, icon, sort_order)
       VALUES ('${c.id}', '${TENANT_ID}', '${c.name}', '${c.description}', '${c.icon}', ${c.sort_order})
       ON CONFLICT(id) DO NOTHING;`
    );
  }
  console.log(`✅ ${sampleCategories.length} categories inserted\n`);

  // 4. Menu items
  console.log('🍽️  Inserting menu items…');
  for (const item of sampleMenuItems) {
    const desc = item.description.replace(/'/g, "''");
    run(
      `INSERT INTO menu_items (id, tenant_id, category_id, name, description, price, type, available, popular)
       VALUES ('${item.id}', '${TENANT_ID}', '${item.category}', '${item.name}', '${desc}', ${item.price}, '${item.type}', 1, ${item.popular})
       ON CONFLICT(id) DO NOTHING;`
    );
  }
  console.log(`✅ ${sampleMenuItems.length} menu items inserted\n`);

  // 5. Default admin user (super_admin, no tenant)
  console.log('👤 Upserting default admin user…');
  const adminId = `user_${randomUUID()}`;
  run(
    `INSERT INTO users (id, tenant_id, email, password, name, role, active, permissions)
     VALUES ('${adminId}', NULL, 'admin@menumate.com', 'admin123', 'Super Admin', 'super_admin', 1, '["*"]')
     ON CONFLICT(email) DO NOTHING;`
  );
  console.log('✅ Admin user ready (admin@menumate.com / admin123)\n');

  console.log('🎉 Database initialization complete!');
  console.log('\n📊 Summary:');
  console.log(`   Categories : ${sampleCategories.length}`);
  console.log(`   Menu Items : ${sampleMenuItems.length}`);
  console.log(`   Admin User : admin@menumate.com`);
  console.log('\n⚠️  Change the admin password in production!');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
