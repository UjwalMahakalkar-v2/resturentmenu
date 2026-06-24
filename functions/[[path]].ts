export async function onRequest(context: any) {
  try {
    const response = await context.env.ASSETS.fetch(context.request);
    
    if (response.status === 404) {
      const indexResponse = await context.env.ASSETS.fetch(new Request(new URL('/', context.request.url)));
      return new Response(indexResponse.body, {
        ...indexResponse,
        status: 200,
        headers: indexResponse.headers
      });
    }
    
    return response;
  } catch (e) {
    return new Response('Not found', { status: 404 });
  }
}
