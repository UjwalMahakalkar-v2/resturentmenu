import { getDB, queryFirst, execute } from '../../db';
import { getTenantIdFromRequest } from '../../utils/jwt';

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

/** The response SELECT joins pos_tables; ensure it exists so non-POS tenants don't 500. */
async function ensurePosTablesTable(db: any) {
  try {
    await execute(db, `CREATE TABLE IF NOT EXISTS pos_tables (
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, section_id TEXT,
      name TEXT NOT NULL, capacity INTEGER NOT NULL DEFAULT 4,
      status TEXT NOT NULL DEFAULT 'available', sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
  } catch { /* already exists */ }
}

export async function onRequestPut(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const { id } = context.params;
    const db = getDB(context.env);
    await ensurePosTablesTable(db);

    const existing = await queryFirst(db, 'SELECT * FROM reservations WHERE id = ? AND tenant_id = ?', id, tenantId);
    if (!existing) return new Response(JSON.stringify({ error: 'Reservation not found' }), { status: 404, headers: CORS });

    const body = await context.request.json();
    const now = new Date().toISOString();

    await execute(
      db,
      `UPDATE reservations SET
         status   = COALESCE(?, status),
         table_id = COALESCE(?, table_id),
         notes    = COALESCE(?, notes),
         updated_at = ?
       WHERE id = ? AND tenant_id = ?`,
      body.status ?? null,
      body.tableId ?? null,
      body.notes ?? null,
      now, id, tenantId,
    );

    const updated = await queryFirst(
      db,
      `SELECT r.*, t.name AS table_name FROM reservations r
       LEFT JOIN pos_tables t ON t.id = r.table_id
       WHERE r.id = ?`,
      id,
    );

    return new Response(JSON.stringify({
      id: updated.id,
      tenantId: updated.tenant_id,
      customerName: updated.customer_name,
      customerPhone: updated.customer_phone,
      customerEmail: updated.customer_email || null,
      reservationDate: updated.reservation_date,
      reservationTime: updated.reservation_time,
      partySize: updated.party_size,
      tableId: updated.table_id || null,
      tableName: updated.table_name || null,
      status: updated.status,
      notes: updated.notes || '',
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update reservation';
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

    const existing = await queryFirst(db, 'SELECT id FROM reservations WHERE id = ? AND tenant_id = ?', id, tenantId);
    if (!existing) return new Response(JSON.stringify({ error: 'Reservation not found' }), { status: 404, headers: CORS });

    await execute(db, 'DELETE FROM reservations WHERE id = ? AND tenant_id = ?', id, tenantId);
    return new Response(JSON.stringify({ success: true }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete reservation';
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}
