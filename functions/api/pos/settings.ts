import { getDB, queryFirst, execute } from '../../db';
import { getTenantIdFromRequest } from '../../utils/jwt';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS,
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function rowToSettings(r: any, posEnabled: boolean) {
  return {
    posEnabled,
    id: r.id,
    tenantId: r.tenant_id,
    gstEnabled: r.gst_enabled === 1,
    gstRate: r.gst_rate,
    cgstRate: r.cgst_rate,
    sgstRate: r.sgst_rate,
    currency: r.currency,
    currencySymbol: r.currency_symbol,
    billPrefix: r.bill_prefix,
    nextBillNumber: r.next_bill_number,
    enableKot: r.enable_kot === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);

    // Auto-migrate: create POS tables + pos_enabled column if not present
    try { await execute(db, 'ALTER TABLE tenants ADD COLUMN pos_enabled INTEGER NOT NULL DEFAULT 0'); } catch {}
    try {
      await execute(db, `CREATE TABLE IF NOT EXISTS pos_settings (
        id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL UNIQUE,
        gst_enabled INTEGER NOT NULL DEFAULT 0, gst_rate REAL NOT NULL DEFAULT 18.0,
        cgst_rate REAL NOT NULL DEFAULT 9.0, sgst_rate REAL NOT NULL DEFAULT 9.0,
        currency TEXT NOT NULL DEFAULT 'INR', currency_symbol TEXT NOT NULL DEFAULT '₹',
        bill_prefix TEXT NOT NULL DEFAULT 'INV', next_bill_number INTEGER NOT NULL DEFAULT 1,
        enable_kot INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )`);
    } catch {}
    try {
      await execute(db, `CREATE TABLE IF NOT EXISTS pos_sections (
        id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL,
        description TEXT, sort_order INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )`);
    } catch {}
    try {
      await execute(db, `CREATE TABLE IF NOT EXISTS pos_tables (
        id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, section_id TEXT NOT NULL, name TEXT NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 4, status TEXT NOT NULL DEFAULT 'available',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (section_id) REFERENCES pos_sections(id) ON DELETE CASCADE
      )`);
    } catch {}
    try {
      await execute(db, `CREATE TABLE IF NOT EXISTS pos_orders (
        id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, order_number TEXT NOT NULL,
        order_type TEXT NOT NULL DEFAULT 'dine-in', section_id TEXT, table_id TEXT, table_name TEXT,
        customer_name TEXT, customer_phone TEXT, status TEXT NOT NULL DEFAULT 'open',
        subtotal REAL NOT NULL DEFAULT 0, discount_amount REAL NOT NULL DEFAULT 0,
        gst_amount REAL NOT NULL DEFAULT 0, total_amount REAL NOT NULL DEFAULT 0,
        payment_method TEXT, payment_status TEXT NOT NULL DEFAULT 'pending', notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )`);
    } catch {}
    try {
      await execute(db, `CREATE TABLE IF NOT EXISTS pos_order_items (
        id TEXT PRIMARY KEY, order_id TEXT NOT NULL, tenant_id TEXT NOT NULL,
        menu_item_id TEXT NOT NULL, name TEXT NOT NULL, price REAL NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1, notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (order_id) REFERENCES pos_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )`);
    } catch {}
    // Also create staff/attendance/payroll if missing
    try {
      await execute(db, `CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL, photo TEXT, phone TEXT, email TEXT,
        role TEXT NOT NULL DEFAULT 'helper', joining_date TEXT NOT NULL,
        salary_type TEXT NOT NULL DEFAULT 'monthly', salary_amount REAL NOT NULL DEFAULT 0,
        emergency_contact TEXT, active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )`);
    } catch {}
    try {
      await execute(db, `CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, staff_id TEXT NOT NULL,
        date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'present',
        check_in TEXT, check_out TEXT, notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(tenant_id, staff_id, date),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
      )`);
    } catch {}
    try {
      await execute(db, `CREATE TABLE IF NOT EXISTS payroll (
        id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, staff_id TEXT NOT NULL, month TEXT NOT NULL,
        base_salary REAL NOT NULL DEFAULT 0, overtime_amount REAL NOT NULL DEFAULT 0,
        advance_deduction REAL NOT NULL DEFAULT 0, absent_deduction REAL NOT NULL DEFAULT 0,
        final_amount REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending',
        paid_date TEXT, notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(tenant_id, staff_id, month),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
      )`);
    } catch {}

    const tenant = await queryFirst(db, 'SELECT pos_enabled FROM tenants WHERE id = ?', tenantId);
    const posEnabled = tenant?.pos_enabled === 1;

    let settings = await queryFirst(db, 'SELECT * FROM pos_settings WHERE tenant_id = ?', tenantId);
    if (!settings) {
      const id = `pos_${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      await execute(db, 'INSERT INTO pos_settings (id, tenant_id, created_at, updated_at) VALUES (?, ?, ?, ?)', id, tenantId, now, now);
      settings = await queryFirst(db, 'SELECT * FROM pos_settings WHERE tenant_id = ?', tenantId);
    }

    return new Response(JSON.stringify(rowToSettings(settings, posEnabled)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch POS settings';
    if (msg.includes('no such table') || msg.includes('no such column')) {
      return new Response(JSON.stringify({
        posEnabled: false, gstEnabled: false, gstRate: 18, cgstRate: 9, sgstRate: 9,
        currency: 'INR', currencySymbol: '₹', billPrefix: 'INV', nextBillNumber: 1, enableKot: true,
      }), { headers: CORS });
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}

export async function onRequestPut(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    const body = await context.request.json();
    const now = new Date().toISOString();

    const id = `pos_${crypto.randomUUID()}`;
    await execute(
      db,
      `INSERT INTO pos_settings (id, tenant_id, gst_enabled, gst_rate, cgst_rate, sgst_rate, currency, currency_symbol, bill_prefix, enable_kot, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(tenant_id) DO UPDATE SET
         gst_enabled = excluded.gst_enabled,
         gst_rate = excluded.gst_rate,
         cgst_rate = excluded.cgst_rate,
         sgst_rate = excluded.sgst_rate,
         currency = excluded.currency,
         currency_symbol = excluded.currency_symbol,
         bill_prefix = excluded.bill_prefix,
         enable_kot = excluded.enable_kot,
         updated_at = excluded.updated_at`,
      id, tenantId,
      body.gstEnabled ? 1 : 0,
      body.gstRate ?? 18,
      body.cgstRate ?? 9,
      body.sgstRate ?? 9,
      body.currency ?? 'INR',
      body.currencySymbol ?? '₹',
      body.billPrefix ?? 'INV',
      body.enableKot !== false ? 1 : 0,
      now, now,
    );

    const tenant = await queryFirst(db, 'SELECT pos_enabled FROM tenants WHERE id = ?', tenantId);
    const settings = await queryFirst(db, 'SELECT * FROM pos_settings WHERE tenant_id = ?', tenantId);
    return new Response(JSON.stringify(rowToSettings(settings, tenant?.pos_enabled === 1)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update POS settings';
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}
