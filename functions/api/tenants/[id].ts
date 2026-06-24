import { getCollection } from '../../db';

export async function onRequestDelete(context: any) {
  try {
    const { id } = context.params;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Tenant ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tenantsCollection = await getCollection('tenants');
    const tenant = await tenantsCollection.findOne({ id });

    if (!tenant) {
      return new Response(JSON.stringify({ error: 'Tenant not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Hard delete — removes tenant, its users, categories, and menu items
    const tenantId = tenant.id;
    await Promise.all([
      tenantsCollection.deleteOne({ id: tenantId }),
      getCollection('users').then(col => col.deleteMany({ tenantId })),
      getCollection('categories').then(col => col.deleteMany({ tenantId })),
      getCollection('menu_items').then(col => col.deleteMany({ tenantId })),
    ]);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete tenant';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPatch(context: any) {
  try {
    const { id } = context.params;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Tenant ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await context.request.json();
    const allowedFields = ['status', 'name', 'email', 'phone', 'address', 'subscriptionPlan'];
    const updates: Record<string, any> = { updatedAt: new Date() };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (updates.status && !['active', 'suspended', 'inactive'].includes(updates.status)) {
      return new Response(JSON.stringify({ error: 'Invalid status value' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const collection = await getCollection('tenants');
    const result = await collection.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!result) {
      return new Response(JSON.stringify({ error: 'Tenant not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update tenant';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
