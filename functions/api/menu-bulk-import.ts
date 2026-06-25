import { getDB, execute } from '../db';
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
    const results = { success: 0, failed: 0, errors: [] as string[] };
    const now = new Date().toISOString();

    for (const [index, raw] of body.items.entries()) {
      try {
        const name = typeof raw.name === 'string' ? raw.name.trim() : '';
        if (!name) { results.failed++; results.errors.push(`Row ${index + 1}: name is required`); continue; }

        const price = parseFloat(raw.price);
        if (isNaN(price) || price < 0) { results.failed++; results.errors.push(`Row ${index + 1}: invalid price`); continue; }

        const id = `item_${crypto.randomUUID()}`;
        const categoryId = typeof raw.category === 'string' ? raw.category.trim() : '';
        const available = raw.available !== 'false' && raw.available !== false ? 1 : 0;
        const popular = raw.popular === 'true' || raw.popular === true ? 1 : 0;

        await execute(db,
          'INSERT INTO menu_items (id, tenant_id, category_id, name, description, price, type, image, available, popular, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
          id, tenantId, categoryId, name,
          typeof raw.description === 'string' ? raw.description.trim() : '',
          price, raw.type === 'non-veg' ? 'non-veg' : 'veg',
          typeof raw.image === 'string' ? raw.image.trim() : '',
          available, popular, now, now
        );
        results.success++;
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
