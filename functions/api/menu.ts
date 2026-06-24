import { getCollection } from '../db';
import { getTenantIdFromRequest } from '../utils/jwt';

export async function onRequestGet(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const collection = await getCollection('menu_items');
    const items = await collection.find({ tenantId }).toArray();
    
    return new Response(JSON.stringify(items), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch menu items';
    const status = errorMessage.includes('Unauthorized') ? 401 : 500;
    return new Response(JSON.stringify({ error: errorMessage }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context: any) {
  try {
    const tenantId = getTenantIdFromRequest(context.request);
    const body = await context.request.json();
    const collection = await getCollection('menu_items');
    
    const newItem = {
      ...body,
      tenantId,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await collection.insertOne(newItem);
    
    return new Response(JSON.stringify(newItem), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error creating menu item:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create menu item';
    const status = errorMessage.includes('Unauthorized') ? 401 : 500;
    return new Response(JSON.stringify({ error: errorMessage }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
