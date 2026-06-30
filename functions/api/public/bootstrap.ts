import { getDB, queryFirst, queryAll } from '../../db';
import { resolveTenantRow } from '../../utils/tenant';

/**
 * Combined public bootstrap for the customer menu page.
 * Returns { tenant, settings, categories, menu } in a SINGLE request so the
 * storefront avoids the old 4-call waterfall (tenant → settings + menu + categories).
 * Read-only: no ALTER/migration here — SELECT * tolerates older DBs missing columns.
 */
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
}

function rowToSettings(r: any) {
  const themeObj = r.theme ? JSON.parse(r.theme) : null;
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
    outOfStockBehavior: r.out_of_stock_behavior || 'badge',
    enableShareMenu: r.enable_share_menu !== 0,
  };
}

function rowToCat(r: any) {
  return { id: r.id, tenantId: r.tenant_id, name: r.name, description: r.description || '', icon: r.icon || '', image: r.image || '', order: r.sort_order };
}

function rowToItem(r: any) {
  return { id: r.id, tenantId: r.tenant_id, category: r.category_id, name: r.name, description: r.description || '', price: r.price, type: r.type, image: r.image || '', hasImage: !!(r.image && r.image.length > 0), available: r.available === 1, popular: r.popular === 1, sortOrder: r.sort_order ?? 0 };
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

    const tenant = await resolveTenantRow(db, { slug, subdomain });

    if (!tenant) {
      return new Response(JSON.stringify({ error: 'Tenant not found' }), { status: 404, headers: CORS });
    }

    const tenantId = tenant.id;

    // Fetch the three tenant-scoped datasets in parallel (single HTTP round-trip for the client).
    const [settingsRow, catRows, itemRows] = await Promise.all([
      queryFirst(db, 'SELECT * FROM restaurant_settings WHERE tenant_id = ?', tenantId).catch(() => null),
      queryAll(db, 'SELECT * FROM categories WHERE tenant_id = ? ORDER BY sort_order ASC', tenantId).catch(() => []),
      queryAll(db, 'SELECT * FROM menu_items WHERE tenant_id = ? ORDER BY sort_order ASC, created_at DESC', tenantId).catch(() => []),
    ]);

    return new Response(JSON.stringify({
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, subdomain: tenant.subdomain, status: tenant.status },
      settings: settingsRow ? rowToSettings(settingsRow) : {},
      categories: (catRows as any[]).map(rowToCat),
      menu: (itemRows as any[]).map(rowToItem),
    }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: CORS });
  }
}
