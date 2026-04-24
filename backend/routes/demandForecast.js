const createCrudRouter = require('./crudFactory');
const { aiQuery } = require('../openrouter');
const auth = require('../middleware/auth');
const columns = ['store_name', 'forecast_date', 'department', 'predicted_traffic', 'predicted_sales', 'recommended_staff', 'confidence_level', 'factors', 'season', 'status', 'notes'];
const router = createCrudRouter('demand_forecasts', columns);

router.post('/ai-forecast', auth, async (req, res) => {
  const { store_name, forecast_period, historical_data, events, season } = req.body;
  const systemPrompt = `You are an expert retail demand forecasting analyst. Predict customer traffic, sales volumes, and staffing needs using historical patterns and external factors. Format your response with clear markdown tables and charts.`;
  const userPrompt = `Forecast demand for:
Store: ${store_name}
Forecast Period: ${forecast_period || 'Next 2 weeks'}
Historical Data: ${historical_data || 'Average retail patterns'}
Upcoming Events: ${events || 'None specified'}
Season: ${season || 'Current'}

Please provide:
1. Daily traffic prediction for the forecast period
2. Hourly demand curves for peak days
3. Department-level breakdown
4. Staffing recommendations per day/shift
5. External factors impact (weather, events, holidays)
6. Confidence intervals for predictions
7. Comparison with same period last year`;

  const aiResult = await aiQuery(systemPrompt, userPrompt);
  res.json(aiResult);
});

module.exports = router;
