// AI schedule optimizer with fairness and fatigue constraints.
const express = require('express');
const auth = require('../middleware/auth');
const { aiQuery } = require('../openrouter');
const pool = require('../db');
const router = express.Router();

// POST /api/schedule-optimizer/optimize — given shifts + employees, produce an assignment.
router.post('/optimize', auth, async (req, res) => {
  try {
    let { shifts, employees, fairnessWeight = 0.5, fatigueWeight = 0.3, skillWeight = 0.2 } = req.body;
    if (!Array.isArray(shifts) || !Array.isArray(employees) || !shifts.length || !employees.length) {
      // Try to pull from DB.
      const s = await pool.query('SELECT * FROM shifts WHERE start_time > NOW() LIMIT 100').catch(() => ({ rows: [] }));
      const e = await pool.query('SELECT * FROM employees LIMIT 100').catch(() => ({ rows: [] }));
      shifts = shifts || s.rows;
      employees = employees || e.rows;
      if (!shifts.length || !employees.length) return res.status(400).json({ error: 'shifts & employees required' });
    }

    const load = Object.fromEntries(employees.map(e => [e.id, 0]));
    const assignments = [];
    for (const sh of shifts) {
      let best = null, bestScore = -1;
      for (const e of employees) {
        const fairness = 1 - (load[e.id] / Math.max(1, shifts.length / employees.length + 1));
        const fatigue = load[e.id] > 5 ? 0 : 1 - load[e.id] / 5;
        const skill = (e.skills || []).includes(sh.required_skill || sh.requiredSkill) ? 1 : 0.5;
        const score = fairness * fairnessWeight + fatigue * fatigueWeight + skill * skillWeight;
        if (score > bestScore) { best = e; bestScore = score; }
      }
      if (best) {
        load[best.id]++;
        assignments.push({ shiftId: sh.id, employeeId: best.id, score: Number(bestScore.toFixed(3)) });
      }
    }

    let narrative = '';
    try {
      const out = await aiQuery(
        'You are a workforce scheduling coach. Provide 3 concise bullets on the schedule quality.',
        `Assignments: ${JSON.stringify(assignments).slice(0, 1500)}. Load: ${JSON.stringify(load)}`
      );
      narrative = out.result;
    } catch {}

    res.json({ assignments, load, narrative });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
