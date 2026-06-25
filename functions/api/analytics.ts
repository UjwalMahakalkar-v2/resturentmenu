import { getDB, queryFirst, queryAll } from '../db';
import { getTenantIdFromRequest } from '../utils/jwt';
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }
export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    const [tenant, items] = await Promise.all([
      queryFirst(db, 'SELECT * FROM tenants WHERE id = ?', tenantId),
      queryAll(db, 'SELECT available, popular, type FROM menu_items WHERE tenant_id = ?', tenantId),
    ]);
    return new Response(JSON.stringify({
      socialClicks: { whatsapp: tenant?.whatsapp_clicks||0, instagram: tenant?.instagram_clicks||0, facebook: tenant?.facebook_clicks||0, twitter: tenant?.twitter_clicks||0 },
      menuStats: { totalItems: items.length, availableItems: items.filter((i:any)=>i.available===1).length, popularItems: items.filter((i:any)=>i.popular===1).length, vegItems: items.filter((i:any)=>i.type==='veg').length, nonVegItems: items.filter((i:any)=>i.type==='non-veg').length },
    }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized')?401:500, headers: CORS });
  }
}
