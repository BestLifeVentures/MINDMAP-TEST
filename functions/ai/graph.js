export async function onRequestPost(context) {
  try {
    const { mode, instruction, graph, selection } = await context.request.json();

    if (!mode || !instruction) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKey = context.env.claude;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let prompt = '';

    if (mode === 'generate') {
      prompt = buildGeneratePrompt(instruction, graph, selection);
    } else if (mode === 'update') {
      prompt = buildUpdatePrompt(instruction, graph, selection);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid mode' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Try to get valid JSON from Claude
    let result = null;
    let attempts = 0;
    const maxAttempts = 2;

    while (!result && attempts < maxAttempts) {
      attempts++;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Anthropic API error:', error);
        return new Response(JSON.stringify({ error: 'AI request failed' }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const data = await response.json();
      const text = data.content[0].text;

      // Try to parse JSON from response
      try {
        // Extract JSON from response (may be wrapped in markdown code blocks)
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          result = JSON.parse(jsonStr);

          // Validate structure
          if (!result.nodes || !Array.isArray(result.nodes)) {
            result = null;
            if (attempts < maxAttempts) {
              prompt = "The response was invalid. Please return ONLY valid JSON with 'nodes' and 'edges' arrays. No explanations.";
            }
          }
        } else if (attempts < maxAttempts) {
          prompt = "Please return ONLY valid JSON in the format {\"nodes\": [...], \"edges\": [...]}. No explanations or markdown.";
        }
      } catch (e) {
        if (attempts < maxAttempts) {
          prompt = `The JSON was invalid. Please fix and return only valid JSON: ${e.message}`;
        }
      }
    }

    if (!result) {
      return new Response(JSON.stringify({ error: 'Failed to generate valid graph data' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Graph error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function buildGeneratePrompt(instruction, graph, selection) {
  const selectedNodes = selection?.nodeIds
    ? graph.nodes.filter(n => selection.nodeIds.includes(n.id))
    : [];

  return `You are helping build a business ecosystem mind map for BLV (Best Life Ventures).

CURRENT GRAPH CONTEXT:
${JSON.stringify({ nodes: graph.nodes.slice(0, 30), edges: graph.edges.slice(0, 30) }, null, 2)}

${selectedNodes.length > 0 ? `SELECTED NODES:\n${JSON.stringify(selectedNodes, null, 2)}\n` : ''}

USER INSTRUCTION: ${instruction}

REQUIREMENTS:
1. Generate up to 10 new nodes and their connections
2. Maximum depth of 3 levels from root or selected node
3. Each node must have:
   - id: unique string (use format: category_name_timestamp)
   - label: short descriptive label
   - level: "primary" | "secondary" | "detail"
   - visibility: "internal" | "external" | "both"
   - avatarTag: one of ["BLV", "Creators", "Companies", "Foundations", "Consumers", "Experts", "Distribution Channels", "Miles"]
   - internalTag: one of ["Brand", "Dreamworks", "Media", "Offer", "Process", "People", "Distribution"]
   - colorGroup: one of ["blv", "brand", "dreamworks", "media", "people", "process"]
   - x: number (position, spread them out reasonably)
   - y: number (position, spread them out reasonably)
4. Each edge must have:
   - source: node id
   - target: node id
   - controlPoint: null

Return ONLY valid JSON in this exact format:
{
  "nodes": [...],
  "edges": [...]
}

No explanations, no markdown, just the JSON.`;
}

function buildUpdatePrompt(instruction, graph, selection) {
  const selectedNodes = selection?.nodeIds
    ? graph.nodes.filter(n => selection.nodeIds.includes(n.id))
    : [];

  return `You are helping update nodes in a business ecosystem mind map for BLV (Best Life Ventures).

SELECTED NODES TO UPDATE:
${JSON.stringify(selectedNodes, null, 2)}

USER INSTRUCTION: ${instruction}

REQUIREMENTS:
1. Modify ONLY the selected nodes unless explicitly instructed otherwise
2. Preserve the node structure:
   - id: keep original
   - label: can update
   - level: "primary" | "secondary" | "detail"
   - visibility: "internal" | "external" | "both"
   - avatarTag: one of ["BLV", "Creators", "Companies", "Foundations", "Consumers", "Experts", "Distribution Channels", "Miles"]
   - internalTag: one of ["Brand", "Dreamworks", "Media", "Offer", "Process", "People", "Distribution"]
   - colorGroup: one of ["blv", "brand", "dreamworks", "media", "people", "process"]
   - x, y: preserve positions unless moving
3. You can add new edges if instructed

Return ONLY valid JSON with updated nodes and any new edges:
{
  "nodes": [...],
  "edges": [...]
}

No explanations, no markdown, just the JSON.`;
}
