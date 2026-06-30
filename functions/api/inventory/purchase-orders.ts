import { getDB, queryAll, queryFirst, execute } from '../../db';
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

export function rowToPO(r: any, items: any[] = []) {
  return {
    id: r.id, tenantId: r.tenant_id, supplierId: r.supplier_id || null, supplierName: r.supplier_name || '',
    poNumber: r.po_number, status: r.status, expectedDate: r.expected_date || '',
    totalAmount: Number(r.total_amount) || 0, notes: r.notes || '', receivedAt: r.received_at || '',
    itemCount: items.length, createdAt: r.created_at, updatedAt: r.updated_at,
    items: items.map(i => ({ id: i.id, inventoryItemId: i.inventory_item_id, name: i.name, quantity: Number(i.quantity) || 0, unit: i.unit, unitPrice: Number(i.unit_price) || 0 })),
  };
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    await ensureInventoryTables(db);
    const url = new URL(context.request.url);
    const status = url.searchParams.get('status');
    let sql = `SELECT p.*, s.name AS supplier_name FROM purchase_orders p LEFT JOIN suppliers s ON s.id = p.supplier_id WHERE p.tenant_id = ?`;
    const params: any[] = [tenantId];
    if (status && status !== 'all') { sql += ' AND p.status = ?'; params.push(status); }
    sql += ' ORDER BY p.created_at DESC LIMIT 200';
    const orders = await queryAll(db, sql, ...params);
    const result = await Promise.all(orders.map(async (o) => {
      const items = await queryAll(db, 'SELECT * FROM purchase_order_items WHERE po_id = ?', o.id);
      return rowToPO(o, items);
    }));
    return new Response(JSON.stringify(result), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch purchase orders';
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
    const items = Array.isArray(body.items) ? body.items.filter((i: any) => i.inventoryItemId && Number(i.quantity) > 0) : [];
    if (!items.length) return new Response(JSON.stringify({ error: 'Add at least one line item' }), { status: 400, headers: CORS });

    const id = `po_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const countRow = await queryFirst(db, 'SELECT COUNT(*) AS c FROM purchase_orders WHERE tenant_id = ?', tenantId);
    const poNumber = `PO-${String((Number(countRow?.c) || 0) + 1).padStart(4, '0')}`;
    const total = items.reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unitPrice || 0), 0);
    const status = body.status === 'ordered' ? 'ordered' : 'draft';

    await execute(
      db,
      `INSERT INTO purchase_orders (id, tenant_id, supplier_id, po_number, status, expected_date, total_amount, notes, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      id, tenantId, body.supplierId || null, poNumber, status, body.expectedDate || '', total, body.notes || '', now, now,
    );
    for (const i of items) {
      await execute(
        db,
        'INSERT INTO purchase_order_items (id, po_id, tenant_id, inventory_item_id, name, quantity, unit, unit_price, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
        `poi_${crypto.randomUUID()}`, id, tenantId, i.inventoryItemId, i.name || '', Number(i.quantity), i.unit || 'pcs', Number(i.unitPrice) || 0, now,
      );
    }
    const saved = await queryFirst(db, `SELECT p.*, s.name AS supplier_name FROM purchase_orders p LEFT JOIN suppliers s ON s.id = p.supplier_id WHERE p.id = ?`, id);
    const savedItems = await queryAll(db, 'SELECT * FROM purchase_order_items WHERE po_id = ?', id);
    return new Response(JSON.stringify(rowToPO(saved, savedItems)), { status: 201, headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create purchase order';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
