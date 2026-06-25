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

    // Check if tenant exists
    const tenant = await queryFirst(db, 'SELECT id FROM tenants WHERE id = ?', tenantId);
    if (!tenant) return new Response(JSON.stringify({ error: 'Tenant not found' }), { status: 404, headers: CORS });

    // Check if click tracking is enabled for this tenant
    const settings = await queryFirst(db, 'SELECT enable_click_tracking FROM restaurant_settings WHERE tenant_id = ?', tenantId);
    // Default to enabled if no settings row yet
    if (settings && settings.enable_click_tracking === 0) {
      return new Response(JSON.stringify({ success: true, tracked: false }), { headers: CORS });
    }

    const col = `${platform}_clicks`;
    await execute(db, `UPDATE tenants SET ${col} = ${col} + 1 WHERE id = ?`, tenantId);

    return new Response(JSON.stringify({ success: true, tracked: true }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to track click';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: CORS });
  }
}
