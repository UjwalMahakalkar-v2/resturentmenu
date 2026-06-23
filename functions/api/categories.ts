import { getCollection } from '../db';

export async function onRequestGet(context: any) {
  try {
    const collection = await getCollection('categories');
    const categories = await collection.find({}).sort({ order: 1 }).toArray();
    
    return new Response(JSON.stringify(categories), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch categories' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json();
    const collection = await getCollection('categories');
    
    const newCategory = {
      ...body,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await collection.insertOne(newCategory);
    
    return new Response(JSON.stringify(newCategory), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return new Response(JSON.stringify({ error: 'Failed to create category' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
