import { getDB, queryFirst, queryAll } from '../../db';
import { getTenantIdFromRequest } from '../../utils/jwt';
import { ensureInventoryTables } from '../../utils/inventory';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

function rangeBounds(range: string): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  if (range === 'today') from.setHours(0, 0, 0, 0);
  else if (range === 'week') { from.setDate(from.getDate() - 6); from.setHours(0, 0, 0, 0); }
  else if (range === 'year') { from.setMonth(0, 1); from.setHours(0, 0, 0, 0); }
  else { from.setDate(1); from.setHours(0, 0, 0, 0); } // month (default)
  return { from, to };
}

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }

/** Months overlapping [from,to] with the fraction of each month inside the range (for payroll proration). */
function monthFractions(from: Date, to: Date): { ym: string; fraction: number }[] {
  const res: { ym: string; fraction: number }[] = [];
  let y = from.getFullYear(), m = from.getMonth();
  while (y < to.getFullYear() || (y === to.getFullYear() && m <= to.getMonth())) {
    const mStart = new Date(y, m, 1), mEnd = new Date(y, m, daysInMonth(y, m), 23, 59, 59);
    const ovStart = from > mStart ? from : mStart;
    const ovEnd = to < mEnd ? to : mEnd;
    const days = Math.max(0, Math.round((ovEnd.getTime() - ovStart.getTime()) / 86400000) + 1);
    res.push({ ym: `${y}-${String(m + 1).padStart(2, '0')}`, fraction: Math.min(1, days / daysInMonth(y, m)) });
    m++; if (m > 11) { m = 0; y++; }
  }
  return res;
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    await ensureInventoryTables(db);
    const url = new URL(context.request.url);
    const range = url.searchParams.get('range') || 'month';
    const { from, to } = rangeBounds(range);
    const fromISO = from.toISOString();
    const fromDate = fromISO.slice(0, 10);
    const toDate = to.toISOString().slice(0, 10);

    const num = (r: any, k = 'v') => Number(r?.[k]) || 0;

    // Revenue — paid POS orders in range
    const rev = await queryFirst(db,
      "SELECT COALESCE(SUM(total_amount),0) v FROM pos_orders WHERE tenant_id = ? AND (payment_status = 'paid' OR status = 'paid') AND created_at >= ?",
      tenantId, fromISO).catch(() => null);
    const revenue = num(rev);

    // Food cost (COGS) — value of inventory consumed by sales in range
    const cogs = await queryFirst(db,
      `SELECT COALESCE(SUM(ABS(m.change_qty) * i.purchase_price),0) v
       FROM stock_movements m JOIN inventory_items i ON i.id = m.inventory_item_id
       WHERE m.tenant_id = ? AND m.type = 'sale' AND m.created_at >= ?`,
      tenantId, fromISO).catch(() => null);
    const foodCost = num(cogs);

    // Expenses — split operating vs inventory purchases (purchases are an asset, not P&L expense)
    const opEx = await queryFirst(db,
      "SELECT COALESCE(SUM(amount),0) v FROM expenses WHERE tenant_id = ? AND source != 'purchase' AND expense_date >= ? AND expense_date <= ?",
      tenantId, fromDate, toDate).catch(() => null);
    const operatingExpenses = num(opEx);
    const purEx = await queryFirst(db,
      "SELECT COALESCE(SUM(amount),0) v FROM expenses WHERE tenant_id = ? AND source = 'purchase' AND expense_date >= ? AND expense_date <= ?",
      tenantId, fromDate, toDate).catch(() => null);
    const inventoryPurchases = num(purEx);

    // Payroll — prorate each overlapping month's total by the fraction inside the range
    let payroll = 0;
    try {
      const fracs = monthFractions(from, to);
      const byMonth = await queryAll(db, 'SELECT month, COALESCE(SUM(final_amount),0) v FROM payroll WHERE tenant_id = ? GROUP BY month', tenantId);
      const map: Record<string, number> = {};
      for (const r of byMonth as any[]) map[r.month] = Number(r.v) || 0;
      for (const f of fracs) payroll += (map[f.ym] || 0) * f.fraction;
      payroll = Math.round(payroll);
    } catch { /* payroll table may not exist */ }

    const grossProfit = revenue - foodCost;
    const netProfit = grossProfit - operatingExpenses - payroll;

    return new Response(JSON.stringify({
      range, from: fromDate, to: toDate,
      revenue, foodCost, operatingExpenses, inventoryPurchases, payroll,
      grossProfit, netProfit,
      grossMargin: revenue > 0 ? Math.round(grossProfit / revenue * 1000) / 10 : 0,
      netMargin: revenue > 0 ? Math.round(netProfit / revenue * 1000) / 10 : 0,
    }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to compute finance';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
