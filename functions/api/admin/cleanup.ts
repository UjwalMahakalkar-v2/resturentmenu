import { getDB, queryAll, queryFirst } from '../../db';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS' } });
}

export async function onRequestGet(context: any) {
  try {
    const db = getDB(context.env);
    const [tenants, users] = await Promise.all([
      queryAll(db, 'SELECT id, slug, name, status FROM tenants ORDER BY created_at DESC'),
      queryAll(db, 'SELECT id, email, tenant_id, role FROM users ORDER BY created_at DESC'),
    ]);

    return new Response(JSON.stringify({
      tenants: tenants.map((t: any) => ({ id: t.id, slug: t.slug, name: t.name, status: t.status })),
      users: users.map((u: any) => ({ id: u.id, email: u.email, tenantId: u.tenant_id, role: u.role })),
    }, null, 2), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: CORS });
  }
}

export async function onRequestDelete(context: any) {
  try {
    const url = new URL(context.request.url);
    const slug = url.searchParams.get('slug');
    if (!slug) return new Response(JSON.stringify({ error: 'slug query param required' }), { status: 400, headers: CORS });

    const db = getDB(context.env);
    const tenant = await queryFirst(db, 'SELECT * FROM tenants WHERE slug = ?', slug);
    if (!tenant) return new Response(JSON.stringify({ error: `No tenant found with slug "${slug}"` }), { status: 404, headers: CORS });

    const tenantId = tenant.id;
    const [usersResult, catsResult, itemsResult, rsResult] = await Promise.all([
      db.prepare('SELECT COUNT(*) as count FROM users WHERE tenant_id = ?').bind(tenantId).first<{ count: number }>(),
      db.prepare('SELECT COUNT(*) as count FROM categories WHERE tenant_id = ?').bind(tenantId).first<{ count: number }>(),
      db.prepare('SELECT COUNT(*) as count FROM menu_items WHERE tenant_id = ?').bind(tenantId).first<{ count: number }>(),
      db.prepare('SELECT COUNT(*) as count FROM restaurant_settings WHERE tenant_id = ?').bind(tenantId).first<{ count: number }>(),
    ]);

    await db.batch([
      db.prepare('DELETE FROM menu_items WHERE tenant_id = ?').bind(tenantId),
      db.prepare('DELETE FROM categories WHERE tenant_id = ?').bind(tenantId),
      db.prepare('DELETE FROM restaurant_settings WHERE tenant_id = ?').bind(tenantId),
      db.prepare('DELETE FROM users WHERE tenant_id = ?').bind(tenantId),
      db.prepare('DELETE FROM tenants WHERE id = ?').bind(tenantId),
    ]);

    return new Response(JSON.stringify({
      deleted: {
        tenant: tenant.name,
        slug: tenant.slug,
        usersRemoved: usersResult?.count ?? 0,
        categoriesRemoved: catsResult?.count ?? 0,
        menuItemsRemoved: itemsResult?.count ?? 0,
        settingsRemoved: rsResult?.count ?? 0,
      },
    }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: CORS });
  }
}
