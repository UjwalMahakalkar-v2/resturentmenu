import { getCollection } from '../db';
import { getTenantIdFromRequest } from '../utils/jwt';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const collection = await getCollection('restaurant_settings');
    const settings = await collection.findOne({ tenantId });

    return new Response(JSON.stringify(settings || {}), {
      headers: CORS_HEADERS,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch settings';
    const status = msg.includes('Unauthorized') ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: CORS_HEADERS });
  }
}

export async function onRequestPut(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const body = await context.request.json();

    // Only allow known fields
    const allowed = ['name', 'tagline', 'logo', 'heroImage', 'phone', 'email', 'location', 'about', 'socialMedia'];
    const updates: Record<string, any> = { tenantId, updatedAt: new Date() };
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const collection = await getCollection('restaurant_settings');
    await collection.updateOne(
      { tenantId },
      { $set: updates },
      { upsert: true }
    );

    const saved = await collection.findOne({ tenantId });
    return new Response(JSON.stringify(saved), { headers: CORS_HEADERS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to save settings';
    const status = msg.includes('Unauthorized') ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: CORS_HEADERS });
  }
}
