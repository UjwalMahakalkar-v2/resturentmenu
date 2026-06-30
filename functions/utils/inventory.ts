import { execute, queryAll, queryFirst } from '../db';
import { convertUnit } from './units';

/**
 * Self-heal the inventory tables. Safe to call repeatedly (CREATE TABLE IF NOT EXISTS).
 * Mirrors the pattern used by the POS settings endpoint.
 */
export async function ensureInventoryTables(db: any) {
  await execute(db, `CREATE TABLE IF NOT EXISTS inventory_categories (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL,
    icon TEXT DEFAULT '📦', sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`).catch(() => {});
  await execute(db, `CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, category_id TEXT,
    name TEXT NOT NULL, sku TEXT, emoji TEXT,
    unit TEXT NOT NULL DEFAULT 'pcs',
    current_stock REAL NOT NULL DEFAULT 0, min_stock REAL NOT NULL DEFAULT 0, max_stock REAL NOT NULL DEFAULT 0,
    purchase_price REAL NOT NULL DEFAULT 0, selling_price REAL NOT NULL DEFAULT 0,
    gst_rate REAL NOT NULL DEFAULT 0, supplier TEXT, notes TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`).catch(() => {});
  // BOM: each row links a menu item to one inventory item with a quantity in some unit.
  await execute(db, `CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, menu_item_id TEXT NOT NULL,
    inventory_item_id TEXT NOT NULL, quantity REAL NOT NULL DEFAULT 0, unit TEXT NOT NULL DEFAULT 'pcs',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`).catch(() => {});
  await execute(db, `CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, inventory_item_id TEXT NOT NULL,
    type TEXT NOT NULL, previous_stock REAL NOT NULL DEFAULT 0, change_qty REAL NOT NULL DEFAULT 0,
    new_stock REAL NOT NULL DEFAULT 0, unit TEXT, reason TEXT, reference_id TEXT, user_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`).catch(() => {});
  await execute(db, `CREATE TABLE IF NOT EXISTS inventory_settings (
    tenant_id TEXT PRIMARY KEY,
    auto_hide INTEGER NOT NULL DEFAULT 0,
    show_out_of_stock_badge INTEGER NOT NULL DEFAULT 1,
    continue_selling INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`).catch(() => {});
  // Idempotency flag on orders so a re-saved/re-paid order never deducts twice.
  await execute(db, 'ALTER TABLE pos_orders ADD COLUMN inventory_deducted INTEGER NOT NULL DEFAULT 0').catch(() => {});
}

/**
 * Deduct inventory for a completed (paid) POS order, once. Best-effort and fully
 * isolated: any failure is swallowed so it can NEVER break POS billing.
 *
 * Flow: order items → each item's recipe (BOM) → convert recipe qty to the inventory
 * item's stock unit → decrement stock → write a 'sale' stock movement. Sets
 * pos_orders.inventory_deducted = 1 so repeat calls are no-ops.
 */
export async function deductForOrder(db: any, env: any, tenantId: string, orderId: string, userName = 'POS') {
  try {
    // Only run when the tenant has the inventory module enabled.
    const tenant = await queryFirst(db, 'SELECT inventory_enabled FROM tenants WHERE id = ?', tenantId).catch(() => null);
    if (!tenant || tenant.inventory_enabled !== 1) return;

    const order = await queryFirst(db, 'SELECT id, order_number, inventory_deducted FROM pos_orders WHERE id = ? AND tenant_id = ?', orderId, tenantId);
    if (!order || order.inventory_deducted === 1) return;

    const items = await queryAll(db, 'SELECT menu_item_id, quantity FROM pos_order_items WHERE order_id = ?', orderId);
    if (!items.length) { await markDeducted(db, orderId); return; }

    const now = new Date().toISOString();
    for (const it of items) {
      const lines = await queryAll(
        db,
        'SELECT inventory_item_id, quantity, unit FROM recipes WHERE tenant_id = ? AND menu_item_id = ?',
        tenantId, it.menu_item_id,
      ).catch(() => []);
      for (const line of lines as any[]) {
        const inv = await queryFirst(db, 'SELECT id, current_stock, unit FROM inventory_items WHERE id = ? AND tenant_id = ?', line.inventory_item_id, tenantId);
        if (!inv) continue;
        const perUnit = convertUnit(Number(line.quantity) || 0, line.unit, inv.unit);
        const change = perUnit * (Number(it.quantity) || 0);
        if (!change) continue;
        const prev = Number(inv.current_stock) || 0;
        const next = Math.round((prev - change) * 1000) / 1000;
        await execute(db, 'UPDATE inventory_items SET current_stock = ?, updated_at = ? WHERE id = ? AND tenant_id = ?', next, now, inv.id, tenantId);
        await execute(
          db,
          `INSERT INTO stock_movements (id, tenant_id, inventory_item_id, type, previous_stock, change_qty, new_stock, unit, reason, reference_id, user_name, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          `mv_${crypto.randomUUID()}`, tenantId, inv.id, 'sale', prev, -change, next, inv.unit, 'POS Sale', order.order_number || orderId, userName, now,
        );
      }
    }
    await markDeducted(db, orderId);
  } catch {
    // Never let inventory issues break order completion.
  }
}

async function markDeducted(db: any, orderId: string) {
  await execute(db, 'UPDATE pos_orders SET inventory_deducted = 1 WHERE id = ?', orderId).catch(() => {});
}
