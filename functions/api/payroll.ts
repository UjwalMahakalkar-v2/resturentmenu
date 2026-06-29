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

/**
 * Self-heal: payroll generation reads `attendance` (absent days) and writes `payroll`.
 * These tables were previously only created in the POS settings endpoint, so tenants
 * who reached Management without opening POS hit "no such table". Create them here too.
 * The UNIQUE(tenant_id, staff_id, month) is required for the POST's ON CONFLICT upsert.
 */
async function ensureTables(db: any) {
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
  } catch { /* already exists */ }
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
  } catch { /* already exists */ }
}

function rowToPayroll(r: any) {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    staffId: r.staff_id,
    staffName: r.staff_name || '',
    staffRole: r.staff_role || '',
    month: r.month,
    baseSalary: r.base_salary,
    overtimeAmount: r.overtime_amount,
    advanceDeduction: r.advance_deduction,
    absentDeduction: r.absent_deduction,
    finalAmount: r.final_amount,
    status: r.status,
    paidDate: r.paid_date || '',
    notes: r.notes || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// GET /api/payroll?month=YYYY-MM  OR  ?staffId=...
export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    await ensureTables(db);
    const url = new URL(context.request.url);
    const month = url.searchParams.get('month');
    const staffId = url.searchParams.get('staffId');

    let rows;
    if (month) {
      rows = await queryAll(
        db,
        `SELECT p.*, s.name as staff_name, s.role as staff_role
         FROM payroll p
         JOIN staff s ON s.id = p.staff_id
         WHERE p.tenant_id = ? AND p.month = ?
         ORDER BY s.name ASC`,
        tenantId, month
      );
    } else if (staffId) {
      rows = await queryAll(
        db,
        `SELECT p.*, s.name as staff_name, s.role as staff_role
         FROM payroll p
         JOIN staff s ON s.id = p.staff_id
         WHERE p.tenant_id = ? AND p.staff_id = ?
         ORDER BY p.month DESC`,
        tenantId, staffId
      );
    } else {
      // Latest 3 months
      rows = await queryAll(
        db,
        `SELECT p.*, s.name as staff_name, s.role as staff_role
         FROM payroll p
         JOIN staff s ON s.id = p.staff_id
         WHERE p.tenant_id = ?
         ORDER BY p.month DESC, s.name ASC
         LIMIT 200`,
        tenantId
      );
    }

    return new Response(JSON.stringify(rows.map(rowToPayroll)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch payroll';
    if (msg.includes('no such table')) {
      return new Response(JSON.stringify([]), { headers: CORS });
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}

// POST /api/payroll — generate/upsert payroll for a staff+month
export async function onRequestPost(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const body = await context.request.json();

    if (!body.staffId || !body.month) {
      return new Response(JSON.stringify({ error: 'staffId and month are required' }), {
        status: 400, headers: CORS,
      });
    }

    const db = getDB(context.env);
    await ensureTables(db);

    // Get staff salary
    const staff = await queryFirst(
      db,
      'SELECT * FROM staff WHERE id = ? AND tenant_id = ?',
      body.staffId, tenantId
    );
    if (!staff) {
      return new Response(JSON.stringify({ error: 'Staff not found' }), { status: 404, headers: CORS });
    }

    // Count absents in the month from attendance table
    const [year, mon] = body.month.split('-');
    const daysInMonth = new Date(Number(year), Number(mon), 0).getDate();
    const absentRows = await queryAll(
      db,
      `SELECT COUNT(*) as cnt FROM attendance
       WHERE tenant_id = ? AND staff_id = ? AND date LIKE ? AND status = 'absent'`,
      tenantId, body.staffId, `${body.month}-%`
    );
    const absentDays = (absentRows[0] as any)?.cnt ?? 0;

    const baseSalary = Number(body.baseSalary ?? staff.salary_amount);
    const overtimeAmount = Number(body.overtimeAmount ?? 0);
    const advanceDeduction = Number(body.advanceDeduction ?? 0);

    // Absent deduction: daily rate × absent days (only for monthly salary)
    let absentDeduction = Number(body.absentDeduction ?? 0);
    if (body.absentDeduction === undefined && staff.salary_type === 'monthly') {
      const dailyRate = baseSalary / daysInMonth;
      absentDeduction = Math.round(dailyRate * absentDays * 100) / 100;
    }

    const finalAmount = Math.max(0, baseSalary + overtimeAmount - absentDeduction - advanceDeduction);

    const now = new Date().toISOString();
    const id = `pay_${crypto.randomUUID()}`;

    await execute(
      db,
      `INSERT INTO payroll (id, tenant_id, staff_id, month, base_salary, overtime_amount, advance_deduction, absent_deduction, final_amount, status, paid_date, notes, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,'pending',?,?,?,?)
       ON CONFLICT(tenant_id, staff_id, month) DO UPDATE SET
         base_salary = excluded.base_salary,
         overtime_amount = excluded.overtime_amount,
         advance_deduction = excluded.advance_deduction,
         absent_deduction = excluded.absent_deduction,
         final_amount = excluded.final_amount,
         notes = excluded.notes,
         updated_at = excluded.updated_at`,
      id, tenantId, body.staffId, body.month,
      baseSalary, overtimeAmount, advanceDeduction, absentDeduction, finalAmount,
      body.paidDate || '', body.notes || '', now, now
    );

    const saved = await queryFirst(
      db,
      `SELECT p.*, s.name as staff_name, s.role as staff_role
       FROM payroll p JOIN staff s ON s.id = p.staff_id
       WHERE p.tenant_id = ? AND p.staff_id = ? AND p.month = ?`,
      tenantId, body.staffId, body.month
    );

    return new Response(JSON.stringify(rowToPayroll(saved)), { status: 201, headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to generate payroll';
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}

// PUT /api/payroll — mark paid / update notes
export async function onRequestPut(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const body = await context.request.json();

    if (!body.staffId || !body.month) {
      return new Response(JSON.stringify({ error: 'staffId and month are required' }), {
        status: 400, headers: CORS,
      });
    }

    const db = getDB(context.env);
    await ensureTables(db);
    const now = new Date().toISOString();

    await execute(
      db,
      `UPDATE payroll
       SET status = ?, paid_date = ?, notes = ?, updated_at = ?
       WHERE tenant_id = ? AND staff_id = ? AND month = ?`,
      body.status || 'pending',
      body.paidDate || '',
      body.notes || '',
      now,
      tenantId, body.staffId, body.month
    );

    const saved = await queryFirst(
      db,
      `SELECT p.*, s.name as staff_name, s.role as staff_role
       FROM payroll p JOIN staff s ON s.id = p.staff_id
       WHERE p.tenant_id = ? AND p.staff_id = ? AND p.month = ?`,
      tenantId, body.staffId, body.month
    );

    return new Response(JSON.stringify(rowToPayroll(saved)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update payroll';
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}
