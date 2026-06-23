import { getCollection } from '../../db';

export async function onRequestPut(context: any) {
  try {
    const { id } = context.params;
    const body = await context.request.json();
    const collection = await getCollection('categories');
    
    const result = await collection.findOneAndUpdate(
      { id },
      { $set: { ...body, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    
    if (!result.value) {
      return new Response(JSON.stringify({ error: 'Category not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify(result.value), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return new Response(JSON.stringify({ error: 'Failed to update category' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestDelete(context: any) {
  try {
    const { id } = context.params;
    const collection = await getCollection('categories');
    
    const result = await collection.deleteOne({ id });
    
    if (result.deletedCount === 0) {
      return new Response(JSON.stringify({ error: 'Category not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete category' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
