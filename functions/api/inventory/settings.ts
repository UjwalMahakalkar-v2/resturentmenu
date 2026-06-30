import { getDB, queryFirst, execute } from '../../db';
import { getTenantIdFromRequest } from '../../utils/jwt';
import { ensureInventoryTables } from '../../utils/inventory';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

async function ensureInventoryEnabledColumn(db: any) {
  await execute(db, 'ALTER TABLE tenants ADD COLUMN inventory_enabled INTEGER NOT NULL DEFAULT 0').catch(() => {});
}

function rowToSettings(r: any, inventoryEnabled: boolean) {
  return {
    inventoryEnabled,
    tenantId: r?.tenant_id,
    autoHide: r?.auto_hide === 1,
    showOutOfStockBadge: r ? r.show_out_of_stock_badge === 1 : true,
    continueSelling: r ? r.continue_selling === 1 : true,
  };
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    await ensureInventoryEnabledColumn(db);
    await ensureInventoryTables(db);

    const tenant = await queryFirst(db, 'SELECT inventory_enabled FROM tenants WHERE id = ?', tenantId);
    const inventoryEnabled = tenant?.inventory_enabled === 1;

    let row = await queryFirst(db, 'SELECT * FROM inventory_settings WHERE tenant_id = ?', tenantId);
    if (!row) {
      await execute(db, 'INSERT INTO inventory_settings (tenant_id, updated_at) VALUES (?, ?)', tenantId, new Date().toISOString());
      row = await queryFirst(db, 'SELECT * FROM inventory_settings WHERE tenant_id = ?', tenantId);
    }
    return new Response(JSON.stringify(rowToSettings(row, inventoryEnabled)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch inventory settings';
    // Graceful default so the admin UI can still gate cleanly
    if (msg.includes('no such table') || msg.includes('no such column')) {
      return new Response(JSON.stringify({ inventoryEnabled: false, autoHide: false, showOutOfStockBadge: true, continueSelling: true }), { headers: CORS });
    }
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}

export async function onRequestPut(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    await ensureInventoryTables(db);
    const body = await context.request.json();
    const now = new Date().toISOString();

    const existing = await queryFirst(db, 'SELECT tenant_id FROM inventory_settings WHERE tenant_id = ?', tenantId);
    if (!existing) {
      await execute(db, 'INSERT INTO inventory_settings (tenant_id, updated_at) VALUES (?, ?)', tenantId, now);
    }
    await execute(
      db,
      `UPDATE inventory_settings SET
         auto_hide = COALESCE(?, auto_hide),
         show_out_of_stock_badge = COALESCE(?, show_out_of_stock_badge),
         continue_selling = COALESCE(?, continue_selling),
         updated_at = ?
       WHERE tenant_id = ?`,
      body.autoHide === undefined ? null : (body.autoHide ? 1 : 0),
      body.showOutOfStockBadge === undefined ? null : (body.showOutOfStockBadge ? 1 : 0),
      body.continueSelling === undefined ? null : (body.continueSelling ? 1 : 0),
      now, tenantId,
    );

    const tenant = await queryFirst(db, 'SELECT inventory_enabled FROM tenants WHERE id = ?', tenantId);
    const row = await queryFirst(db, 'SELECT * FROM inventory_settings WHERE tenant_id = ?', tenantId);
    return new Response(JSON.stringify(rowToSettings(row, tenant?.inventory_enabled === 1)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update inventory settings';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
