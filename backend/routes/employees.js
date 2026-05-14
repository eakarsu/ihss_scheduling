const createCrudRouter = require('./crudFactory');
const { aiQuery } = require('../openrouter');
const auth = require('../middleware/auth');
const columns = ['employee_id', 'first_name', 'last_name', 'email', 'phone', 'role', 'department', 'store_name', 'district_name', 'hire_date', 'hourly_rate', 'employment_type', 'status'];
const router = createCrudRouter('employees', columns);

// Audit-driven addition: "Staff turnover prediction".
router.post('/ai-turnover-risk', auth, async (req, res) => {
  const { employee, recentReviews, recentIncidents, recentTimeOff, peerContext } = req.body || {};
  if (!employee) {
    return res.status(400).json({ success: false, result: 'employee is required' });
  }
  const systemPrompt = `You are an HR analytics agent for a retail/IHSS workforce. Predict the likelihood that this employee will voluntarily leave in the next 90 days. Respond with strict JSON only of the form: {"turnover_risk_pct": <0-100>, "trend": "improving|stable|worsening", "key_signals": [<strings>], "retention_actions": [<strings>], "confidence": "low|medium|high"}.`;
  const userPrompt = `Employee:
${JSON.stringify(employee, null, 2)}

Recent reviews:
${JSON.stringify(recentReviews || [], null, 2)}

Recent incidents:
${JSON.stringify(recentIncidents || [], null, 2)}

Recent time off:
${JSON.stringify(recentTimeOff || [], null, 2)}

Peer/store context:
${JSON.stringify(peerContext || {}, null, 2)}`;

  const aiResult = await aiQuery(systemPrompt, userPrompt);
  res.json(aiResult);
});

module.exports = router;
