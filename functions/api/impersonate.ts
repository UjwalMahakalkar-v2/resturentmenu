import { getCollection } from '../db';
import { getUserFromRequest, generateJWT } from '../utils/jwt';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * POST /api/impersonate
 * Body: { tenantId: string }
 * Returns a short-lived admin token for the target tenant's first active admin/owner user.
 * Only super_admin role can call this.
 */
export async function onRequestPost(context: any) {
  try {
    const caller = getUserFromRequest(context.request);

    if (caller.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden — super_admin only' }), {
        status: 403,
        headers: CORS_HEADERS,
      });
    }

    const body = await context.request.json();
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';

    if (!tenantId) {
      return new Response(JSON.stringify({ error: 'tenantId is required' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const [tenantsCol, usersCol] = await Promise.all([
      getCollection('tenants'),
      getCollection('users'),
    ]);

    const tenant = await tenantsCol.findOne({ id: tenantId });
    if (!tenant) {
      return new Response(JSON.stringify({ error: 'Tenant not found' }), {
        status: 404,
        headers: CORS_HEADERS,
      });
    }

    if (tenant.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Cannot impersonate a suspended or inactive tenant' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    // Find first active owner/admin user for this tenant
    const adminUser = await usersCol.findOne({
      tenantId,
      active: true,
      role: { $in: ['owner', 'admin', 'tenant_admin'] },
    });

    if (!adminUser) {
      return new Response(JSON.stringify({ error: 'No active admin user found for this tenant' }), {
        status: 404,
        headers: CORS_HEADERS,
      });
    }

    const token = generateJWT(adminUser);

    return new Response(JSON.stringify({
      token,
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      user: { id: adminUser.id, email: adminUser.email, name: adminUser.name, role: adminUser.role },
    }), { headers: CORS_HEADERS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Impersonation failed';
    const status = msg.includes('Unauthorized') ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: CORS_HEADERS });
  }
}
