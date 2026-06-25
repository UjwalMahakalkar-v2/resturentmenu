import { getDB, queryFirst, execute } from '../db';
import { getTenantIdFromRequest } from '../utils/jwt';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function rowToSettings(r: any) {
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
    },
    whatsappMessage: r.whatsapp_message || '',
    enableWhatsapp: r.enable_whatsapp === 1,
    enableInstagram: r.enable_instagram === 1,
    theme: r.theme ? JSON.parse(r.theme) : null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    const row = await queryFirst(db, 'SELECT * FROM restaurant_settings WHERE tenant_id = ?', tenantId);
    return new Response(JSON.stringify(row ? rowToSettings(row) : {}), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch settings';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}

export async function onRequestPut(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const body = await context.request.json();
    const db = getDB(context.env);
    const now = new Date().toISOString();

    const existing = await queryFirst(db, 'SELECT id FROM restaurant_settings WHERE tenant_id = ?', tenantId);

    const social = body.socialMedia || {};
    const themeStr = body.theme !== undefined ? JSON.stringify(body.theme) : null;

    if (existing) {
      const setClauses: string[] = ['updated_at = ?'];
      const values: any[] = [now];

      const fieldMap: Record<string, string> = {
        name: 'name', tagline: 'tagline', logo: 'logo', heroImage: 'hero_image',
        phone: 'phone', email: 'email', location: 'location', about: 'about',
        whatsappMessage: 'whatsapp_message',
      };
      for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
        if (body[jsKey] !== undefined) { setClauses.push(`${dbCol} = ?`); values.push(body[jsKey]); }
      }
      if (body.socialMedia !== undefined) {
        setClauses.push('social_facebook = ?, social_instagram = ?, social_twitter = ?, social_whatsapp = ?');
        values.push(social.facebook || '', social.instagram || '', social.twitter || '', social.whatsapp || '');
      }
      if (body.enableWhatsapp !== undefined) { setClauses.push('enable_whatsapp = ?'); values.push(body.enableWhatsapp ? 1 : 0); }
      if (body.enableInstagram !== undefined) { setClauses.push('enable_instagram = ?'); values.push(body.enableInstagram ? 1 : 0); }
      if (body.theme !== undefined) { setClauses.push('theme = ?'); values.push(themeStr); }

      values.push(tenantId);
      await execute(db, `UPDATE restaurant_settings SET ${setClauses.join(', ')} WHERE tenant_id = ?`, ...values);
    } else {
      const id = `rs_${crypto.randomUUID()}`;
      await execute(db,
        'INSERT INTO restaurant_settings (id, tenant_id, name, tagline, logo, hero_image, phone, email, location, about, social_facebook, social_instagram, social_twitter, social_whatsapp, whatsapp_message, enable_whatsapp, enable_instagram, theme, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        id, tenantId,
        body.name || '', body.tagline || '', body.logo || '', body.heroImage || '',
        body.phone || '', body.email || '', body.location || '', body.about || '',
        social.facebook || '', social.instagram || '', social.twitter || '', social.whatsapp || '',
        body.whatsappMessage || '', body.enableWhatsapp !== false ? 1 : 0, body.enableInstagram !== false ? 1 : 0,
        themeStr, now, now
      );
    }

    const saved = await queryFirst(db, 'SELECT * FROM restaurant_settings WHERE tenant_id = ?', tenantId);
    return new Response(JSON.stringify(saved ? rowToSettings(saved) : {}), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to save settings';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
