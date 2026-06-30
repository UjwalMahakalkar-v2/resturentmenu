import { getDB, queryFirst, execute } from '../../../db';
import { getTenantIdFromRequest } from '../../../utils/jwt';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestDelete(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const { id } = context.params;
    const db = getDB(context.env);
    const existing = await queryFirst(db, 'SELECT id FROM expenses WHERE id = ? AND tenant_id = ?', id, tenantId);
    if (!existing) return new Response(JSON.stringify({ error: 'Expense not found' }), { status: 404, headers: CORS });
    await execute(db, 'DELETE FROM expenses WHERE id = ? AND tenant_id = ?', id, tenantId);
    return new Response(JSON.stringify({ success: true }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete expense';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
