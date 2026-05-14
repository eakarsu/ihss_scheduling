const express = require('express');
const auth = require('../middleware/auth');
const { aiQuery } = require('../openrouter');

const router = express.Router();

/**
 * Wrap aiQuery and translate "no key configured" responses to HTTP 503
 * so the frontend can show a deterministic banner.
 */
async function aiQuery503(req, res, systemPrompt, userPrompt) {
  if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your_openrouter_api_key_here') {
    res.status(503).json({
      success: false,
      result: 'AI service unavailable: OPENROUTER_API_KEY is not configured on the backend.',
    });
    return null;
  }
  const out = await aiQuery(systemPrompt, userPrompt);
  if (!out || (out.success === false && /api key/i.test(out.result || ''))) {
    res.status(503).json({ success: false, result: out?.result || 'AI service unavailable.' });
    return null;
  }
  return out;
}

// Aggregate AI dashboard — combines forecast + turnover-risk + compliance early-warning
// signals into a single executive narrative + KPI roll-up.
router.post('/ai-aggregate', auth, async (req, res) => {
  try {
    const {
      forecast = {},
      turnover_signals = [],
      compliance_signals = [],
      coverage_gaps = [],
      timeframe = 'next 14 days',
    } = req.body || {};

    const systemPrompt = `You are an executive workforce-analytics agent for an IHSS / retail multi-store scheduling platform. Combine demand-forecast, staff-turnover, labor-compliance, and coverage signals into a single dashboard narrative for an operations director. Respond with strict JSON only of the form: {"summary": <string>, "headline_kpis": [{"label": <string>, "value": <string>, "trend": "up|down|flat"}], "top_risks": [{"category": "demand|turnover|compliance|coverage", "store_name": <string-or-null>, "severity": "low|medium|high|critical", "narrative": <string>, "recommended_action": <string>}], "priorities_next_14d": [<string>], "confidence": "low|medium|high"}.`;

    const userPrompt = `Timeframe: ${timeframe}

Demand forecast:
${JSON.stringify(forecast, null, 2)}

Turnover signals (per employee or rolled up):
${JSON.stringify(turnover_signals, null, 2)}

Labor-compliance early-warning signals:
${JSON.stringify(compliance_signals, null, 2)}

Coverage gaps:
${JSON.stringify(coverage_gaps, null, 2)}`;

    const out = await aiQuery503(req, res, systemPrompt, userPrompt);
    if (!out) return;
    res.json(out);
  } catch (err) {
    res.status(500).json({ success: false, result: err.message });
  }
});

// Per-store turnover-risk roll-up — aggregates individual employee risks into a store-level view.
router.post('/ai-store-turnover-rollup', auth, async (req, res) => {
  try {
    const { store_name, employees = [], recent_metrics = {} } = req.body || {};
    if (!store_name) {
      return res.status(400).json({ success: false, result: 'store_name is required' });
    }

    const systemPrompt = `You are an HR analytics agent. Aggregate per-employee turnover signals into a single store-level turnover-risk roll-up. Respond with strict JSON only of the form: {"store_name": <string>, "store_turnover_risk_pct": <0-100>, "trend": "improving|stable|worsening", "high_risk_employee_count": <int>, "top_risk_drivers": [<string>], "recommended_store_actions": [<string>], "by_role_breakdown": [{"role": <string>, "risk_pct": <0-100>, "count": <int>}], "confidence": "low|medium|high"}.`;

    const userPrompt = `Store: ${store_name}

Employees with their individual signals:
${JSON.stringify(employees, null, 2)}

Recent store metrics (vacancy rate, recent exits, internal moves, etc.):
${JSON.stringify(recent_metrics, null, 2)}`;

    const out = await aiQuery503(req, res, systemPrompt, userPrompt);
    if (!out) return;
    res.json(out);
  } catch (err) {
    res.status(500).json({ success: false, result: err.message });
  }
});

module.exports = router;
