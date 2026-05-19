// Turnover-risk model with retention playbooks.
const express = require('express');
const auth = require('../middleware/auth');
const { aiQuery } = require('../openrouter');
const pool = require('../db');
const router = express.Router();

function risk(employee, signals = {}) {
  // Heuristic blend; can be replaced by a trained model later.
  let r = 0;
  if ((signals.consecutiveShifts || 0) > 6) r += 0.25;
  if ((signals.lateCount || 0) > 2) r += 0.15;
  if ((signals.peerTurnoverRate || 0) > 0.3) r += 0.2;
  if ((signals.tenureMonths || 24) < 6) r += 0.1;
  if ((signals.satisfactionScore || 5) < 3) r += 0.3;
  return Number(Math.min(1, r).toFixed(2));
}

// POST /api/turnover-risk/score — score a single employee or a batch.
router.post('/score', auth, async (req, res) => {
  try {
    const batch = Array.isArray(req.body) ? req.body : [req.body];
    const out = batch.map(item => ({
      employeeId: item.employeeId,
      risk: risk(item.employee || {}, item.signals || {}),
      signals: item.signals || {}
    }));
    res.json({ scored: out.length, results: out });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/store/:storeId', auth, async (req, res) => {
  try {
    const emps = await pool.query('SELECT * FROM employees WHERE store_id = $1', [req.params.storeId]).catch(() => ({ rows: [] }));
    const flagged = emps.rows.map(e => ({
      employeeId: e.id,
      name: e.name,
      risk: risk(e, { tenureMonths: e.tenure_months, satisfactionScore: e.satisfaction_score })
    })).filter(e => e.risk > 0.4).sort((a, b) => b.risk - a.risk);
    res.json({ store: req.params.storeId, flagged });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/turnover-risk/playbook — generate a retention playbook for an employee.
router.post('/playbook', auth, async (req, res) => {
  try {
    const { employee, score } = req.body;
    if (!employee) return res.status(400).json({ error: 'employee required' });
    const out = await aiQuery(
      'You are an HR retention specialist. Return JSON {"actions":[{"step":string,"owner":string,"due":string}]}',
      `Employee: ${JSON.stringify(employee)}. Risk score: ${score}.`
    );
    res.json({ raw: out.result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
