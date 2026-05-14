const createCrudRouter = require('./crudFactory');
const { aiQuery } = require('../openrouter');
const auth = require('../middleware/auth');
const columns = ['store_name', 'compliance_type', 'regulation', 'description', 'audit_date', 'auditor', 'result', 'corrective_action', 'deadline', 'status', 'notes'];
const router = createCrudRouter('labor_compliance', columns);

router.post('/ai-audit', auth, async (req, res) => {
  const { store_name, state, employee_count, issues } = req.body;
  const systemPrompt = `You are an expert labor law compliance analyst specializing in retail workforce management. Analyze scheduling practices for compliance with federal and state labor laws including FLSA, predictive scheduling laws, break requirements, and overtime rules. Format response with markdown.`;
  const userPrompt = `Audit labor compliance for:
Store: ${store_name}
State: ${state || 'Not specified'}
Employee Count: ${employee_count || 'Not specified'}
Known Issues: ${issues || 'General audit'}

Please provide:
1. Federal labor law compliance checklist (FLSA)
2. State-specific scheduling law requirements
3. Break and meal period compliance review
4. Overtime calculation compliance
5. Minor labor law requirements (if applicable)
6. Predictive scheduling law analysis
7. Record-keeping requirements
8. Recommended corrective actions
9. Penalty exposure assessment`;

  const aiResult = await aiQuery(systemPrompt, userPrompt);
  res.json(aiResult);
});

// Audit-driven addition: "Compliance violation early warning".
router.post('/ai-early-warning', auth, async (req, res) => {
  const { store_name, state, upcomingShifts, employees, recentViolations } = req.body || {};
  const systemPrompt = `You are a labor-law compliance early-warning agent. Given upcoming shifts and employee context, predict likely compliance violations BEFORE they occur. Respond with strict JSON only of the form: {"warnings": [{"shift_id": <id-or-null>, "employee_id": <id-or-null>, "rule": <string>, "likelihood": "low|medium|high", "predicted_violation_date": <iso-date-or-null>, "preventive_action": <string>}], "summary": <string>, "high_risk_employees": [<ids>]}.`;
  const userPrompt = `Store: ${store_name || 'unspecified'}
State: ${state || 'unspecified'}

Upcoming shifts (next 14d):
${JSON.stringify(upcomingShifts || [], null, 2)}

Employees:
${JSON.stringify(employees || [], null, 2)}

Recent violations (for trend context):
${JSON.stringify(recentViolations || [], null, 2)}`;

  const aiResult = await aiQuery(systemPrompt, userPrompt);
  res.json(aiResult);
});

module.exports = router;
