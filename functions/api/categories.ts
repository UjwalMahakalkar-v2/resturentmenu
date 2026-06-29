import { getDB, queryAll, execute } from '../db';
import { getTenantIdFromRequest } from '../utils/jwt';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function rowToCat(r: any) {
  return { id: r.id, tenantId: r.tenant_id, name: r.name, description: r.description || '', icon: r.icon || '', image: r.image || '', order: r.sort_order, createdAt: r.created_at, updatedAt: r.updated_at };
}

/** Self-heal: add the image column on older DBs. Safe to call repeatedly. */
async function ensureImageColumn(db: any) {
  try {
    await execute(db, 'ALTER TABLE categories ADD COLUMN image TEXT');
  } catch {
    // Column already exists — ignore
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } });
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    await ensureImageColumn(db);
    const rows = await queryAll(db, 'SELECT * FROM categories WHERE tenant_id = ? ORDER BY sort_order ASC', tenantId);
    return new Response(JSON.stringify(rows.map(rowToCat)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch categories';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}

export async function onRequestPost(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const body = await context.request.json();
    const db = getDB(context.env);
    await ensureImageColumn(db);
    const now = new Date().toISOString();
    const id = `cat_${crypto.randomUUID()}`;
    const sortOrder = typeof body.sortOrder === 'number' ? body.sortOrder : (typeof body.order === 'number' ? body.order : 0);
    await execute(db,
      'INSERT INTO categories (id, tenant_id, name, description, icon, image, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
      id, tenantId, body.name || '', body.description || '', body.icon || '', body.image || '', sortOrder, now, now
    );
    return new Response(JSON.stringify(rowToCat({ id, tenant_id: tenantId, name: body.name || '', description: body.description || '', icon: body.icon || '', image: body.image || '', sort_order: sortOrder, created_at: now, updated_at: now })), { status: 201, headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create category';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
