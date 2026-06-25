import { getDB, queryFirst, execute } from '../../db';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

const VALID_PLATFORMS = ['whatsapp', 'instagram', 'facebook', 'twitter'] as const;
type Platform = typeof VALID_PLATFORMS[number];

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}

export async function onRequestPost(context: any) {
  try {
    const { tenantId, platform } = await context.request.json();

    if (!tenantId || !platform) {
      return new Response(JSON.stringify({ error: 'Missing tenantId or platform' }), { status: 400, headers: CORS });
    }

    if (!VALID_PLATFORMS.includes(platform as Platform)) {
      return new Response(JSON.stringify({ error: 'Invalid platform' }), { status: 400, headers: CORS });
    }

    const db = getDB(context.env);
    const tenant = await queryFirst(db, 'SELECT id FROM tenants WHERE id = ?', tenantId);
    if (!tenant) return new Response(JSON.stringify({ error: 'Tenant not found' }), { status: 404, headers: CORS });

    const col = `${platform}_clicks`;
    await execute(db, `UPDATE tenants SET ${col} = ${col} + 1 WHERE id = ?`, tenantId);

    return new Response(JSON.stringify({ success: true }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to track click';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: CORS });
  }
}
