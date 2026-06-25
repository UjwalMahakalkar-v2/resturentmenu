import { getCollection } from '../../db';
import { getTenantIdFromRequest } from '../../utils/jwt';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { ...CORS, 'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' },
  });
}

export async function onRequestPut(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const { id } = context.params;
    const body = await context.request.json();
    const collection = await getCollection('categories');

    const existing = await collection.findOne({ id });
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Category not found' }), { status: 404, headers: CORS });
    }
    if (existing.tenantId !== tenantId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: CORS });
    }

    const { tenantId: _t, id: _i, ...safeUpdates } = body;
    const result = await collection.findOneAndUpdate(
      { id },
      { $set: { ...safeUpdates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return new Response(JSON.stringify({ error: 'Category not found' }), { status: 404, headers: CORS });
    }

    return new Response(JSON.stringify(result), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update category';
    const status = msg.includes('Unauthorized') ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: CORS });
  }
}

export async function onRequestDelete(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const { id } = context.params;
    const collection = await getCollection('categories');

    const existing = await collection.findOne({ id });
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Category not found' }), { status: 404, headers: CORS });
    }
    if (existing.tenantId !== tenantId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: CORS });
    }

    await collection.deleteOne({ id });
    return new Response(JSON.stringify({ success: true }), { headers: CORS });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete category';
    const status = msg.includes('Unauthorized') ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: CORS });
  }
}
