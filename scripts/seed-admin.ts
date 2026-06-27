/**
 * Seed script — create or verify the super admin user in D1.
 *
 * Usage (remote):  npx tsx scripts/seed-admin.ts
 * Usage (local):   npx tsx scripts/seed-admin.ts --local
 *
 * Safe to run multiple times — uses ON CONFLICT DO NOTHING.
 */
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';

const DB = 'restaurant_menu';
const isLocal = process.argv.includes('--local');
const flag = isLocal ? '--local' : '--remote';

function query(sql: string): unknown[] {
  const escaped = sql.replace(/'/g, `'\\''`);
  const result = execSync(
    `npx wrangler d1 execute ${DB} ${flag} --command='${escaped}' --json`,
    { encoding: 'utf8' }
  );
  try {
    const parsed = JSON.parse(result);
    return parsed?.[0]?.results ?? [];
  } catch {
    return [];
  }
}

function run(sql: string) {
  const escaped = sql.replace(/'/g, `'\\''`);
  execSync(`npx wrangler d1 execute ${DB} ${flag} --command='${escaped}'`, {
    stdio: 'inherit',
  });
}

async function seed() {
  console.log(`\n🔄 Seeding admin user in D1 (${isLocal ? 'local' : 'remote'})…\n`);

  // -- Upsert super admin ----------------------------------------------------
  const adminId = `user_${randomUUID()}`;
  run(
    `INSERT INTO users (id, tenant_id, email, password, name, role, active, permissions)
     VALUES ('${adminId}', NULL, 'admin@menumate.com', 'admin123', 'Super Admin', 'super_admin', 1, '["*"]')
     ON CONFLICT(email) DO NOTHING;`
  );
  console.log('✅ Super admin upserted (admin@menumate.com / admin123)\n');

  // -- List all tenants -------------------------------------------------------
  const tenants = query(`SELECT id, name, slug, status FROM tenants ORDER BY created_at;`) as Array<{
    id: string; name: string; slug: string; status: string;
  }>;
  console.log(`Tenants in DB (${tenants.length}):`);
  for (const t of tenants) {
    console.log(`  - ${t.name} (slug: ${t.slug}, status: ${t.status})`);
  }

  // -- List all users ---------------------------------------------------------
  const users = query(`SELECT id, email, role, tenant_id, active FROM users ORDER BY created_at;`) as Array<{
    id: string; email: string; role: string; tenant_id: string | null; active: number;
  }>;
  console.log(`\nUsers in DB (${users.length}):`);
  for (const u of users) {
    console.log(`  - ${u.email} | role: ${u.role} | tenantId: ${u.tenant_id ?? 'none'} | active: ${u.active}`);
  }

  console.log('\n✅ Done.');
}

seed().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
