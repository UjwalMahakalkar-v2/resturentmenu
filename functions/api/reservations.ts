import { getDB, queryAll } from '../db';
import { getTenantIdFromRequest } from '../utils/jwt';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function rowToReservation(r: any) {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerEmail: r.customer_email || null,
    reservationDate: r.reservation_date,
    reservationTime: r.reservation_time,
    partySize: r.party_size,
    tableId: r.table_id || null,
    tableName: r.table_name || null,
    status: r.status,
    notes: r.notes || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    const url = new URL(context.request.url);
    const date = url.searchParams.get('date');
    const status = url.searchParams.get('status');

    let sql = `SELECT r.*, t.name AS table_name FROM reservations r
               LEFT JOIN pos_tables t ON t.id = r.table_id
               WHERE r.tenant_id = ?`;
    const params: any[] = [tenantId];
    if (date)   { sql += ' AND r.reservation_date = ?'; params.push(date); }
    if (status) { sql += ' AND r.status = ?'; params.push(status); }
    sql += ' ORDER BY r.reservation_date ASC, r.reservation_time ASC';

    const rows = await queryAll(db, sql, ...params);
    return new Response(JSON.stringify(rows.map(rowToReservation)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch reservations';
    if (msg.includes('no such table')) return new Response(JSON.stringify([]), { headers: CORS });
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}
