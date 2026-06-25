import { getCollection } from '../db';
import { getTenantIdFromRequest } from '../utils/jwt';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const body = await context.request.json();

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return new Response(JSON.stringify({ error: 'items array is required' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    if (body.items.length > 200) {
      return new Response(JSON.stringify({ error: 'Maximum 200 items per import' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const collection = await getCollection('menu_items');
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const [index, raw] of body.items.entries()) {
      try {
        const name = typeof raw.name === 'string' ? raw.name.trim() : '';
        if (!name) { results.failed++; results.errors.push(`Row ${index + 1}: name is required`); continue; }

        const price = parseFloat(raw.price);
        if (isNaN(price) || price < 0) { results.failed++; results.errors.push(`Row ${index + 1}: invalid price`); continue; }

        const newItem = {
          id: `item_${crypto.randomUUID()}`,
          tenantId,
          name,
          description: typeof raw.description === 'string' ? raw.description.trim() : '',
          price,
          category: typeof raw.category === 'string' ? raw.category.trim() : '',
          type: raw.type === 'non-veg' ? 'non-veg' : 'veg',
          image: typeof raw.image === 'string' ? raw.image.trim() : '',
          available: raw.available !== 'false' && raw.available !== false,
          popular: raw.popular === 'true' || raw.popular === true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await collection.insertOne(newItem);
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${index + 1}: ${err instanceof Error ? err.message : 'unknown error'}`);
      }
    }

    return new Response(JSON.stringify(results), { headers: CORS_HEADERS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Bulk import failed';
    const status = msg.includes('Unauthorized') ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: CORS_HEADERS });
  }
}
