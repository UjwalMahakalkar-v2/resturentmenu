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

function rowToTable(r: any) {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    sectionId: r.section_id,
    sectionName: r.section_name || '',
    name: r.name,
    capacity: r.capacity,
    status: r.status,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    const url = new URL(context.request.url);
    const sectionId = url.searchParams.get('sectionId');

    let rows;
    if (sectionId) {
      rows = await queryAll(
        db,
        `SELECT t.*, s.name AS section_name FROM pos_tables t
         LEFT JOIN pos_sections s ON s.id = t.section_id
         WHERE t.tenant_id = ? AND t.section_id = ?
         ORDER BY t.sort_order ASC, t.name ASC`,
        tenantId, sectionId,
      );
    } else {
      rows = await queryAll(
        db,
        `SELECT t.*, s.name AS section_name FROM pos_tables t
         LEFT JOIN pos_sections s ON s.id = t.section_id
         WHERE t.tenant_id = ?
         ORDER BY s.sort_order ASC, t.sort_order ASC, t.name ASC`,
        tenantId,
      );
    }
    return new Response(JSON.stringify(rows.map(rowToTable)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch tables';
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
    if (!body.name?.trim()) return new Response(JSON.stringify({ error: 'Table name is required' }), { status: 400, headers: CORS });
    if (!body.sectionId) return new Response(JSON.stringify({ error: 'Section is required' }), { status: 400, headers: CORS });

    const now = new Date().toISOString();
    const id = `tbl_${crypto.randomUUID()}`;
    await execute(
      db,
      'INSERT INTO pos_tables (id, tenant_id, section_id, name, capacity, status, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id, tenantId, body.sectionId, body.name.trim(), body.capacity ?? 4, 'available', body.sortOrder ?? 0, now, now,
    );
    return new Response(JSON.stringify(rowToTable({
      id, tenant_id: tenantId, section_id: body.sectionId, section_name: '',
      name: body.name.trim(), capacity: body.capacity ?? 4, status: 'available',
      sort_order: body.sortOrder ?? 0, created_at: now, updated_at: now,
    })), { status: 201, headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create table';
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 500,
      headers: CORS,
    });
  }
}
