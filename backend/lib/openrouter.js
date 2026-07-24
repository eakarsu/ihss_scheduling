const CANONICAL_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

async function requestOperationalReadiness(workflowSummary) {
  const baseUrl = (process.env.OPENROUTER_BASE_URL || CANONICAL_OPENROUTER_BASE_URL).replace(/\/$/, '');
  if (baseUrl !== CANONICAL_OPENROUTER_BASE_URL) throw new Error('OPENROUTER_BASE_URL must use the canonical OpenRouter API endpoint');
  const apiKey = String(process.env.OPENROUTER_API_KEY || '').trim();
  const model = String(process.env.OPENROUTER_MODEL || '').trim();
  if (!apiKey || !model) throw new Error('OpenRouter credentials and model must be configured');

  const response = await fetch(`${CANONICAL_OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'http-referer': process.env.FRONTEND_URL || 'http://127.0.0.1',
      'x-title': 'IHSS Care Operations Readiness',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: 'You review de-identified care-operations workflows only. Do not make clinical decisions, infer patient facts, or invent evidence. Give concise operational controls.',
        },
        {
          role: 'user',
          content: `Review this de-identified scheduling workflow: ${workflowSummary}. Return exactly three short controls covering authorization, handoff evidence, and clinician escalation.`,
        },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`OpenRouter request failed with status ${response.status}`);
  const requestId = typeof payload?.id === 'string' ? payload.id.trim() : '';
  const providerModel = typeof payload?.model === 'string' ? payload.model.trim() : '';
  const result = typeof payload?.choices?.[0]?.message?.content === 'string' ? payload.choices[0].message.content.trim() : '';
  if (!requestId || !providerModel || result.length < 40) throw new Error('OpenRouter response did not include substantive provider evidence');
  return {
    result,
    providerReceipt: {
      provider: 'openrouter', requestId, model: providerModel, completedAt: new Date().toISOString(),
    },
  };
}

module.exports = { CANONICAL_OPENROUTER_BASE_URL, requestOperationalReadiness };
