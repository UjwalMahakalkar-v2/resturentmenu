import { getCollection } from '../db';
import { getUserFromRequest } from '../utils/jwt';

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Validation helpers
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PHONE_RE = /^[+\d\s\-().]{7,20}$/;

function validateTenantBody(body: any): string | null {
  if (!body || typeof body !== 'object') return 'Request body is required';

  const { name, slug, email, phone, subdomain, adminEmail, adminPassword } = body;

  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    return 'name must be between 2 and 100 characters';
  }

  if (!slug || typeof slug !== 'string') {
    return 'slug is required';
  }
  if (!SLUG_RE.test(slug)) {
    return 'slug must be lowercase alphanumeric with hyphens only (e.g. my-restaurant)';
  }
  if (slug.length > 63) {
    return 'slug must be 63 characters or fewer';
  }

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return 'A valid email address is required';
  }

  if (phone && (typeof phone !== 'string' || !PHONE_RE.test(phone))) {
    return 'phone must be a valid phone number';
  }

  if (subdomain !== undefined) {
    if (typeof subdomain !== 'string') return 'subdomain must be a string';
    if (!SLUG_RE.test(subdomain)) {
      return 'subdomain must be lowercase alphanumeric with hyphens only';
    }
    if (subdomain.length > 63) return 'subdomain must be 63 characters or fewer';
  }

  if (adminEmail && (typeof adminEmail !== 'string' || !EMAIL_RE.test(adminEmail))) {
    return 'adminEmail must be a valid email address';
  }

  if (adminPassword !== undefined) {
    if (typeof adminPassword !== 'string' || adminPassword.length < 8) {
      return 'adminPassword must be at least 8 characters';
    }
    if (adminPassword.length > 128) {
      return 'adminPassword must be 128 characters or fewer';
    }
  }

  return null;
}

export async function onRequestGet(context: any) {
  try {
    const caller = getUserFromRequest(context.request);
    if (caller.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden — super_admin only' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    const collection = await getCollection('tenants');
    const tenants = await collection.find({}).toArray();

    return new Response(JSON.stringify(tenants), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tenants';
    const status = errorMessage.includes('Unauthorized') ? 401 : 500;
    return new Response(JSON.stringify({ error: errorMessage }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context: any) {
  try {
    const caller = getUserFromRequest(context.request);
    if (caller.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden — super_admin only' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    let body: any;
    try {
      body = await context.request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate all inputs before touching the database
    const validationError = validateTenantBody(body);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Sanitize string fields
    const name = body.name.trim();
    const slug = body.slug.toLowerCase().trim();
    const subdomain = (body.subdomain || slug).toLowerCase().trim();
    const email = body.email.toLowerCase().trim();
    const phone = body.phone ? body.phone.trim() : '';
    const address = typeof body.address === 'string' ? body.address.trim().slice(0, 500) : '';
    const subscriptionPlan = ['starter', 'business', 'premium'].includes(body.subscriptionPlan)
      ? body.subscriptionPlan
      : 'starter';

    const tenantsCollection = await getCollection('tenants');
    const usersCollection = await getCollection('users');

    // Check if slug or subdomain already exists
    const existing = await tenantsCollection.findOne({
      $or: [{ slug }, { subdomain }]
    });

    if (existing) {
      return new Response(JSON.stringify({ error: 'Slug or subdomain already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if admin email already exists
    if (body.adminEmail) {
      const adminEmail = body.adminEmail.toLowerCase().trim();
      const existingUser = await usersCollection.findOne({ email: adminEmail });
      if (existingUser) {
        return new Response(JSON.stringify({ error: 'Admin email already in use' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const newTenant = {
      id: `tenant_${crypto.randomUUID()}`,
      slug,
      subdomain,
      name,
      email,
      phone,
      address,
      status: 'active',
      subscriptionPlan,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await tenantsCollection.insertOne(newTenant);

    // Create admin user if provided
    if (body.adminEmail && body.adminPassword) {
      const adminEmail = body.adminEmail.toLowerCase().trim();
      const adminName = typeof body.adminName === 'string' ? body.adminName.trim().slice(0, 100) : 'Admin';
      const newUser = {
        id: `user_${crypto.randomUUID()}`,
        tenantId: newTenant.id,
        email: adminEmail,
        password: body.adminPassword, // TODO: hash with bcrypt before storing
        name: adminName,
        role: 'owner',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await usersCollection.insertOne(newUser);
    }

    // Create default categories — capture IDs first so menu items can reference them
    const appetizersId = `cat_${crypto.randomUUID()}`;
    const mainCourseId = `cat_${crypto.randomUUID()}`;
    const categoriesCollection = await getCollection('categories');
    const defaultCategories = [
      { id: appetizersId, tenantId: newTenant.id, name: 'Appetizers', description: 'Starters and appetizers', icon: '🥗', order: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: mainCourseId, tenantId: newTenant.id, name: 'Main Course', description: 'Main dishes', icon: '🍛', order: 2, createdAt: new Date(), updatedAt: new Date() },
    ];
    await categoriesCollection.insertMany(defaultCategories);

    // Create default menu items — reference category by ID
    const menuCollection = await getCollection('menu_items');
    const defaultItems = [
      { id: `item_${crypto.randomUUID()}`, tenantId: newTenant.id, name: 'Spring Rolls', description: 'Crispy vegetable spring rolls', price: 120, category: appetizersId, type: 'veg', image: '', available: true, popular: false, createdAt: new Date(), updatedAt: new Date() },
      { id: `item_${crypto.randomUUID()}`, tenantId: newTenant.id, name: 'Chicken Wings', description: 'Spicy chicken wings', price: 180, category: appetizersId, type: 'non-veg', image: '', available: true, popular: false, createdAt: new Date(), updatedAt: new Date() },
      { id: `item_${crypto.randomUUID()}`, tenantId: newTenant.id, name: 'Paneer Butter Masala', description: 'Rich and creamy paneer curry', price: 250, category: mainCourseId, type: 'veg', image: '', available: true, popular: true, createdAt: new Date(), updatedAt: new Date() },
      { id: `item_${crypto.randomUUID()}`, tenantId: newTenant.id, name: 'Chicken Biryani', description: 'Aromatic basmati rice with chicken', price: 280, category: mainCourseId, type: 'non-veg', image: '', available: true, popular: true, createdAt: new Date(), updatedAt: new Date() },
    ];
    await menuCollection.insertMany(defaultItems);

    return new Response(JSON.stringify(newTenant), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create tenant';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
