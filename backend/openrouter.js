const fetch = require('node-fetch');
require('dotenv').config({ path: __dirname + '/../.env' });

async function aiQuery(systemPrompt, userPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    return {
      success: false,
      result: 'OpenRouter API key not configured. Please add your API key to the .env file.',
    };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:4000',
        'X-Title': 'IHSS Scheduling Platform',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    const data = await response.json();
    if (data.error) {
      return { success: false, result: data.error.message || 'AI API error' };
    }

    const content = data.choices?.[0]?.message?.content || 'No response from AI';
    return { success: true, result: content, model: data.model, usage: data.usage };
  } catch (err) {
    return { success: false, result: 'Failed to connect to AI service: ' + err.message };
  }
}

module.exports = { aiQuery };
