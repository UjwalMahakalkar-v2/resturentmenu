import { getDB, execute, queryAll, queryFirst } from '../db';
import { getTenantIdFromRequest } from '../utils/jwt';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const body = await context.request.json();

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return new Response(JSON.stringify({ error: 'items array is required' }), { status: 400, headers: CORS });
    }
    if (body.items.length > 200) {
      return new Response(JSON.stringify({ error: 'Maximum 200 items per import' }), { status: 400, headers: CORS });
    }

    const db = getDB(context.env);
    const results = { success: 0, updated: 0, failed: 0, errors: [] as string[] };
    const now = new Date().toISOString();

    // Optional calories column may not exist on older DBs.
    await execute(db, 'ALTER TABLE menu_items ADD COLUMN calories REAL').catch(() => {});

    // Load existing categories so the "category" column can be a name OR an id.
    // Unknown names are auto-created so a round-tripped export imports cleanly.
    const cats = await queryAll(db, 'SELECT id, name FROM categories WHERE tenant_id = ?', tenantId).catch(() => []);
    const idSet = new Set((cats as any[]).map(c => c.id));
    const nameToId = new Map((cats as any[]).map(c => [String(c.name || '').trim().toLowerCase(), c.id]));

    const resolveCategory = async (rawCat: string): Promise<string> => {
      const val = (rawCat || '').trim();
      if (!val) return '';
      if (idSet.has(val)) return val;
      const byName = nameToId.get(val.toLowerCase());
      if (byName) return byName;
      const cid = `cat_${crypto.randomUUID()}`;
      await execute(db, 'INSERT INTO categories (id, tenant_id, name, icon, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?,?)', cid, tenantId, val, '🍽️', 0, now, now);
      idSet.add(cid);
      nameToId.set(val.toLowerCase(), cid);
      return cid;
    };

    for (const [index, raw] of body.items.entries()) {
      try {
        const name = typeof raw.name === 'string' ? raw.name.trim() : '';
        if (!name) { results.failed++; results.errors.push(`Row ${index + 1}: name is required`); continue; }

        const price = parseFloat(raw.price);
        if (isNaN(price) || price < 0) { results.failed++; results.errors.push(`Row ${index + 1}: invalid price`); continue; }

        const categoryId = await resolveCategory(typeof raw.category === 'string' ? raw.category : '');
        const available = raw.available !== 'false' && raw.available !== false ? 1 : 0;
        const popular = raw.popular === 'true' || raw.popular === true ? 1 : 0;
        const calRaw = raw.calories;
        const calNum = calRaw === '' || calRaw === undefined || calRaw === null ? NaN : parseFloat(calRaw);
        const calories = isNaN(calNum) ? null : calNum;
        const description = typeof raw.description === 'string' ? raw.description.trim() : '';
        const type = raw.type === 'non-veg' ? 'non-veg' : 'veg';
        const image = typeof raw.image === 'string' ? raw.image.trim() : '';
        const soRaw = raw.sortorder ?? raw.sort_order;
        const sortOrder = soRaw === '' || soRaw === undefined || soRaw === null ? null : (parseInt(soRaw, 10) || 0);

        // Upsert: a matching id (scoped to this tenant) updates in place; otherwise insert.
        // This makes export → edit → re-import idempotent instead of duplicating the menu.
        const rawId = typeof raw.id === 'string' ? raw.id.trim() : '';
        const existing = rawId
          ? await queryFirst(db, 'SELECT id FROM menu_items WHERE id = ? AND tenant_id = ?', rawId, tenantId).catch(() => null)
          : null;

        if (existing) {
          await execute(db,
            `UPDATE menu_items SET category_id = ?, name = ?, description = ?, price = ?, type = ?, image = ?, available = ?, popular = ?, calories = ?, sort_order = COALESCE(?, sort_order), updated_at = ? WHERE id = ? AND tenant_id = ?`,
            categoryId, name, description, price, type, image, available, popular, calories, sortOrder, now, rawId, tenantId,
          );
          results.updated++;
        } else {
          await execute(db,
            'INSERT INTO menu_items (id, tenant_id, category_id, name, description, price, type, image, available, popular, calories, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            `item_${crypto.randomUUID()}`, tenantId, categoryId, name, description,
            price, type, image, available, popular, calories, sortOrder ?? 0, now, now,
          );
          results.success++;
        }
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${index + 1}: ${err instanceof Error ? err.message : 'unknown error'}`);
      }
    }

    return new Response(JSON.stringify(results), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Bulk import failed';
    return new Response(JSON.stringify({ error: msg }), { status: msg.includes('Unauthorized') ? 401 : 500, headers: CORS });
  }
}
