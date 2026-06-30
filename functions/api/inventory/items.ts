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

/** Derive a stock status label from current vs minimum levels. */
export function stockStatus(current: number, min: number): 'In Stock' | 'Low' | 'Critical' {
  if (current <= 0) return 'Critical';
  if (min > 0 && current < min * 0.5) return 'Critical';
  if (min > 0 && current <= min) return 'Low';
  return 'In Stock';
}

export function rowToItem(r: any) {
  const current = Number(r.current_stock) || 0;
  const min = Number(r.min_stock) || 0;
  return {
    id: r.id,
    tenantId: r.tenant_id,
    categoryId: r.category_id || null,
    categoryName: r.category_name || '',
    name: r.name,
    sku: r.sku || '',
    emoji: r.emoji || '📦',
    unit: r.unit || 'pcs',
    currentStock: current,
    minStock: min,
    maxStock: Number(r.max_stock) || 0,
    purchasePrice: Number(r.purchase_price) || 0,
    sellingPrice: Number(r.selling_price) || 0,
    gstRate: Number(r.gst_rate) || 0,
    supplier: r.supplier || '',
    notes: r.notes || '',
    active: r.active === 1,
    status: stockStatus(current, min),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    await ensureInventoryTables(db);
    const rows = await queryAll(
      db,
      `SELECT i.*, c.name AS category_name FROM inventory_items i
       LEFT JOIN inventory_categories c ON c.id = i.category_id
       WHERE i.tenant_id = ? ORDER BY i.name ASC`,
      tenantId,
    );
    return new Response(JSON.stringify(rows.map(rowToItem)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch inventory';
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
    if (!body.name?.trim()) return new Response(JSON.stringify({ error: 'Product name is required' }), { status: 400, headers: CORS });

    const id = `inv_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const current = Number(body.currentStock) || 0;
    await execute(
      db,
      `INSERT INTO inventory_items (id, tenant_id, category_id, name, sku, emoji, unit, current_stock, min_stock, max_stock, purchase_price, selling_price, gst_rate, supplier, notes, active, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, tenantId, body.categoryId || null, body.name.trim(), body.sku || '', body.emoji || '📦',
      body.unit || 'pcs', current, Number(body.minStock) || 0, Number(body.maxStock) || 0,
      Number(body.purchasePrice) || 0, Number(body.sellingPrice) || 0, Number(body.gstRate) || 0,
      body.supplier || '', body.notes || '', body.active === false ? 0 : 1, now, now,
    );

    // Opening stock → an initial movement record so history is complete.
    if (current > 0) {
      await execute(
        db,
        `INSERT INTO stock_movements (id, tenant_id, inventory_item_id, type, previous_stock, change_qty, new_stock, unit, reason, reference_id, user_name, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        `mv_${crypto.randomUUID()}`, tenantId, id, 'purchase', 0, current, current, body.unit || 'pcs', 'Opening stock', null, body.userName || 'Admin', now,
      );
    }

    const rows = await queryAll(db, `SELECT i.*, c.name AS category_name FROM inventory_items i LEFT JOIN inventory_categories c ON c.id = i.category_id WHERE i.id = ?`, id);
    return new Response(JSON.stringify(rowToItem(rows[0])), { status: 201, headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create item';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
