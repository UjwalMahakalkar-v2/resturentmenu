/**
 * Seed script — run once to create the super admin user in MongoDB.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 *
 * This is safe to run multiple times — it checks before inserting.
 */
import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://ayushmahakalkar_db_user:ByYnmRJvL25mQGaA@cluster0.5b7rkwg.mongodb.net/restaurant_menu?retryWrites=true&w=majority';
const DB_NAME = 'restaurant_menu';

async function seed() {
  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });

  try {
    console.log('Connecting to MongoDB…');
    await client.connect();
    console.log('Connected.');

    const db = client.db(DB_NAME);
    const users = db.collection('users');
    const tenants = db.collection('tenants');

    // -- Super Admin user ---------------------------------------------------
    const existing = await users.findOne({ email: 'admin@menumate.com' });
    if (existing) {
      console.log(`Super admin already exists (id: ${existing.id})`);
    } else {
      const superAdmin = {
        id: `user_${crypto.randomUUID()}`,
        tenantId: null,
        email: 'admin@menumate.com',
        password: 'admin123',           // plaintext for now; hash with bcrypt in production
        name: 'Super Admin',
        role: 'super_admin',
        active: true,
        permissions: ['*'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await users.insertOne(superAdmin);
      console.log(`Super admin created (id: ${superAdmin.id})`);
    }

    // -- List existing tenants (for reference) --------------------------------
    const allTenants = await tenants.find({}).project({ id: 1, name: 1, slug: 1, status: 1 }).toArray();
    console.log(`\nTenants in DB (${allTenants.length}):`);
    allTenants.forEach(t => console.log(`  - ${t.name} (slug: ${t.slug}, status: ${t.status})`));

    // -- List all users --------------------------------------------------------
    const allUsers = await users.find({}).project({ id: 1, email: 1, role: 1, tenantId: 1, active: 1 }).toArray();
    console.log(`\nUsers in DB (${allUsers.length}):`);
    allUsers.forEach(u => console.log(`  - ${u.email} | role: ${u.role} | tenantId: ${u.tenantId ?? 'none'} | active: ${u.active}`));

    console.log('\nDone.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
