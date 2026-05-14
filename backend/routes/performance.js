const createCrudRouter = require('./crudFactory');
const { aiQuery } = require('../openrouter');
const auth = require('../middleware/auth');
const columns = ['employee_name', 'store_name', 'review_period', 'reviewer', 'overall_rating', 'attendance_score', 'productivity_score', 'teamwork_score', 'goals', 'strengths', 'improvements', 'status'];
const router = createCrudRouter('performance_reviews', columns);

// Audit-driven addition: "Worker performance prediction".
router.post('/ai-predict', auth, async (req, res) => {
  const { employee, history, context } = req.body || {};
  if (!employee) {
    return res.status(400).json({ success: false, result: 'employee is required' });
  }
  const systemPrompt = `You are a workforce performance analyst. Predict the next-period performance scores for this employee given history. Respond with strict JSON only of the form: {"predicted_overall_rating": <1-5 number>, "predicted_attendance_score": <number>, "predicted_productivity_score": <number>, "predicted_teamwork_score": <number>, "trajectory": "rising|stable|declining", "drivers": [<strings>], "coaching_actions": [<strings>], "confidence": "low|medium|high"}.`;
  const userPrompt = `Employee:
${JSON.stringify(employee, null, 2)}

History (most-recent-first):
${JSON.stringify(history || [], null, 2)}

Context:
${JSON.stringify(context || {}, null, 2)}`;

  const aiResult = await aiQuery(systemPrompt, userPrompt);
  res.json(aiResult);
});

module.exports = router;
