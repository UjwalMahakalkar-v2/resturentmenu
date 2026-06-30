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

export function rowToExpense(r: any) {
  return {
    id: r.id, tenantId: r.tenant_id, name: r.name, category: r.category || 'Other',
    amount: Number(r.amount) || 0, date: r.expense_date || '', vendor: r.vendor || '',
    paymentMethod: r.payment_method || '', recurring: r.recurring === 1,
    source: r.source || 'manual', referenceId: r.reference_id || '', userName: r.user_name || '',
    createdAt: r.created_at,
  };
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    await ensureInventoryTables(db);
    const url = new URL(context.request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const limit = parseInt(url.searchParams.get('limit') || '200');

    let sql = 'SELECT * FROM expenses WHERE tenant_id = ?';
    const params: any[] = [tenantId];
    if (from) { sql += ' AND expense_date >= ?'; params.push(from); }
    if (to) { sql += ' AND expense_date <= ?'; params.push(to); }
    sql += ' ORDER BY expense_date DESC, created_at DESC LIMIT ?';
    params.push(limit);

    const rows = await queryAll(db, sql, ...params);
    return new Response(JSON.stringify(rows.map(rowToExpense)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch expenses';
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
    if (!(Number(body.amount) > 0)) return new Response(JSON.stringify({ error: 'Amount must be greater than 0' }), { status: 400, headers: CORS });

    const id = `exp_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const date = body.date || now.slice(0, 10);
    await execute(
      db,
      `INSERT INTO expenses (id, tenant_id, name, category, amount, expense_date, vendor, payment_method, recurring, source, reference_id, user_name, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, tenantId, body.name || body.category || 'Expense', body.category || 'Other', Number(body.amount),
      date, body.vendor || '', body.paymentMethod || '', body.recurring ? 1 : 0, 'manual', body.referenceId || null, body.userName || 'Admin', now, now,
    );
    return new Response(JSON.stringify(rowToExpense({
      id, tenant_id: tenantId, name: body.name || body.category || 'Expense', category: body.category || 'Other',
      amount: Number(body.amount), expense_date: date, vendor: body.vendor || '', payment_method: body.paymentMethod || '',
      recurring: body.recurring ? 1 : 0, source: 'manual', created_at: now,
    })), { status: 201, headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create expense';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
