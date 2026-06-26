import { getDB, queryFirst } from '../../db';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
}

export async function onRequestGet(context: any) {
  try {
    const url = new URL(context.request.url);
    const slug = url.searchParams.get('slug');
    const subdomain = url.searchParams.get('subdomain');

    if (!slug && !subdomain) {
      return new Response(JSON.stringify({ error: 'slug or subdomain is required' }), { status: 400, headers: CORS });
    }

    const db = getDB(context.env);
    let tenant: any = null;

    if (slug) {
      // First try exact slug match, then try subdomain match
      tenant = await queryFirst(db, "SELECT * FROM tenants WHERE slug = ? AND status != 'deleted'", slug);
      if (!tenant) {
        tenant = await queryFirst(db, "SELECT * FROM tenants WHERE subdomain = ? AND status != 'deleted'", slug);
      }
    } else if (subdomain) {
      // Look up by subdomain (full domain like pizza.menumate.in)
      tenant = await queryFirst(db, "SELECT * FROM tenants WHERE subdomain = ? AND status != 'deleted'", subdomain);
    }

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
