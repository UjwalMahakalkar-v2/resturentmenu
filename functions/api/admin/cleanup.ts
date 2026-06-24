import { getCollection } from '../../db';

/**
 * Temporary admin cleanup utility.
 * DELETE /api/admin/cleanup?slug=xxx  — removes a tenant and all related data by slug.
 * GET  /api/admin/cleanup             — lists all tenants and users currently in DB.
 */

export async function onRequestGet(context: any) {
  try {
    const [tenantsCol, usersCol] = await Promise.all([
      getCollection('tenants'),
      getCollection('users'),
    ]);
    const [tenants, users] = await Promise.all([
      tenantsCol.find({}).toArray(),
      usersCol.find({}).toArray(),
    ]);

    return new Response(JSON.stringify({
      tenants: tenants.map((t: any) => ({ id: t.id, slug: t.slug, name: t.name, status: t.status })),
      users: users.map((u: any) => ({ id: u.id, email: u.email, tenantId: u.tenantId, role: u.role })),
    }, null, 2), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestDelete(context: any) {
  try {
    const url = new URL(context.request.url);
    const slug = url.searchParams.get('slug');

    if (!slug) {
      return new Response(JSON.stringify({ error: 'slug query param required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tenantsCol = await getCollection('tenants');
    const tenant = await tenantsCol.findOne({ slug });

    if (!tenant) {
      return new Response(JSON.stringify({ error: `No tenant found with slug "${slug}"` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tenantId = tenant.id;
    const [, usersResult, catsResult, itemsResult] = await Promise.all([
      tenantsCol.deleteOne({ id: tenantId }),
      getCollection('users').then(col => col.deleteMany({ tenantId })),
      getCollection('categories').then(col => col.deleteMany({ tenantId })),
      getCollection('menu_items').then(col => col.deleteMany({ tenantId })),
    ]);

    return new Response(JSON.stringify({
      deleted: {
        tenant: tenant.name,
        slug: tenant.slug,
        usersRemoved: usersResult.deletedCount,
        categoriesRemoved: catsResult.deletedCount,
        menuItemsRemoved: itemsResult.deletedCount,
      },
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
