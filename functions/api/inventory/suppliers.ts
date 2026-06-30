import { getDB, queryAll, execute } from '../../db';
import { getTenantIdFromRequest } from '../../utils/jwt';
import { ensureInventoryTables } from '../../utils/inventory';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export function rowToSupplier(r: any) {
  return {
    id: r.id, tenantId: r.tenant_id, name: r.name, contactName: r.contact_name || '',
    phone: r.phone || '', email: r.email || '', address: r.address || '',
    outstanding: Number(r.outstanding) || 0, leadTimeDays: Number(r.lead_time_days) || 0,
    notes: r.notes || '', active: r.active === 1,
    poCount: Number(r.po_count) || 0, totalBuys: Number(r.total_buys) || 0, lastBuy: r.last_buy || '',
  };
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    await ensureInventoryTables(db);
    // join PO aggregates so supplier cards can show pending dues / total buys / last buy
    const rows = await queryAll(
      db,
      `SELECT s.*,
         COUNT(p.id) AS po_count,
         COALESCE(SUM(CASE WHEN p.status='received' THEN p.total_amount ELSE 0 END),0) AS total_buys,
         MAX(CASE WHEN p.status='received' THEN p.received_at ELSE NULL END) AS last_buy
       FROM suppliers s
       LEFT JOIN purchase_orders p ON p.supplier_id = s.id AND p.tenant_id = s.tenant_id
       WHERE s.tenant_id = ?
       GROUP BY s.id
       ORDER BY s.name ASC`,
      tenantId,
    );
    return new Response(JSON.stringify(rows.map(rowToSupplier)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch suppliers';
    if (msg.includes('no such table')) return new Response(JSON.stringify([]), { headers: CORS });
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}

export async function onRequestPost(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    await ensureInventoryTables(db);
    const body = await context.request.json();
    if (!body.name?.trim()) return new Response(JSON.stringify({ error: 'Supplier name is required' }), { status: 400, headers: CORS });

    const id = `sup_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    await execute(
      db,
      `INSERT INTO suppliers (id, tenant_id, name, contact_name, phone, email, address, outstanding, lead_time_days, notes, active, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, tenantId, body.name.trim(), body.contactName || '', body.phone || '', body.email || '', body.address || '',
      Number(body.outstanding) || 0, Number(body.leadTimeDays) || 0, body.notes || '', body.active === false ? 0 : 1, now, now,
    );
    return new Response(JSON.stringify(rowToSupplier({
      id, tenant_id: tenantId, name: body.name.trim(), contact_name: body.contactName || '', phone: body.phone || '',
      email: body.email || '', address: body.address || '', outstanding: Number(body.outstanding) || 0,
      lead_time_days: Number(body.leadTimeDays) || 0, notes: body.notes || '', active: 1,
    })), { status: 201, headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create supplier';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
