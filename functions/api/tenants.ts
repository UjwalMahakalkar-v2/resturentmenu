import { getDB, queryAll, queryFirst, execute } from '../db';
import { getUserFromRequest } from '../utils/jwt';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE  = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PHONE_RE = /^[+\d\s\-().]{7,20}$/;
// Subdomain: either a slug (no dots) or a full domain like pizza.menumate.in
const SUBDOMAIN_RE = /^[a-z0-9]+(?:[-\.][a-z0-9]+)*$/;

function validateBody(body: any): string | null {
  if (!body || typeof body !== 'object') return 'Request body is required';
  const { name, slug, email, phone, subdomain, adminEmail, adminPassword } = body;
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) return 'name must be 2-100 characters';
  if (!slug || typeof slug !== 'string' || !SLUG_RE.test(slug) || slug.length > 63) return 'slug must be lowercase alphanumeric with hyphens, max 63 chars';
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) return 'A valid email address is required';
  if (phone && (typeof phone !== 'string' || !PHONE_RE.test(phone))) return 'phone must be a valid phone number';
  if (subdomain !== undefined && subdomain !== '') {
    if (typeof subdomain !== 'string' || !SUBDOMAIN_RE.test(subdomain) || subdomain.length > 100) return 'subdomain must be a valid domain name';
  }
  if (adminEmail && (typeof adminEmail !== 'string' || !EMAIL_RE.test(adminEmail))) return 'adminEmail must be valid';
  if (adminPassword !== undefined && (typeof adminPassword !== 'string' || adminPassword.length < 6 || adminPassword.length > 128)) return 'adminPassword must be 6-128 characters';
  return null;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } });
}

export async function onRequestGet(context: any) {
  try {
    const caller = getUserFromRequest(context.request);
    if (caller.role !== 'super_admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: CORS });

    const db = getDB(context.env);
    // Auto-migrate: add pos_enabled column if this is a pre-migration DB
    try {
      await execute(db, 'ALTER TABLE tenants ADD COLUMN pos_enabled INTEGER NOT NULL DEFAULT 0');
    } catch {
      // Column already exists — ignore
    }
    const tenants = await queryAll(db, 'SELECT * FROM tenants ORDER BY created_at DESC');

    const mapped = tenants.map((t: any) => ({
      id: t.id, slug: t.slug, subdomain: t.subdomain, name: t.name,
      email: t.email, phone: t.phone, address: t.address, status: t.status,
      subscriptionPlan: t.subscription_plan, posEnabled: (t.pos_enabled ?? 0) === 1,
      createdAt: t.created_at, updatedAt: t.updated_at,
      socialAnalytics: {
        whatsappClicks: t.whatsapp_clicks, instagramClicks: t.instagram_clicks,
        facebookClicks: t.facebook_clicks, twitterClicks: t.twitter_clicks,
      },
    }));

    return new Response(JSON.stringify(mapped), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch tenants';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}

export async function onRequestPost(context: any) {
  try {
    const caller = getUserFromRequest(context.request);
    if (caller.role !== 'super_admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: CORS });

    let body: any;
    try { body = await context.request.json(); } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: CORS });
    }

    const validationError = validateBody(body);
    if (validationError) return new Response(JSON.stringify({ error: validationError }), { status: 400, headers: CORS });

    const name      = body.name.trim();
    const slug      = body.slug.toLowerCase().trim();
    const subdomain = body.subdomain ? body.subdomain.toLowerCase().trim() : slug;
    const email     = body.email.toLowerCase().trim();
    const phone     = body.phone ? body.phone.trim() : '';
    const address   = typeof body.address === 'string' ? body.address.trim().slice(0, 500) : '';
    const plan      = ['starter', 'business', 'premium'].includes(body.subscriptionPlan) ? body.subscriptionPlan : 'starter';

    const db = getDB(context.env);

    // Check slug uniqueness
    const existingSlug = await queryFirst(db, 'SELECT id FROM tenants WHERE slug = ?', slug);
    if (existingSlug) return new Response(JSON.stringify({ error: 'Slug already exists' }), { status: 400, headers: CORS });

    // Check subdomain uniqueness (only if different from slug)
    if (subdomain !== slug) {
      const existingSub = await queryFirst(db, 'SELECT id FROM tenants WHERE subdomain = ?', subdomain);
      if (existingSub) return new Response(JSON.stringify({ error: 'Subdomain already exists' }), { status: 400, headers: CORS });
    }

    // Check admin email uniqueness
    if (body.adminEmail) {
      const adminEmail = body.adminEmail.toLowerCase().trim();
      const existingUser = await queryFirst(db, 'SELECT id FROM users WHERE email = ?', adminEmail);
      if (existingUser) return new Response(JSON.stringify({ error: 'Admin email already in use' }), { status: 400, headers: CORS });
    }

    const tenantId = `tenant_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    await execute(db,
      'INSERT INTO tenants (id, slug, subdomain, name, email, phone, address, status, subscription_plan, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      tenantId, slug, subdomain, name, email, phone, address, 'active', plan, now, now
    );

    // Create admin user
    if (body.adminEmail && body.adminPassword) {
      const adminEmail = body.adminEmail.toLowerCase().trim();
      const adminName = typeof body.adminName === 'string' ? body.adminName.trim().slice(0, 100) : 'Admin';
      await execute(db,
        'INSERT INTO users (id, tenant_id, email, password, name, role, active, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
        `user_${crypto.randomUUID()}`, tenantId, adminEmail, body.adminPassword, adminName, 'owner', 1, now, now
      );
    }

    // Default categories
    const appetizersId = `cat_${crypto.randomUUID()}`;
    const mainCourseId = `cat_${crypto.randomUUID()}`;
    await db.batch([
      db.prepare('INSERT INTO categories (id, tenant_id, name, description, icon, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)')
        .bind(appetizersId, tenantId, 'Appetizers', 'Starters and appetizers', '🥗', 1, now, now),
      db.prepare('INSERT INTO categories (id, tenant_id, name, description, icon, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)')
        .bind(mainCourseId, tenantId, 'Main Course', 'Main dishes', '🍛', 2, now, now),
    ]);

    // Default menu items
    await db.batch([
      db.prepare('INSERT INTO menu_items (id, tenant_id, category_id, name, description, price, type, image, available, popular, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(`item_${crypto.randomUUID()}`, tenantId, appetizersId, 'Spring Rolls', 'Crispy vegetable spring rolls', 120, 'veg', '', 1, 0, now, now),
      db.prepare('INSERT INTO menu_items (id, tenant_id, category_id, name, description, price, type, image, available, popular, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(`item_${crypto.randomUUID()}`, tenantId, appetizersId, 'Chicken Wings', 'Spicy chicken wings', 180, 'non-veg', '', 1, 0, now, now),
      db.prepare('INSERT INTO menu_items (id, tenant_id, category_id, name, description, price, type, image, available, popular, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(`item_${crypto.randomUUID()}`, tenantId, mainCourseId, 'Paneer Butter Masala', 'Rich and creamy paneer curry', 250, 'veg', '', 1, 1, now, now),
      db.prepare('INSERT INTO menu_items (id, tenant_id, category_id, name, description, price, type, image, available, popular, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(`item_${crypto.randomUUID()}`, tenantId, mainCourseId, 'Chicken Biryani', 'Aromatic basmati rice with chicken', 280, 'non-veg', '', 1, 1, now, now),
    ]);

    // Create default restaurant_settings row so admin panel works immediately
    await execute(db,
      'INSERT INTO restaurant_settings (tenant_id, name, tagline, created_at, updated_at) VALUES (?,?,?,?,?)',
      tenantId, name, 'Delicious food, served with love', now, now
    );

    return new Response(JSON.stringify({
      id: tenantId, slug, subdomain, name, email, phone, address,
      status: 'active', subscriptionPlan: plan, createdAt: now, updatedAt: now,
    }), { status: 201, headers: CORS });
  } catch (error) {
    console.error('Error creating tenant:', error);
    const msg = error instanceof Error ? error.message : 'Failed to create tenant';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: CORS });
  }
}
