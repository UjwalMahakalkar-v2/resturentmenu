import { getDB, queryFirst } from '../../db';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
}

export async function onRequestGet(context: any) {
  try {
    const url = new URL(context.request.url);
    const slug = url.searchParams.get('slug');
    if (!slug) return new Response(JSON.stringify({ error: 'slug is required' }), { status: 400, headers: CORS });

    const db = getDB(context.env);
    const tenant = await queryFirst(db, "SELECT * FROM tenants WHERE slug = ? AND status != 'deleted'", slug);
    if (!tenant) return new Response(JSON.stringify({ error: 'Tenant not found' }), { status: 404, headers: CORS });

    return new Response(JSON.stringify({
      id: tenant.id, name: tenant.name, slug: tenant.slug,
      subdomain: tenant.subdomain, status: tenant.status,
    }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: CORS });
  }
}
