import { getDB, queryFirst, execute } from '../../db';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

async function ensureTable(db: any) {
  await execute(db, `CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    reservation_date TEXT NOT NULL,
    reservation_time TEXT NOT NULL,
    party_size INTEGER NOT NULL DEFAULT 2,
    table_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  )`);
  try {
    await execute(db, 'CREATE INDEX IF NOT EXISTS idx_reservations_tenant ON reservations(tenant_id)');
    await execute(db, 'CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(tenant_id, reservation_date)');
  } catch { /* indexes may already exist */ }
}

export async function onRequestPost(context: any) {
  try {
    const db = getDB(context.env);
    const body = await context.request.json();

    if (!body.tenantId) return new Response(JSON.stringify({ error: 'tenantId is required' }), { status: 400, headers: CORS });
    if (!body.customerName?.trim()) return new Response(JSON.stringify({ error: 'Customer name is required' }), { status: 400, headers: CORS });
    if (!body.customerPhone?.trim()) return new Response(JSON.stringify({ error: 'Phone number is required' }), { status: 400, headers: CORS });
    if (!body.reservationDate) return new Response(JSON.stringify({ error: 'Date is required' }), { status: 400, headers: CORS });
    if (!body.reservationTime) return new Response(JSON.stringify({ error: 'Time is required' }), { status: 400, headers: CORS });
    if (!body.partySize || body.partySize < 1) return new Response(JSON.stringify({ error: 'Party size must be at least 1' }), { status: 400, headers: CORS });

    // Verify tenant exists
    const tenant = await queryFirst(db, "SELECT id FROM tenants WHERE id = ? AND status != 'deleted'", body.tenantId);
    if (!tenant) return new Response(JSON.stringify({ error: 'Restaurant not found' }), { status: 404, headers: CORS });

    await ensureTable(db);

    const now = new Date().toISOString();
    const id = `rsv_${crypto.randomUUID()}`;

    await execute(
      db,
      `INSERT INTO reservations (id, tenant_id, customer_name, customer_phone, customer_email, reservation_date, reservation_time, party_size, table_id, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
      id, body.tenantId, body.customerName.trim(), body.customerPhone.trim(),
      body.customerEmail?.trim() || null, body.reservationDate, body.reservationTime,
      body.partySize, null, body.notes?.trim() || null, now, now,
    );

    return new Response(JSON.stringify({
      id, status: 'pending',
      customerName: body.customerName.trim(),
      reservationDate: body.reservationDate,
      reservationTime: body.reservationTime,
      partySize: body.partySize,
    }), { status: 201, headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create reservation';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: CORS });
  }
}
