export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const mapId = url.searchParams.get('mapId');

    if (!mapId) {
      return new Response(JSON.stringify({ error: 'Missing mapId parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const kv = context.env.BLV_MINDMAP;
    if (!kv) {
      return new Response(JSON.stringify({ error: 'KV namespace not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await kv.get(mapId);

    if (!data) {
      return new Response(JSON.stringify({ error: 'Map not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const parsed = JSON.parse(data);

    return new Response(JSON.stringify(parsed), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Load error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
