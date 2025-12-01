import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { apiKey, messages, response_format } = JSON.parse(event.body || '{}');

    if (!apiKey) {
      return { statusCode: 400, body: JSON.stringify({ error: { message: 'Missing API Key' } }) };
    }

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "mistral-small",
        messages: messages,
        response_format: response_format
      })
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      body: JSON.stringify(data)
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { message: error.message || 'Internal Server Error' } })
    };
  }
};

