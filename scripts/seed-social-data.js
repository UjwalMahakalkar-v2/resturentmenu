/**
 * Seed social media data for demo tenants in D1.
 *
 * Usage (remote):  node scripts/seed-social-data.js
 * Usage (local):   node scripts/seed-social-data.js --local
 *
 * Updates restaurant_settings with WhatsApp / Instagram info for
 * any tenants that already exist in the DB.
 */
import { execSync } from 'child_process';

const DB = 'restaurant_menu';
const isLocal = process.argv.includes('--local');
const flag = isLocal ? '--local' : '--remote';

function run(sql) {
  const escaped = sql.replace(/'/g, `'\\''`);
  execSync(`npx wrangler d1 execute ${DB} ${flag} --command='${escaped}'`, {
    stdio: 'inherit',
  });
}

const socialUpdates = [
  {
    slug: 'pizza-palace',
    whatsapp: '+12125551234',
    whatsappMessage: "Hi! I'd like to order from Pizza Palace. Can you help me?",
    instagram: '@pizzapalace_ny',
  },
  {
    slug: 'burger-hub',
    whatsapp: '+13105559876',
    whatsappMessage: "Hello! I'm interested in Burger Hub's menu. What are your specials today?",
    instagram: 'https://instagram.com/burgerhub_la',
  },
  {
    slug: 'sushi-spot',
    whatsapp: '+13055552468',
    whatsappMessage: "Hi Sushi Spot! I'd like to make a reservation or place an order.",
    instagram: '@sushispot',
  },
];

async function updateSocialData() {
  console.log(`\n🔄 Seeding social data in D1 (${isLocal ? 'local' : 'remote'})…\n`);

  for (const s of socialUpdates) {
    // Escape single quotes in message
    const msg = s.whatsappMessage.replace(/'/g, "''");

    run(
      `UPDATE restaurant_settings
       SET social_whatsapp    = '${s.whatsapp}',
           whatsapp_message   = '${msg}',
           social_instagram   = '${s.instagram}',
           enable_whatsapp    = 1,
           enable_instagram   = 1,
           updated_at         = datetime('now')
       WHERE tenant_id = (SELECT id FROM tenants WHERE slug = '${s.slug}');`
    );
    console.log(`✅ Updated ${s.slug}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SOCIAL MEDIA DATA SEEDED (D1)\n');
  for (const s of socialUpdates) {
    console.log(`  ${s.slug}:`);
    console.log(`    WhatsApp : ${s.whatsapp}`);
    console.log(`    Instagram: ${s.instagram}`);
  }
  console.log('\n🌐 Visit the menu pages to see floating social buttons!');
  console.log('='.repeat(60));
}

updateSocialData().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
