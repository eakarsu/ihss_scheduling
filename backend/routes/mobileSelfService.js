// Mobile self-service — claim shifts, swap, request PTO.
const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const router = express.Router();

router.get('/my-shifts', auth, async (req, res) => {
  const r = await pool.query(
    'SELECT * FROM shifts WHERE employee_id = $1 AND start_time > NOW() ORDER BY start_time LIMIT 50',
    [req.user.id]
  ).catch(() => ({ rows: [] }));
  res.json({ shifts: r.rows });
});

router.get('/open-shifts', auth, async (req, res) => {
  const r = await pool.query(
    'SELECT * FROM shifts WHERE employee_id IS NULL AND start_time > NOW() ORDER BY start_time LIMIT 50'
  ).catch(() => ({ rows: [] }));
  res.json({ shifts: r.rows });
});

router.post('/claim-shift/:shiftId', auth, async (req, res) => {
  try {
    const r = await pool.query(
      'UPDATE shifts SET employee_id = $1 WHERE id = $2 AND employee_id IS NULL RETURNING *',
      [req.user.id, req.params.shiftId]
    );
    if (!r.rows.length) return res.status(409).json({ error: 'shift not available' });
    res.json({ ok: true, shift: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/swap-request', auth, async (req, res) => {
  const { shiftId, withEmployeeId } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO swap_requests (requester_id, shift_id, target_employee_id, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, shiftId, withEmployeeId, 'pending']
    );
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/pto-request', auth, async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;
    if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate required' });
    const r = await pool.query(
      'INSERT INTO time_off (employee_id, start_date, end_date, reason, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, startDate, endDate, reason || null, 'pending']
    ).catch(e => ({ rows: [], error: e.message }));
    if (r.error) return res.status(500).json({ error: r.error });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
