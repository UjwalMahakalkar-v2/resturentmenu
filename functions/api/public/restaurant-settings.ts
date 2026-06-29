import { getDB, queryFirst } from '../../db';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };

function rowToSettings(r: any) {
  const themeObj = r.theme ? JSON.parse(r.theme) : null;
  // template column may not exist in older DB rows — fall back to value stored inside theme JSON
  const template = r.template || themeObj?._tmpl || 'classic';
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name || '',
    tagline: r.tagline || '',
    logo: r.logo || '',
    heroImage: r.hero_image || '',
    phone: r.phone || '',
    email: r.email || '',
    location: r.location || '',
    about: r.about || '',
    socialMedia: {
      facebook: r.social_facebook || '',
      instagram: r.social_instagram || '',
      twitter: r.social_twitter || '',
      whatsapp: r.social_whatsapp || '',
      whatsappMessage: r.whatsapp_message || '',
      enableWhatsapp: r.enable_whatsapp === 1,
      enableInstagram: r.enable_instagram === 1,
    },
    enableClickTracking: r.enable_click_tracking !== 0,
    clickRetentionDays: r.click_retention_days ?? 30,
    theme: themeObj,
    template,
    announcement: r.announcement ? JSON.parse(r.announcement) : null,
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
}

export async function onRequestGet(context: any) {
  try {
    const url = new URL(context.request.url);
    const tenantId = url.searchParams.get('tenantId');
    if (!tenantId) return new Response(JSON.stringify({ error: 'tenantId is required' }), { status: 400, headers: CORS });

    // Read-only path: SELECT * tolerates older DBs missing template/announcement columns.
    // Column creation is handled by the authenticated admin save path, not on every public read.
    const db = getDB(context.env);
    const row = await queryFirst(db, 'SELECT * FROM restaurant_settings WHERE tenant_id = ?', tenantId);
    return new Response(JSON.stringify(row ? rowToSettings(row) : {}), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch settings';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: CORS });
  }
}
