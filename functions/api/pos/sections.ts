import { getDB, queryAll, execute } from '../../db';
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function rowToSection(r: any) {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    description: r.description || '',
    sortOrder: r.sort_order,
    active: r.active === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    const rows = await queryAll(db, 'SELECT * FROM pos_sections WHERE tenant_id = ? ORDER BY sort_order ASC, name ASC', tenantId);
    return new Response(JSON.stringify(rows.map(rowToSection)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch sections';
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}

export async function onRequestPost(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    const body = await context.request.json();
    if (!body.name?.trim()) {
      return new Response(JSON.stringify({ error: 'Section name is required' }), { status: 400, headers: CORS });
    }
    const now = new Date().toISOString();
    const id = `sec_${crypto.randomUUID()}`;
    await execute(
      db,
      'INSERT INTO pos_sections (id, tenant_id, name, description, sort_order, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
      id, tenantId, body.name.trim(), body.description?.trim() || '', body.sortOrder ?? 0, now, now,
    );
    return new Response(JSON.stringify(rowToSection({
      id, tenant_id: tenantId, name: body.name.trim(), description: body.description?.trim() || '',
      sort_order: body.sortOrder ?? 0, active: 1, created_at: now, updated_at: now,
    })), { status: 201, headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create section';
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}
