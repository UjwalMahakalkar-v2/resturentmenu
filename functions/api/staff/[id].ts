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
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
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
    const { id } = context.params;
    const db = getDB(context.env);
    const row = await queryFirst(db, 'SELECT * FROM staff WHERE id = ? AND tenant_id = ?', id, tenantId);
    if (!row) {
      return new Response(JSON.stringify({ error: 'Staff not found' }), { status: 404, headers: CORS });
    }
    return new Response(JSON.stringify(rowToStaff(row)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch staff';
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}

export async function onRequestPut(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const { id } = context.params;
    const body = await context.request.json();
    const db = getDB(context.env);

    const existing = await queryFirst(db, 'SELECT id FROM staff WHERE id = ? AND tenant_id = ?', id, tenantId);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Staff not found' }), { status: 404, headers: CORS });
    }

    const now = new Date().toISOString();
    await execute(
      db,
      `UPDATE staff SET
        name = COALESCE(?, name),
        photo = COALESCE(?, photo),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        role = COALESCE(?, role),
        joining_date = COALESCE(?, joining_date),
        salary_type = COALESCE(?, salary_type),
        salary_amount = COALESCE(?, salary_amount),
        emergency_contact = COALESCE(?, emergency_contact),
        active = COALESCE(?, active),
        updated_at = ?
       WHERE id = ? AND tenant_id = ?`,
      body.name ?? null,
      body.photo !== undefined ? body.photo : null,
      body.phone !== undefined ? body.phone : null,
      body.email !== undefined ? body.email : null,
      body.role ?? null,
      body.joiningDate ?? null,
      body.salaryType ?? null,
      body.salaryAmount !== undefined ? Number(body.salaryAmount) : null,
      body.emergencyContact !== undefined ? body.emergencyContact : null,
      body.active !== undefined ? (body.active ? 1 : 0) : null,
      now, id, tenantId
    );

    const updated = await queryFirst(db, 'SELECT * FROM staff WHERE id = ?', id);
    return new Response(JSON.stringify(rowToStaff(updated)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update staff';
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}

export async function onRequestDelete(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const { id } = context.params;
    const db = getDB(context.env);

    const existing = await queryFirst(db, 'SELECT id FROM staff WHERE id = ? AND tenant_id = ?', id, tenantId);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Staff not found' }), { status: 404, headers: CORS });
    }

    // Soft-delete (mark inactive) rather than destroying payroll/attendance history
    await execute(
      db,
      'UPDATE staff SET active = 0, updated_at = ? WHERE id = ? AND tenant_id = ?',
      new Date().toISOString(), id, tenantId
    );

    return new Response(JSON.stringify({ success: true }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete staff';
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}
