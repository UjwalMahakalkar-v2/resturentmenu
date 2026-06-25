import { getDB, queryAll } from '../../db';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

function rowToItem(r: any) {
  return { id: r.id, tenantId: r.tenant_id, category: r.category_id, name: r.name, description: r.description || '', price: r.price, type: r.type, image: r.image || '', hasImage: !!(r.image && r.image.length > 0), available: r.available === 1, popular: r.popular === 1 };
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
    const rows = await queryAll(db, 'SELECT * FROM menu_items WHERE tenant_id = ? ORDER BY created_at DESC', tenantId);
    return new Response(JSON.stringify(rows.map(rowToItem)), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: CORS });
  }
}
