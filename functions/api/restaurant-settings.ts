import { getDB, queryFirst, execute } from '../db';
import { getTenantIdFromRequest } from '../utils/jwt';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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
    // All social config lives inside socialMedia so the frontend reads one place
    socialMedia: {
      facebook: r.social_facebook || '',
      instagram: r.social_instagram || '',
      twitter: r.social_twitter || '',
      whatsapp: r.social_whatsapp || '',
      whatsappMessage: r.whatsapp_message || '',
      enableWhatsapp: r.enable_whatsapp === 1,
      enableInstagram: r.enable_instagram === 1,
    },
    enableClickTracking: r.enable_click_tracking !== 0, // default true
    clickRetentionDays: r.click_retention_days ?? 30,
    theme: themeObj,
    template,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

/** Returns true if the template column now exists (either already existed or was just added) */
async function ensureTemplateColumn(db: any): Promise<boolean> {
  try {
    await execute(db, "ALTER TABLE restaurant_settings ADD COLUMN template TEXT DEFAULT 'classic'");
    return true;
  } catch {
    // Either already exists (success) or DDL not supported — assume it exists if error message looks like duplicate
    return true;
  }
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const db = getDB(context.env);
    await ensureTemplateColumn(db);
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
    await ensureTemplateColumn(db);
    const now = new Date().toISOString();

    const existing = await queryFirst(db, 'SELECT id FROM restaurant_settings WHERE tenant_id = ?', tenantId);

    // socialMedia block — extract all sub-fields
    const social = body.socialMedia || {};
    // Embed template inside theme JSON as fallback for DBs where template column may not exist
    const themeStr = body.theme !== undefined
      ? JSON.stringify({ ...body.theme, _tmpl: body.template || 'classic' })
      : (body.template !== undefined ? JSON.stringify({ _tmpl: body.template }) : null);

    if (existing) {
      const setClauses: string[] = ['updated_at = ?'];
      const values: any[] = [now];

      const topFieldMap: Record<string, string> = {
        name: 'name', tagline: 'tagline', logo: 'logo', heroImage: 'hero_image',
        phone: 'phone', email: 'email', location: 'location', about: 'about',
      };
      for (const [jsKey, dbCol] of Object.entries(topFieldMap)) {
        if (body[jsKey] !== undefined) { setClauses.push(`${dbCol} = ?`); values.push(body[jsKey]); }
      }

      if (body.socialMedia !== undefined) {
        // Save all social sub-fields when socialMedia key is present
        setClauses.push(
          'social_facebook = ?, social_instagram = ?, social_twitter = ?, social_whatsapp = ?, whatsapp_message = ?, enable_whatsapp = ?, enable_instagram = ?'
        );
        values.push(
          social.facebook || '',
          social.instagram || '',
          social.twitter || '',
          social.whatsapp || '',
          social.whatsappMessage || '',
          social.enableWhatsapp !== false ? 1 : 0,
          social.enableInstagram !== false ? 1 : 0,
        );
      }

      if (body.enableClickTracking !== undefined) { setClauses.push('enable_click_tracking = ?'); values.push(body.enableClickTracking ? 1 : 0); }
      if (body.clickRetentionDays !== undefined) { setClauses.push('click_retention_days = ?'); values.push(Number(body.clickRetentionDays) || 30); }
      // theme always carries _tmpl as fallback; update theme first (guaranteed to work)
      if (body.theme !== undefined || body.template !== undefined) { setClauses.push('theme = ?'); values.push(themeStr); }

      values.push(tenantId);
      await execute(db, `UPDATE restaurant_settings SET ${setClauses.join(', ')} WHERE tenant_id = ?`, ...values);

      // Also try to update the template column directly (column may not exist on older DBs — safe to fail)
      if (body.template !== undefined) {
        try {
          await execute(db, 'UPDATE restaurant_settings SET template = ? WHERE tenant_id = ?', body.template, tenantId);
        } catch { /* column doesn't exist yet — theme JSON fallback (_tmpl) handles this */ }
      }
    } else {
      const id = `rs_${crypto.randomUUID()}`;
      // INSERT without template column — works even if column doesn't exist; _tmpl in theme JSON is the fallback
      await execute(db,
        'INSERT INTO restaurant_settings (id, tenant_id, name, tagline, logo, hero_image, phone, email, location, about, social_facebook, social_instagram, social_twitter, social_whatsapp, whatsapp_message, enable_whatsapp, enable_instagram, enable_click_tracking, click_retention_days, theme, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        id, tenantId,
        body.name || '', body.tagline || '', body.logo || '', body.heroImage || '',
        body.phone || '', body.email || '', body.location || '', body.about || '',
        social.facebook || '', social.instagram || '', social.twitter || '', social.whatsapp || '',
        social.whatsappMessage || '',
        social.enableWhatsapp !== false ? 1 : 0,
        social.enableInstagram !== false ? 1 : 0,
        body.enableClickTracking !== false ? 1 : 0,
        Number(body.clickRetentionDays) || 30,
        themeStr, now, now
      );
      // Try to also set the template column (may not exist on older DBs)
      try {
        await execute(db, 'UPDATE restaurant_settings SET template = ? WHERE tenant_id = ?', body.template || 'classic', tenantId);
      } catch { /* column doesn't exist — _tmpl in theme JSON handles it */ }
    }

    const saved = await queryFirst(db, 'SELECT * FROM restaurant_settings WHERE tenant_id = ?', tenantId);
    return new Response(JSON.stringify(saved ? rowToSettings(saved) : {}), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to save settings';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
