import { getDB, queryAll, execute } from '../../db';
import { getTenantIdFromRequest } from '../../utils/jwt';
import { ensureInventoryTables } from '../../utils/inventory';
import { convertUnit } from '../../utils/units';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

// GET /api/inventory/recipes?menuItemId=...  → BOM lines + computed food cost
export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    await ensureInventoryTables(db);
    const url = new URL(context.request.url);
    const menuItemId = url.searchParams.get('menuItemId');
    if (!menuItemId) return new Response(JSON.stringify({ error: 'menuItemId is required' }), { status: 400, headers: CORS });

    const rows = await queryAll(
      db,
      `SELECT r.*, i.name AS item_name, i.emoji AS emoji, i.unit AS item_unit, i.purchase_price AS purchase_price
       FROM recipes r LEFT JOIN inventory_items i ON i.id = r.inventory_item_id
       WHERE r.tenant_id = ? AND r.menu_item_id = ?`,
      tenantId, menuItemId,
    );
    let foodCost = 0;
    const lines = (rows as any[]).map(r => {
      const qty = Number(r.quantity) || 0;
      const inBase = convertUnit(qty, r.unit, r.item_unit || r.unit);
      const cost = inBase * (Number(r.purchase_price) || 0);
      foodCost += cost;
      return {
        id: r.id, inventoryItemId: r.inventory_item_id, itemName: r.item_name || '(deleted)',
        emoji: r.emoji || '📦', quantity: qty, unit: r.unit, itemUnit: r.item_unit || r.unit,
        lineCost: Math.round(cost * 100) / 100,
      };
    });
    return new Response(JSON.stringify({ menuItemId, lines, foodCost: Math.round(foodCost * 100) / 100 }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch recipe';
    if (msg.includes('no such table')) return new Response(JSON.stringify({ menuItemId: '', lines: [], foodCost: 0 }), { headers: CORS });
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}

// PUT /api/inventory/recipes  { menuItemId, lines:[{inventoryItemId, quantity, unit}] }
// Replaces the full BOM for a menu item (simplest correct semantics).
export async function onRequestPut(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    await ensureInventoryTables(db);
    const body = await context.request.json();
    if (!body.menuItemId) return new Response(JSON.stringify({ error: 'menuItemId is required' }), { status: 400, headers: CORS });
    const lines = Array.isArray(body.lines) ? body.lines : [];

    await execute(db, 'DELETE FROM recipes WHERE tenant_id = ? AND menu_item_id = ?', tenantId, body.menuItemId);
    const now = new Date().toISOString();
    for (const l of lines) {
      if (!l.inventoryItemId || !(Number(l.quantity) > 0)) continue;
      await execute(
        db,
        'INSERT INTO recipes (id, tenant_id, menu_item_id, inventory_item_id, quantity, unit, created_at) VALUES (?,?,?,?,?,?,?)',
        `rcp_${crypto.randomUUID()}`, tenantId, body.menuItemId, l.inventoryItemId, Number(l.quantity), l.unit || 'pcs', now,
      );
    }
    return new Response(JSON.stringify({ success: true, count: lines.length }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to save recipe';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
