import { getDB, queryAll, queryFirst, execute } from '../db';
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function rowToAttendance(r: any) {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    staffId: r.staff_id,
    date: r.date,
    status: r.status,
    checkIn: r.check_in || '',
    checkOut: r.check_out || '',
    notes: r.notes || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// GET /api/attendance?date=YYYY-MM-DD  OR  ?staffId=...&from=...&to=...
export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    const url = new URL(context.request.url);
    const date = url.searchParams.get('date');
    const staffId = url.searchParams.get('staffId');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    let rows;
    if (date) {
      rows = await queryAll(
        db,
        `SELECT a.*, s.name as staff_name, s.role as staff_role
         FROM attendance a
         JOIN staff s ON s.id = a.staff_id
         WHERE a.tenant_id = ? AND a.date = ?
         ORDER BY s.name ASC`,
        tenantId, date
      );
    } else if (staffId && from && to) {
      rows = await queryAll(
        db,
        `SELECT * FROM attendance
         WHERE tenant_id = ? AND staff_id = ? AND date >= ? AND date <= ?
         ORDER BY date ASC`,
        tenantId, staffId, from, to
      );
    } else if (from && to) {
      rows = await queryAll(
        db,
        `SELECT a.*, s.name as staff_name, s.role as staff_role
         FROM attendance a
         JOIN staff s ON s.id = a.staff_id
         WHERE a.tenant_id = ? AND a.date >= ? AND a.date <= ?
         ORDER BY a.date DESC, s.name ASC`,
        tenantId, from, to
      );
    } else {
      // Default: today
      const today = new Date().toISOString().split('T')[0];
      rows = await queryAll(
        db,
        `SELECT a.*, s.name as staff_name, s.role as staff_role
         FROM attendance a
         JOIN staff s ON s.id = a.staff_id
         WHERE a.tenant_id = ? AND a.date = ?
         ORDER BY s.name ASC`,
        tenantId, today
      );
    }

    return new Response(JSON.stringify(rows.map(rowToAttendance)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch attendance';
    if (msg.includes('no such table')) {
      return new Response(JSON.stringify([]), { headers: CORS });
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}

// POST /api/attendance — mark attendance (upsert by tenant+staff+date)
export async function onRequestPost(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const body = await context.request.json();

    if (!body.staffId || !body.date || !body.status) {
      return new Response(JSON.stringify({ error: 'staffId, date and status are required' }), {
        status: 400, headers: CORS,
      });
    }

    const db = getDB(context.env);
    const now = new Date().toISOString();
    const id = `att_${crypto.randomUUID()}`;

    // Upsert: if record exists for this staff+date, update it
    await execute(
      db,
      `INSERT INTO attendance (id, tenant_id, staff_id, date, status, check_in, check_out, notes, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(tenant_id, staff_id, date) DO UPDATE SET
         status = excluded.status,
         check_in = excluded.check_in,
         check_out = excluded.check_out,
         notes = excluded.notes,
         updated_at = excluded.updated_at`,
      id, tenantId, body.staffId, body.date, body.status,
      body.checkIn || '', body.checkOut || '', body.notes || '', now, now
    );

    const saved = await queryFirst(
      db,
      'SELECT * FROM attendance WHERE tenant_id = ? AND staff_id = ? AND date = ?',
      tenantId, body.staffId, body.date
    );

    return new Response(JSON.stringify(rowToAttendance(saved)), { status: 201, headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to mark attendance';
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}

// PUT /api/attendance — same as POST (alias for edit)
export async function onRequestPut(context: any) {
  return onRequestPost(context);
}
