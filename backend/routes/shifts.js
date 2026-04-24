const createCrudRouter = require('./crudFactory');
const { aiQuery } = require('../openrouter');
const auth = require('../middleware/auth');
const columns = ['store_name', 'employee_name', 'role', 'shift_date', 'start_time', 'end_time', 'hours', 'break_minutes', 'department', 'status', 'notes'];
const router = createCrudRouter('shifts', columns);

router.post('/ai-optimize', auth, async (req, res) => {
  const { store_name, week_start, constraints, employee_count, departments } = req.body;
  const systemPrompt = `You are an expert retail workforce scheduling optimizer. Create optimal shift schedules that balance employee preferences, labor laws, coverage requirements, and cost efficiency. Format your response with clear markdown headers, tables, and actionable recommendations.`;
  const userPrompt = `Optimize the shift schedule for:
Store: ${store_name}
Week Starting: ${week_start || 'Next Monday'}
Employee Count: ${employee_count || 'Not specified'}
Departments: ${departments || 'All departments'}
Constraints: ${constraints || 'Standard retail hours'}

Please provide:
1. Optimized weekly schedule grid (Mon-Sun)
2. Peak coverage hours analysis
3. Labor cost optimization recommendations
4. Break scheduling compliance
5. Overtime avoidance strategies
6. Cross-training opportunities for flexibility
7. Weekend/holiday rotation fairness analysis`;

  const aiResult = await aiQuery(systemPrompt, userPrompt);
  res.json(aiResult);
});

module.exports = router;
