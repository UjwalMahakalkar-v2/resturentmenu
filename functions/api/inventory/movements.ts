import { getDB, queryAll, queryFirst, execute } from '../../db';
import { getTenantIdFromRequest } from '../../utils/jwt';
import { ensureInventoryTables } from '../../utils/inventory';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Manual movement types a user can record (sale is created automatically by POS).
const MANUAL_TYPES = ['purchase', 'adjustment', 'spoilage', 'waste', 'return', 'transfer', 'correction', 'production'];

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

function rowToMovement(r: any) {
  return {
    id: r.id, tenantId: r.tenant_id, inventoryItemId: r.inventory_item_id,
    itemName: r.item_name || '', emoji: r.emoji || '📦', itemUnit: r.item_unit || r.unit || '',
    type: r.type, previousStock: Number(r.previous_stock) || 0, changeQty: Number(r.change_qty) || 0,
    newStock: Number(r.new_stock) || 0, unit: r.unit || '', reason: r.reason || '',
    referenceId: r.reference_id || '', userName: r.user_name || '', createdAt: r.created_at,
  };
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    await ensureInventoryTables(db);
    const url = new URL(context.request.url);
    const type = url.searchParams.get('type');
    const itemId = url.searchParams.get('itemId');
    const limit = parseInt(url.searchParams.get('limit') || '100');

    let sql = `SELECT m.*, i.name AS item_name, i.emoji AS emoji, i.unit AS item_unit
               FROM stock_movements m LEFT JOIN inventory_items i ON i.id = m.inventory_item_id
               WHERE m.tenant_id = ?`;
    const params: any[] = [tenantId];
    if (type && type !== 'all') { sql += ' AND m.type = ?'; params.push(type); }
    if (itemId) { sql += ' AND m.inventory_item_id = ?'; params.push(itemId); }
    sql += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(limit);

    const rows = await queryAll(db, sql, ...params);
    return new Response(JSON.stringify(rows.map(rowToMovement)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch movements';
    if (msg.includes('no such table')) return new Response(JSON.stringify([]), { headers: CORS });
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}

/**
 * Record a manual stock movement (purchase / adjustment / waste / spoilage / etc.).
 * `changeQty` is signed: positive adds stock, negative removes. The new stock and a
 * movement row are written atomically-ish (D1 has no multi-statement txn here, but
 * the two writes are sequential and the movement reflects the computed new stock).
 */
export async function onRequestPost(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    await ensureInventoryTables(db);
    const body = await context.request.json();

    const type = String(body.type || 'adjustment');
    if (!MANUAL_TYPES.includes(type)) return new Response(JSON.stringify({ error: 'Invalid movement type' }), { status: 400, headers: CORS });
    if (!body.inventoryItemId) return new Response(JSON.stringify({ error: 'inventoryItemId is required' }), { status: 400, headers: CORS });

    const item = await queryFirst(db, 'SELECT id, current_stock, unit FROM inventory_items WHERE id = ? AND tenant_id = ?', body.inventoryItemId, tenantId);
    if (!item) return new Response(JSON.stringify({ error: 'Inventory item not found' }), { status: 404, headers: CORS });

    const change = Number(body.changeQty);
    if (!change || Number.isNaN(change)) return new Response(JSON.stringify({ error: 'changeQty must be a non-zero number' }), { status: 400, headers: CORS });

    const prev = Number(item.current_stock) || 0;
    const next = Math.round((prev + change) * 1000) / 1000;
    const now = new Date().toISOString();

    await execute(db, 'UPDATE inventory_items SET current_stock = ?, updated_at = ? WHERE id = ? AND tenant_id = ?', next, now, item.id, tenantId);
    const mvId = `mv_${crypto.randomUUID()}`;
    await execute(
      db,
      `INSERT INTO stock_movements (id, tenant_id, inventory_item_id, type, previous_stock, change_qty, new_stock, unit, reason, reference_id, user_name, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      mvId, tenantId, item.id, type, prev, change, next, item.unit, body.reason || '', body.referenceId || null, body.userName || 'Admin', now,
    );

    const rows = await queryAll(db, `SELECT m.*, i.name AS item_name, i.emoji AS emoji, i.unit AS item_unit FROM stock_movements m LEFT JOIN inventory_items i ON i.id = m.inventory_item_id WHERE m.id = ?`, mvId);
    return new Response(JSON.stringify(rowToMovement(rows[0])), { status: 201, headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to record movement';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
