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
