import { getDB, queryFirst, execute } from '../../db';
import { getUserFromRequest } from '../../utils/jwt';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'PATCH, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}

export async function onRequestDelete(context: any) {
  try {
    const caller = getUserFromRequest(context.request);
    if (caller.role !== 'super_admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: CORS });

    const { id } = context.params;
    if (!id) return new Response(JSON.stringify({ error: 'Tenant ID required' }), { status: 400, headers: CORS });

    const db = getDB(context.env);
    const tenant = await queryFirst(db, 'SELECT id FROM tenants WHERE id = ?', id);
    if (!tenant) return new Response(JSON.stringify({ error: 'Tenant not found' }), { status: 404, headers: CORS });

    await db.batch([
      db.prepare('DELETE FROM menu_items WHERE tenant_id = ?').bind(id),
      db.prepare('DELETE FROM categories WHERE tenant_id = ?').bind(id),
      db.prepare('DELETE FROM restaurant_settings WHERE tenant_id = ?').bind(id),
      db.prepare('DELETE FROM users WHERE tenant_id = ?').bind(id),
      db.prepare('DELETE FROM tenants WHERE id = ?').bind(id),
    ]);

    return new Response(JSON.stringify({ success: true }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete tenant';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: CORS });
  }
}

export async function onRequestPatch(context: any) {
  try {
    const caller = getUserFromRequest(context.request);
    if (caller.role !== 'super_admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: CORS });

    const { id } = context.params;
    if (!id) return new Response(JSON.stringify({ error: 'Tenant ID required' }), { status: 400, headers: CORS });

    const body = await context.request.json();
    const db = getDB(context.env);

    const allowed: Record<string, string> = {
      status: 'status', name: 'name', email: 'email',
      phone: 'phone', address: 'address', subscriptionPlan: 'subscription_plan',
    };
    const setClauses: string[] = ['updated_at = ?'];
    const values: any[] = [new Date().toISOString()];

    for (const [jsKey, dbCol] of Object.entries(allowed)) {
      if (body[jsKey] !== undefined) {
        setClauses.push(`${dbCol} = ?`);
        values.push(body[jsKey]);
      }
    }

    if (body.status && !['active', 'suspended', 'inactive'].includes(body.status)) {
      return new Response(JSON.stringify({ error: 'Invalid status value' }), { status: 400, headers: CORS });
    }

    values.push(id);
    await execute(db, `UPDATE tenants SET ${setClauses.join(', ')} WHERE id = ?`, ...values);

    const updated = await queryFirst(db, 'SELECT * FROM tenants WHERE id = ?', id);
    if (!updated) return new Response(JSON.stringify({ error: 'Tenant not found' }), { status: 404, headers: CORS });

    return new Response(JSON.stringify({
      id: updated.id, slug: updated.slug, name: updated.name, status: updated.status,
      subscriptionPlan: updated.subscription_plan, email: updated.email,
    }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update tenant';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: CORS });
  }
}
