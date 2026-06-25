import { getDB, queryAll, execute } from '../db';
import { getTenantIdFromRequest } from '../utils/jwt';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}

function rowToItem(r: any) {
  return { id: r.id, tenantId: r.tenant_id, category: r.category_id, name: r.name, description: r.description || '', price: r.price, type: r.type, image: r.image || '', hasImage: !!(r.image && r.image.length > 0), available: r.available === 1, popular: r.popular === 1, createdAt: r.created_at, updatedAt: r.updated_at };
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    const rows = await queryAll(db, 'SELECT * FROM menu_items WHERE tenant_id = ? ORDER BY created_at DESC', tenantId);
    return new Response(JSON.stringify(rows.map(rowToItem)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch menu items';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}

export async function onRequestPost(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const body = await context.request.json();
    const db = getDB(context.env);
    const now = new Date().toISOString();
    const id = `item_${crypto.randomUUID()}`;
    const categoryId = body.category || body.category_id || '';
    await execute(db,
      'INSERT INTO menu_items (id, tenant_id, category_id, name, description, price, type, image, available, popular, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      id, tenantId, categoryId, body.name, body.description || '', Number(body.price) || 0,
      body.type || 'veg', body.image || '', body.available !== false ? 1 : 0, body.popular ? 1 : 0, now, now
    );
    return new Response(JSON.stringify(rowToItem({ id, tenant_id: tenantId, category_id: categoryId, name: body.name, description: body.description || '', price: Number(body.price)||0, type: body.type||'veg', image: body.image||'', available: body.available!==false?1:0, popular: body.popular?1:0, created_at: now, updated_at: now })), { status: 201, headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create menu item';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
