export async function onRequestPost(context) {
  try {
    const { mapId, graph, chatHistory } = await context.request.json();

    if (!mapId || !graph) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
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

    const data = {
      graph,
      chatHistory: chatHistory || [],
      updatedAt: new Date().toISOString()
    };

    await kv.put(mapId, JSON.stringify(data));

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Save error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
