import { getCollection } from '../db';
import { getTenantIdFromRequest } from '../utils/jwt';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);

    const [tenantsCol, menuCol] = await Promise.all([
      getCollection('tenants'),
      getCollection('menu_items'),
    ]);

    const [tenant, menuItems] = await Promise.all([
      tenantsCol.findOne({ id: tenantId }),
      menuCol.find({ tenantId }).toArray(),
    ]);

    const social = tenant?.socialAnalytics || {};

    return new Response(JSON.stringify({
      socialClicks: {
        whatsapp: social.whatsappClicks || 0,
        instagram: social.instagramClicks || 0,
        facebook: social.facebookClicks || 0,
        twitter: social.twitterClicks || 0,
      },
      menuStats: {
        totalItems: menuItems.length,
        availableItems: menuItems.filter((i: any) => i.available).length,
        popularItems: menuItems.filter((i: any) => i.popular).length,
        vegItems: menuItems.filter((i: any) => i.type === 'veg').length,
        nonVegItems: menuItems.filter((i: any) => i.type === 'non-veg').length,
      },
    }), { headers: CORS_HEADERS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch analytics';
    const status = msg.includes('Unauthorized') ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: CORS_HEADERS });
  }
}
