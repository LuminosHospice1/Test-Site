exports.handler = async function (event, context) {

  // ── CORS headers ────────────────────────────────────────────────
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // ── Get API key from environment ────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY environment variable is not set');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'API key not configured. Please set ANTHROPIC_API_KEY in Netlify environment variables.' })
    };
  }

  // ── Parse request body ──────────────────────────────────────────
  let prompt, max_tokens, system;
  try {
    const body = JSON.parse(event.body);
    prompt = body.prompt;
    max_tokens = body.max_tokens || 1500;
    system = body.system || null;
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid request body' })
    };
  }

  if (!prompt) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing prompt in request body' })
    };
  }

  // ── Call Anthropic API ──────────────────────────────────────────
  try {
    const requestBody = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: Math.min(max_tokens, 2000), // cap at 2000 for cost control
      messages: [{ role: 'user', content: prompt }]
    };

    // Add system prompt if provided
    if (system) {
      requestBody.system = system;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic API error:', data);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: data.error?.message || 'Anthropic API error',
          type: data.error?.type || 'api_error'
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error: ' + err.message })
    };
  }
};
