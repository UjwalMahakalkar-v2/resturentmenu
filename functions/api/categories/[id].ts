import { getDB, queryFirst, execute } from '../../db';
import { getTenantIdFromRequest } from '../../utils/jwt';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

function rowToCat(r: any) {
  return { id: r.id, tenantId: r.tenant_id, name: r.name, description: r.description || '', icon: r.icon || '', order: r.sort_order, createdAt: r.created_at, updatedAt: r.updated_at };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}

export async function onRequestPut(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const { id } = context.params;
    const body = await context.request.json();
    const db = getDB(context.env);

    const existing = await queryFirst(db, 'SELECT * FROM categories WHERE id = ?', id);
    if (!existing) return new Response(JSON.stringify({ error: 'Category not found' }), { status: 404, headers: CORS });
    if (existing.tenant_id !== tenantId) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: CORS });

    const now = new Date().toISOString();
    const name = body.name !== undefined ? body.name : existing.name;
    const description = body.description !== undefined ? body.description : existing.description;
    const icon = body.icon !== undefined ? body.icon : existing.icon;
    const sortOrder = body.order !== undefined ? body.order : (body.sortOrder !== undefined ? body.sortOrder : existing.sort_order);

    await execute(db,
      'UPDATE categories SET name = ?, description = ?, icon = ?, sort_order = ?, updated_at = ? WHERE id = ?',
      name, description || '', icon || '', sortOrder, now, id
    );

    return new Response(JSON.stringify(rowToCat({ ...existing, name, description: description || '', icon: icon || '', sort_order: sortOrder, updated_at: now })), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update category';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}

export async function onRequestDelete(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const { id } = context.params;
    const db = getDB(context.env);

    const existing = await queryFirst(db, 'SELECT tenant_id FROM categories WHERE id = ?', id);
    if (!existing) return new Response(JSON.stringify({ error: 'Category not found' }), { status: 404, headers: CORS });
    if (existing.tenant_id !== tenantId) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: CORS });

    await execute(db, 'DELETE FROM categories WHERE id = ?', id);
    return new Response(JSON.stringify({ success: true }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete category';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
