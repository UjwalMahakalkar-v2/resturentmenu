import { getDB, queryAll, execute } from '../db';
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function rowToStaff(r: any) {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    photo: r.photo || '',
    phone: r.phone || '',
    email: r.email || '',
    role: r.role,
    joiningDate: r.joining_date,
    salaryType: r.salary_type,
    salaryAmount: r.salary_amount,
    emergencyContact: r.emergency_contact || '',
    active: r.active === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    const rows = await queryAll(
      db,
      'SELECT * FROM staff WHERE tenant_id = ? ORDER BY name ASC',
      tenantId
    );
    return new Response(JSON.stringify(rows.map(rowToStaff)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch staff';
    if (msg.includes('no such table')) {
      return new Response(JSON.stringify([]), { headers: CORS });
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}

export async function onRequestPost(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const body = await context.request.json();

    if (!body.name?.trim()) {
      return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400, headers: CORS });
    }
    if (!body.role?.trim()) {
      return new Response(JSON.stringify({ error: 'Role is required' }), { status: 400, headers: CORS });
    }
    if (!body.joiningDate) {
      return new Response(JSON.stringify({ error: 'Joining date is required' }), { status: 400, headers: CORS });
    }

    const db = getDB(context.env);
    const now = new Date().toISOString();
    const id = `staff_${crypto.randomUUID()}`;

    await execute(
      db,
      `INSERT INTO staff (id, tenant_id, name, photo, phone, email, role, joining_date, salary_type, salary_amount, emergency_contact, active, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?)`,
      id, tenantId,
      body.name.trim(),
      body.photo || '',
      body.phone || '',
      body.email || '',
      body.role.trim(),
      body.joiningDate,
      body.salaryType || 'monthly',
      Number(body.salaryAmount) || 0,
      body.emergencyContact || '',
      now, now
    );

    return new Response(JSON.stringify({
      id, tenantId,
      name: body.name.trim(),
      photo: body.photo || '',
      phone: body.phone || '',
      email: body.email || '',
      role: body.role.trim(),
      joiningDate: body.joiningDate,
      salaryType: body.salaryType || 'monthly',
      salaryAmount: Number(body.salaryAmount) || 0,
      emergencyContact: body.emergencyContact || '',
      active: true,
      createdAt: now,
      updatedAt: now,
    }), { status: 201, headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create staff';
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}
