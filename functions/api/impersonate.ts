import { getDB, queryFirst } from '../db';
import { getUserFromRequest, generateJWT } from '../utils/jwt';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context: any) {
  try {
    const caller = getUserFromRequest(context.request);
    if (caller.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden — super_admin only' }), { status: 403, headers: CORS });
    }

    const body = await context.request.json();
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
    if (!tenantId) return new Response(JSON.stringify({ error: 'tenantId is required' }), { status: 400, headers: CORS });

    const db = getDB(context.env);
    const tenant = await queryFirst(db, 'SELECT * FROM tenants WHERE id = ?', tenantId);
    if (!tenant) return new Response(JSON.stringify({ error: 'Tenant not found' }), { status: 404, headers: CORS });
    if (tenant.status !== 'active') return new Response(JSON.stringify({ error: 'Cannot impersonate a suspended or inactive tenant' }), { status: 400, headers: CORS });

    const adminUser = await queryFirst(db,
      "SELECT * FROM users WHERE tenant_id = ? AND active = 1 AND role IN ('owner', 'admin', 'tenant_admin') LIMIT 1",
      tenantId
    );
    if (!adminUser) return new Response(JSON.stringify({ error: 'No active admin user found for this tenant' }), { status: 404, headers: CORS });

    const token = generateJWT({ id: adminUser.id, tenantId: adminUser.tenant_id, email: adminUser.email, role: adminUser.role });

    return new Response(JSON.stringify({
      token,
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      user: { id: adminUser.id, email: adminUser.email, name: adminUser.name, role: adminUser.role },
    }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Impersonation failed';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
