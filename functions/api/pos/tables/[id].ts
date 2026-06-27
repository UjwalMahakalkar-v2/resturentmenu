import { getDB, queryFirst, execute } from '../../../db';
import { getTenantIdFromRequest } from '../../../utils/jwt';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS,
      'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function onRequestPut(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const { id } = context.params;
    const db = getDB(context.env);

    const existing = await queryFirst(db, 'SELECT id FROM pos_tables WHERE id = ? AND tenant_id = ?', id, tenantId);
    if (!existing) return new Response(JSON.stringify({ error: 'Table not found' }), { status: 404, headers: CORS });

    const body = await context.request.json();
    const now = new Date().toISOString();
    await execute(
      db,
      `UPDATE pos_tables SET
         name = COALESCE(?, name),
         section_id = COALESCE(?, section_id),
         capacity = COALESCE(?, capacity),
         status = COALESCE(?, status),
         sort_order = COALESCE(?, sort_order),
         updated_at = ?
       WHERE id = ? AND tenant_id = ?`,
      body.name?.trim() ?? null,
      body.sectionId ?? null,
      body.capacity !== undefined ? body.capacity : null,
      body.status ?? null,
      body.sortOrder !== undefined ? body.sortOrder : null,
      now, id, tenantId,
    );
    const updated = await queryFirst(db, 'SELECT * FROM pos_tables WHERE id = ?', id);
    return new Response(JSON.stringify({
      id: updated.id, tenantId: updated.tenant_id, sectionId: updated.section_id,
      name: updated.name, capacity: updated.capacity, status: updated.status,
      sortOrder: updated.sort_order, updatedAt: updated.updated_at,
    }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update table';
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}

export async function onRequestDelete(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const { id } = context.params;
    const db = getDB(context.env);

    const existing = await queryFirst(db, 'SELECT id FROM pos_tables WHERE id = ? AND tenant_id = ?', id, tenantId);
    if (!existing) return new Response(JSON.stringify({ error: 'Table not found' }), { status: 404, headers: CORS });

    await execute(db, 'DELETE FROM pos_tables WHERE id = ? AND tenant_id = ?', id, tenantId);
    return new Response(JSON.stringify({ success: true }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete table';
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}
