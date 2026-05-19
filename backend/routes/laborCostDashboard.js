// Real-time labor cost dashboard vs. forecast.
const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const router = express.Router();

router.get('/today/:storeId', auth, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const shifts = await pool.query(
      "SELECT s.*, e.hourly_rate FROM shifts s LEFT JOIN employees e ON s.employee_id = e.id WHERE s.store_id = $1 AND s.start_time >= $2",
      [req.params.storeId, today]
    ).catch(() => ({ rows: [] }));
    let actualCost = 0, scheduledCost = 0;
    for (const s of shifts.rows) {
      const hrs = (new Date(s.end_time) - new Date(s.start_time)) / 3600000;
      const rate = Number(s.hourly_rate || 18);
      scheduledCost += hrs * rate;
      if (s.status === 'completed') actualCost += hrs * rate;
    }
    const forecast = await pool.query(
      "SELECT SUM(forecast_dollars) as total FROM demand_forecasts WHERE store_id = $1 AND forecast_date = CURRENT_DATE",
      [req.params.storeId]
    ).catch(() => ({ rows: [{ total: 0 }] }));
    const sales = Number(forecast.rows[0]?.total || 0);
    res.json({
      storeId: req.params.storeId,
      date: today.toISOString().slice(0, 10),
      actualCost: Math.round(actualCost),
      scheduledCost: Math.round(scheduledCost),
      forecastSales: sales,
      laborToSalesPct: sales ? Number(((actualCost / sales) * 100).toFixed(1)) : null
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/trend/:storeId', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT DATE(start_time) as day, SUM((EXTRACT(EPOCH FROM (end_time - start_time))/3600) * COALESCE(e.hourly_rate, 18)) as cost
      FROM shifts s LEFT JOIN employees e ON s.employee_id = e.id
      WHERE s.store_id = $1 AND s.start_time > NOW() - INTERVAL '30 days'
      GROUP BY day ORDER BY day
    `, [req.params.storeId]).catch(() => ({ rows: [] }));
    res.json({ days: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
