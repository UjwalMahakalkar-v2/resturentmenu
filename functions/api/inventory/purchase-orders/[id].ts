import { getDB, queryFirst, queryAll, execute } from '../../../db';
import { getTenantIdFromRequest } from '../../../utils/jwt';
import { ensureInventoryTables } from '../../../utils/inventory';
import { convertUnit } from '../../../utils/units';
import { rowToPO } from '../purchase-orders';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

async function loadPO(db: any, id: string) {
  const po = await queryFirst(db, `SELECT p.*, s.name AS supplier_name FROM purchase_orders p LEFT JOIN suppliers s ON s.id = p.supplier_id WHERE p.id = ?`, id);
  const items = po ? await queryAll(db, 'SELECT * FROM purchase_order_items WHERE po_id = ?', id) : [];
  return po ? rowToPO(po, items) : null;
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const { id } = context.params;
    const db = getDB(context.env);
    await ensureInventoryTables(db);
    const po = await queryFirst(db, 'SELECT id FROM purchase_orders WHERE id = ? AND tenant_id = ?', id, tenantId);
    if (!po) return new Response(JSON.stringify({ error: 'Purchase order not found' }), { status: 404, headers: CORS });
    return new Response(JSON.stringify(await loadPO(db, id)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch order';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}

/**
 * PUT updates status. Receiving (status='received') stocks in every line item:
 * increments inventory stock (unit-converted), writes a 'purchase' stock movement,
 * refreshes the item's last purchase price, and adds the PO total to the supplier's
 * outstanding balance. Idempotent — a PO already 'received' is not stocked in twice.
 */
export async function onRequestPut(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const { id } = context.params;
    const db = getDB(context.env);
    await ensureInventoryTables(db);
    const po = await queryFirst(db, 'SELECT * FROM purchase_orders WHERE id = ? AND tenant_id = ?', id, tenantId);
    if (!po) return new Response(JSON.stringify({ error: 'Purchase order not found' }), { status: 404, headers: CORS });

    const body = await context.request.json();
    const now = new Date().toISOString();
    const newStatus = body.status || po.status;

    const receiving = newStatus === 'received' && po.status !== 'received';
    await execute(
      db,
      `UPDATE purchase_orders SET status=?, expected_date=COALESCE(?,expected_date), notes=COALESCE(?,notes), received_at=?, updated_at=? WHERE id=? AND tenant_id=?`,
      newStatus, body.expectedDate ?? null, body.notes ?? null, receiving ? now : po.received_at, now, id, tenantId,
    );

    if (receiving) {
      const items = await queryAll(db, 'SELECT * FROM purchase_order_items WHERE po_id = ?', id);
      for (const it of items as any[]) {
        const inv = await queryFirst(db, 'SELECT id, current_stock, unit FROM inventory_items WHERE id = ? AND tenant_id = ?', it.inventory_item_id, tenantId);
        if (!inv) continue;
        const add = convertUnit(Number(it.quantity) || 0, it.unit, inv.unit);
        if (!add) continue;
        const prev = Number(inv.current_stock) || 0;
        const next = Math.round((prev + add) * 1000) / 1000;
        await execute(db, 'UPDATE inventory_items SET current_stock = ?, updated_at = ? WHERE id = ? AND tenant_id = ?', next, now, inv.id, tenantId);
        // Refresh last purchase price only when PO unit matches the stock unit (avoids unit-mismatch price errors).
        if ((it.unit || '').toLowerCase() === (inv.unit || '').toLowerCase() && Number(it.unit_price) > 0) {
          await execute(db, 'UPDATE inventory_items SET purchase_price = ? WHERE id = ? AND tenant_id = ?', Number(it.unit_price), inv.id, tenantId);
        }
        await execute(
          db,
          `INSERT INTO stock_movements (id, tenant_id, inventory_item_id, type, previous_stock, change_qty, new_stock, unit, reason, reference_id, user_name, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          `mv_${crypto.randomUUID()}`, tenantId, inv.id, 'purchase', prev, add, next, inv.unit, 'PO received', po.po_number, body.userName || 'Admin', now,
        );
      }
      // The PO amount is now payable to the supplier.
      if (po.supplier_id) {
        await execute(db, 'UPDATE suppliers SET outstanding = outstanding + ?, updated_at = ? WHERE id = ? AND tenant_id = ?', Number(po.total_amount) || 0, now, po.supplier_id, tenantId).catch(() => {});
      }
      // Record the purchase as an expense (source='purchase' so P&L can separate it
      // from operating expenses and not double-count against COGS). Best-effort.
      if (Number(po.total_amount) > 0) {
        const sup = po.supplier_id ? await queryFirst(db, 'SELECT name FROM suppliers WHERE id = ?', po.supplier_id).catch(() => null) : null;
        await execute(
          db,
          `INSERT INTO expenses (id, tenant_id, name, category, amount, expense_date, vendor, payment_method, recurring, source, reference_id, user_name, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          `exp_${crypto.randomUUID()}`, tenantId, `Stock purchase ${po.po_number}`, 'Inventory Purchase',
          Number(po.total_amount), now.slice(0, 10), sup?.name || '', '', 0, 'purchase', po.po_number, body.userName || 'Admin', now, now,
        ).catch(() => {});
      }
    }

    return new Response(JSON.stringify(await loadPO(db, id)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update order';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}

export async function onRequestDelete(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const { id } = context.params;
    const db = getDB(context.env);
    const po = await queryFirst(db, 'SELECT id FROM purchase_orders WHERE id = ? AND tenant_id = ?', id, tenantId);
    if (!po) return new Response(JSON.stringify({ error: 'Purchase order not found' }), { status: 404, headers: CORS });
    await execute(db, 'DELETE FROM purchase_order_items WHERE po_id = ?', id);
    await execute(db, 'DELETE FROM purchase_orders WHERE id = ? AND tenant_id = ?', id, tenantId);
    return new Response(JSON.stringify({ success: true }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete order';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
