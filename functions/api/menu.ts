import { getCollection } from '../db';

export async function onRequestGet(context: any) {
  try {
    const collection = await getCollection('menu_items');
    const items = await collection.find({}).toArray();
    
    return new Response(JSON.stringify(items), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch menu items' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json();
    const collection = await getCollection('menu_items');
    
    const newItem = {
      ...body,
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
    return new Response(JSON.stringify({ error: 'Failed to create menu item' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
