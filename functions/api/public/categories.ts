import { getDB, queryAll, execute } from '../../db';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

function rowToCat(r: any) {
  return { id: r.id, tenantId: r.tenant_id, name: r.name, description: r.description || '', icon: r.icon || '', image: r.image || '', order: r.sort_order };
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
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
}

export async function onRequestGet(context: any) {
  try {
    const url = new URL(context.request.url);
    const tenantId = url.searchParams.get('tenantId');
    if (!tenantId) return new Response(JSON.stringify({ error: 'tenantId is required' }), { status: 400, headers: CORS });

    const db = getDB(context.env);
    await ensureImageColumn(db);
    const rows = await queryAll(db, 'SELECT * FROM categories WHERE tenant_id = ? ORDER BY sort_order ASC', tenantId);
    return new Response(JSON.stringify(rows.map(rowToCat)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: CORS });
  }
}
