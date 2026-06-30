import { getDB, queryFirst, execute } from '../../../db';
import { getTenantIdFromRequest } from '../../../utils/jwt';
import { ensureInventoryTables } from '../../../utils/inventory';
import { rowToSupplier } from '../suppliers';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPut(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const { id } = context.params;
    const db = getDB(context.env);
    await ensureInventoryTables(db);
    const existing = await queryFirst(db, 'SELECT * FROM suppliers WHERE id = ? AND tenant_id = ?', id, tenantId);
    if (!existing) return new Response(JSON.stringify({ error: 'Supplier not found' }), { status: 404, headers: CORS });

    const body = await context.request.json();
    const now = new Date().toISOString();
    await execute(
      db,
      `UPDATE suppliers SET name=COALESCE(?,name), contact_name=COALESCE(?,contact_name), phone=COALESCE(?,phone),
         email=COALESCE(?,email), address=COALESCE(?,address), outstanding=COALESCE(?,outstanding),
         lead_time_days=COALESCE(?,lead_time_days), notes=COALESCE(?,notes), active=COALESCE(?,active), updated_at=?
       WHERE id=? AND tenant_id=?`,
      body.name !== undefined ? body.name.trim() : null,
      body.contactName !== undefined ? body.contactName : null,
      body.phone !== undefined ? body.phone : null,
      body.email !== undefined ? body.email : null,
      body.address !== undefined ? body.address : null,
      body.outstanding !== undefined ? Number(body.outstanding) : null,
      body.leadTimeDays !== undefined ? Number(body.leadTimeDays) : null,
      body.notes !== undefined ? body.notes : null,
      body.active !== undefined ? (body.active ? 1 : 0) : null,
      now, id, tenantId,
    );
    const updated = await queryFirst(db, 'SELECT * FROM suppliers WHERE id = ?', id);
    return new Response(JSON.stringify(rowToSupplier(updated)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update supplier';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}

export async function onRequestDelete(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const { id } = context.params;
    const db = getDB(context.env);
    const existing = await queryFirst(db, 'SELECT id FROM suppliers WHERE id = ? AND tenant_id = ?', id, tenantId);
    if (!existing) return new Response(JSON.stringify({ error: 'Supplier not found' }), { status: 404, headers: CORS });
    await execute(db, 'DELETE FROM suppliers WHERE id = ? AND tenant_id = ?', id, tenantId);
    return new Response(JSON.stringify({ success: true }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete supplier';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
