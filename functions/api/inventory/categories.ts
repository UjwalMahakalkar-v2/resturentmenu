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

function rowToCat(r: any) {
  return {
    id: r.id, tenantId: r.tenant_id, name: r.name, icon: r.icon || '📦',
    sortOrder: r.sort_order ?? 0,
    productCount: Number(r.product_count) || 0,
    stockValue: Number(r.stock_value) || 0,
    lowCount: Number(r.low_count) || 0,
  };
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    await ensureInventoryTables(db);
    // Aggregate product count / stock value / low-stock count per category in one query.
    const rows = await queryAll(
      db,
      `SELECT c.*,
         COUNT(i.id) AS product_count,
         COALESCE(SUM(i.current_stock * i.purchase_price), 0) AS stock_value,
         COALESCE(SUM(CASE WHEN i.current_stock <= i.min_stock THEN 1 ELSE 0 END), 0) AS low_count
       FROM inventory_categories c
       LEFT JOIN inventory_items i ON i.category_id = c.id AND i.tenant_id = c.tenant_id
       WHERE c.tenant_id = ?
       GROUP BY c.id
       ORDER BY c.sort_order ASC, c.name ASC`,
      tenantId,
    );
    return new Response(JSON.stringify(rows.map(rowToCat)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch categories';
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
    if (!body.name?.trim()) return new Response(JSON.stringify({ error: 'Category name is required' }), { status: 400, headers: CORS });

    const id = `invcat_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    await execute(
      db,
      'INSERT INTO inventory_categories (id, tenant_id, name, icon, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
      id, tenantId, body.name.trim(), body.icon || '📦', Number(body.sortOrder) || 0, now, now,
    );
    return new Response(JSON.stringify({ id, tenantId, name: body.name.trim(), icon: body.icon || '📦', sortOrder: Number(body.sortOrder) || 0, productCount: 0, stockValue: 0, lowCount: 0 }), { status: 201, headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create category';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
