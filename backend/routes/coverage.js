const createCrudRouter = require('./crudFactory');
const { aiQuery } = require('../openrouter');
const auth = require('../middleware/auth');
const columns = ['store_name', 'department', 'day_of_week', 'time_slot', 'min_staff', 'optimal_staff', 'max_staff', 'current_staff', 'coverage_pct', 'status', 'notes'];
const router = createCrudRouter('coverage_plans', columns);

router.post('/ai-analyze', auth, async (req, res) => {
  const { store_name, department, current_staffing, sales_data, season } = req.body;
  const systemPrompt = `You are an expert retail staffing analyst. Analyze store coverage needs based on traffic patterns, sales data, and seasonal trends. Provide detailed staffing recommendations with markdown formatting.`;
  const userPrompt = `Analyze staffing coverage for:
Store: ${store_name}
Department: ${department || 'All departments'}
Current Staffing: ${current_staffing || 'Not specified'}
Sales/Traffic Data: ${sales_data || 'Not specified'}
Season: ${season || 'Current'}

Please provide:
1. Peak hour analysis and recommended staffing levels
2. Department-by-department coverage assessment
3. Understaffed/overstaffed time slots identification
4. Seasonal adjustment recommendations
5. Customer-to-staff ratio analysis
6. Cost impact of recommended changes
7. Action plan for achieving optimal coverage`;

  const aiResult = await aiQuery(systemPrompt, userPrompt);
  res.json(aiResult);
});

module.exports = router;
