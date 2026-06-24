import { getCollection } from '../db';

export async function onRequestGet(context: any) {
  try {
    const collection = await getCollection('tenants');
    const tenants = await collection.find({}).toArray();
    
    return new Response(JSON.stringify(tenants), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tenants';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json();
    const tenantsCollection = await getCollection('tenants');
    const usersCollection = await getCollection('users');
    
    // Check if slug or subdomain already exists
    const existing = await tenantsCollection.findOne({
      $or: [{ slug: body.slug }, { subdomain: body.subdomain }]
    });
    
    if (existing) {
      return new Response(JSON.stringify({ error: 'Slug or subdomain already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const newTenant = {
      id: `tenant_${crypto.randomUUID()}`,
      slug: body.slug,
      subdomain: body.subdomain || body.slug,
      name: body.name,
      email: body.email,
      phone: body.phone || '',
      address: body.address || '',
      status: 'active',
      subscriptionPlan: body.subscriptionPlan || 'starter',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await tenantsCollection.insertOne(newTenant);
    
    // Create admin user if provided
    if (body.adminEmail && body.adminPassword) {
      const newUser = {
        id: `user_${crypto.randomUUID()}`,
        tenantId: newTenant.id,
        email: body.adminEmail,
        password: body.adminPassword, // In production, hash this!
        name: body.adminName || 'Admin',
        role: 'owner',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await usersCollection.insertOne(newUser);
    }
    
    // Create default categories
    const categoriesCollection = await getCollection('categories');
    const defaultCategories = [
      { id: `cat_${crypto.randomUUID()}`, tenantId: newTenant.id, name: 'Appetizers', description: 'Starters and appetizers', icon: '🥗', order: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: `cat_${crypto.randomUUID()}`, tenantId: newTenant.id, name: 'Main Course', description: 'Main dishes', icon: '🍛', order: 2, createdAt: new Date(), updatedAt: new Date() },
    ];
    await categoriesCollection.insertMany(defaultCategories);
    
    // Create default menu items
    const menuCollection = await getCollection('menu_items');
    const defaultItems = [
      { id: `item_${crypto.randomUUID()}`, tenantId: newTenant.id, name: 'Spring Rolls', description: 'Crispy vegetable spring rolls', price: 120, category: 'Appetizers', image: '', available: true, featured: false, createdAt: new Date(), updatedAt: new Date() },
      { id: `item_${crypto.randomUUID()}`, tenantId: newTenant.id, name: 'Chicken Wings', description: 'Spicy chicken wings', price: 180, category: 'Appetizers', image: '', available: true, featured: false, createdAt: new Date(), updatedAt: new Date() },
      { id: `item_${crypto.randomUUID()}`, tenantId: newTenant.id, name: 'Paneer Butter Masala', description: 'Rich and creamy paneer curry', price: 250, category: 'Main Course', image: '', available: true, featured: true, createdAt: new Date(), updatedAt: new Date() },
      { id: `item_${crypto.randomUUID()}`, tenantId: newTenant.id, name: 'Chicken Biryani', description: 'Aromatic basmati rice with chicken', price: 280, category: 'Main Course', image: '', available: true, featured: true, createdAt: new Date(), updatedAt: new Date() },
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
