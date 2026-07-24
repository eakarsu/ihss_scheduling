const assert = require('node:assert/strict');
const test = require('node:test');
const { requestOperationalReadiness } = require('../lib/openrouter');

test('OpenRouter response includes substantive content and provider receipt', async () => {
  const originalFetch = global.fetch;
  process.env.OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
  process.env.OPENROUTER_API_KEY = 'test-key';
  process.env.OPENROUTER_MODEL = 'test-model';
  global.fetch = async (_url, options) => {
    assert.match(options.headers.authorization, /Bearer test-key/);
    return new Response(JSON.stringify({
      id: 'generation-123', model: 'provider/test-model',
      choices: [{ message: { content: 'Verify access authorization; retain handoff evidence; escalate to clinician review.' } }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const evidence = await requestOperationalReadiness('De-identified caregiver handoff and scheduling workflow');
    assert.equal(evidence.providerReceipt.requestId, 'generation-123');
    assert.match(evidence.result, /handoff evidence/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('OpenRouter integration rejects noncanonical base URL', async () => {
  process.env.OPENROUTER_BASE_URL = 'https://example.invalid/api/v1';
  await assert.rejects(
    () => requestOperationalReadiness('De-identified caregiver handoff and scheduling workflow'),
    /canonical OpenRouter API endpoint/,
  );
});
