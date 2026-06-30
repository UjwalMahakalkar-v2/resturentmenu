import { getDB, queryFirst, queryAll, execute } from '../../../db';
import { getTenantIdFromRequest } from '../../../utils/jwt';
import { ensureInventoryTables } from '../../../utils/inventory';
import { rowToItem } from '../items';

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

    const existing = await queryFirst(db, 'SELECT * FROM inventory_items WHERE id = ? AND tenant_id = ?', id, tenantId);
    if (!existing) return new Response(JSON.stringify({ error: 'Item not found' }), { status: 404, headers: CORS });

    const body = await context.request.json();
    const now = new Date().toISOString();

    // Editing the product DOES NOT silently change stock — stock only moves via
    // movements (adjust/waste/purchase/sale). currentStock here is ignored to keep
    // the movement ledger the single source of truth.
    await execute(
      db,
      `UPDATE inventory_items SET
         category_id = COALESCE(?, category_id),
         name = COALESCE(?, name),
         sku = COALESCE(?, sku),
         emoji = COALESCE(?, emoji),
         unit = COALESCE(?, unit),
         min_stock = COALESCE(?, min_stock),
         max_stock = COALESCE(?, max_stock),
         purchase_price = COALESCE(?, purchase_price),
         selling_price = COALESCE(?, selling_price),
         gst_rate = COALESCE(?, gst_rate),
         supplier = COALESCE(?, supplier),
         notes = COALESCE(?, notes),
         active = COALESCE(?, active),
         updated_at = ?
       WHERE id = ? AND tenant_id = ?`,
      body.categoryId !== undefined ? body.categoryId : null,
      body.name !== undefined ? body.name.trim() : null,
      body.sku !== undefined ? body.sku : null,
      body.emoji !== undefined ? body.emoji : null,
      body.unit !== undefined ? body.unit : null,
      body.minStock !== undefined ? Number(body.minStock) : null,
      body.maxStock !== undefined ? Number(body.maxStock) : null,
      body.purchasePrice !== undefined ? Number(body.purchasePrice) : null,
      body.sellingPrice !== undefined ? Number(body.sellingPrice) : null,
      body.gstRate !== undefined ? Number(body.gstRate) : null,
      body.supplier !== undefined ? body.supplier : null,
      body.notes !== undefined ? body.notes : null,
      body.active !== undefined ? (body.active ? 1 : 0) : null,
      now, id, tenantId,
    );

    const rows = await queryAll(db, `SELECT i.*, c.name AS category_name FROM inventory_items i LEFT JOIN inventory_categories c ON c.id = i.category_id WHERE i.id = ?`, id);
    return new Response(JSON.stringify(rowToItem(rows[0])), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update item';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}

export async function onRequestDelete(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const { id } = context.params;
    const db = getDB(context.env);

    const existing = await queryFirst(db, 'SELECT id FROM inventory_items WHERE id = ? AND tenant_id = ?', id, tenantId);
    if (!existing) return new Response(JSON.stringify({ error: 'Item not found' }), { status: 404, headers: CORS });

    await execute(db, 'DELETE FROM inventory_items WHERE id = ? AND tenant_id = ?', id, tenantId);
    // Recipe lines referencing this inventory item are now dangling; remove them too.
    await execute(db, 'DELETE FROM recipes WHERE inventory_item_id = ? AND tenant_id = ?', id, tenantId).catch(() => {});
    return new Response(JSON.stringify({ success: true }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete item';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
