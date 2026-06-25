import { getDB, queryFirst, execute } from '../../db';
import { getTenantIdFromRequest } from '../../utils/jwt';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

function rowToItem(r: any) {
  return { id: r.id, tenantId: r.tenant_id, category: r.category_id, name: r.name, description: r.description || '', price: r.price, type: r.type, image: r.image || '', hasImage: !!(r.image && r.image.length > 0), available: r.available === 1, popular: r.popular === 1, sortOrder: r.sort_order ?? 0, createdAt: r.created_at, updatedAt: r.updated_at };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}

export async function onRequestGet(context: any) {
  try {
    const { id } = context.params;
    const db = getDB(context.env);
    const item = await queryFirst(db, 'SELECT * FROM menu_items WHERE id = ?', id);
    if (!item) return new Response(JSON.stringify({ error: 'Item not found' }), { status: 404, headers: CORS });
    return new Response(JSON.stringify(rowToItem(item)), { headers: CORS });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch menu item' }), { status: 500, headers: CORS });
  }
}

export async function onRequestPut(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const { id } = context.params;
    const body = await context.request.json();
    const db = getDB(context.env);

    const existing = await queryFirst(db, 'SELECT * FROM menu_items WHERE id = ?', id);
    if (!existing) return new Response(JSON.stringify({ error: 'Item not found' }), { status: 404, headers: CORS });
    if (existing.tenant_id !== tenantId) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: CORS });

    const now = new Date().toISOString();
    const categoryId = body.category !== undefined ? body.category : (body.category_id !== undefined ? body.category_id : existing.category_id);
    const name = body.name !== undefined ? body.name : existing.name;
    const description = body.description !== undefined ? body.description : existing.description;
    const price = body.price !== undefined ? Number(body.price) : existing.price;
    const type = body.type !== undefined ? body.type : existing.type;
    const image = body.image !== undefined ? body.image : existing.image;
    const available = body.available !== undefined ? (body.available ? 1 : 0) : existing.available;
    const popular = body.popular !== undefined ? (body.popular ? 1 : 0) : existing.popular;
    const sortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) : (existing.sort_order ?? 0);

    await execute(db,
      'UPDATE menu_items SET category_id = ?, name = ?, description = ?, price = ?, type = ?, image = ?, available = ?, popular = ?, sort_order = ?, updated_at = ? WHERE id = ?',
      categoryId, name, description || '', price, type || 'veg', image || '', available, popular, sortOrder, now, id
    );

    return new Response(JSON.stringify(rowToItem({ ...existing, category_id: categoryId, name, description: description || '', price, type: type || 'veg', image: image || '', available, popular, sort_order: sortOrder, updated_at: now })), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update menu item';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}

export async function onRequestDelete(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const { id } = context.params;
    const db = getDB(context.env);

    const existing = await queryFirst(db, 'SELECT tenant_id FROM menu_items WHERE id = ?', id);
    if (!existing) return new Response(JSON.stringify({ error: 'Item not found' }), { status: 404, headers: CORS });
    if (existing.tenant_id !== tenantId) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: CORS });

    await execute(db, 'DELETE FROM menu_items WHERE id = ?', id);
    return new Response(JSON.stringify({ success: true }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete menu item';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
