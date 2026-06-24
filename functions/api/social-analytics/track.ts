import { getCollection } from '../../db';

export async function onRequestPost(context: any) {
  try {
    const { tenantId, platform } = await context.request.json();
    
    if (!tenantId || !platform) {
      return new Response(JSON.stringify({ error: 'Missing tenantId or platform' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const collection = await getCollection('tenants');
    
    // Increment the click counter for the specific platform
    const updateField = `socialAnalytics.${platform}Clicks`;
    
    await collection.updateOne(
      { id: tenantId },
      { 
        $inc: { [updateField]: 1 },
        $setOnInsert: {
          'socialAnalytics.whatsappClicks': 0,
          'socialAnalytics.instagramClicks': 0,
          'socialAnalytics.facebookClicks': 0,
          'socialAnalytics.twitterClicks': 0,
        }
      },
      { upsert: true }
    );
    
    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error tracking social click:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to track click';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
