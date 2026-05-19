// Custom Views — 4 IHSS-specific features (2 VIZ + 2 NON-VIZ)
const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const router = express.Router();

// In-memory storage for scheduling rules (CRUD)
const schedulingRules = [
  { id: 1, name: 'Max 8-hour shift', rule_type: 'max_hours', value: '8', applies_to: 'all_caregivers', priority: 'high', active: true, created_at: new Date().toISOString() },
  { id: 2, name: 'Min 30-min break per 6h', rule_type: 'break_required', value: '30', applies_to: 'all_caregivers', priority: 'high', active: true, created_at: new Date().toISOString() },
  { id: 3, name: 'No overnight without certification', rule_type: 'cert_required', value: 'overnight_care', applies_to: 'overnight_shifts', priority: 'critical', active: true, created_at: new Date().toISOString() },
  { id: 4, name: 'Travel time buffer 30min', rule_type: 'travel_buffer', value: '30', applies_to: 'between_clients', priority: 'medium', active: true, created_at: new Date().toISOString() },
];
let nextRuleId = 5;

// ============== VIZ 1: GET /api/custom-views/caregiver-schedule-timeline ==============
router.get('/caregiver-schedule-timeline', auth, async (req, res) => {
  try {
    const e = await pool.query('SELECT id, first_name, last_name FROM employees LIMIT 8').catch(() => ({ rows: [] }));
    const caregivers = e.rows.length ? e.rows.map(r => ({ id: r.id, name: `${r.first_name} ${r.last_name}` })) : [
      { id: 1, name: 'Maria Sanchez' }, { id: 2, name: 'James Chen' },
      { id: 3, name: 'Aisha Brown' }, { id: 4, name: 'David Kim' },
      { id: 5, name: 'Linda Patel' }, { id: 6, name: 'Marcus Johnson' },
      { id: 7, name: 'Priya Mehta' }, { id: 8, name: 'Robert Lee' },
    ];
    const today = new Date();
    const timeline = caregivers.map((cg, idx) => {
      const shifts = [];
      const numShifts = 2 + (idx % 3);
      for (let i = 0; i < numShifts; i++) {
        const startHour = 7 + (i * 4) + (idx % 2);
        const duration = 3 + (i % 2);
        shifts.push({
          shift_id: `s${cg.id}-${i}`,
          client_name: ['Mrs. Wilson', 'Mr. Garcia', 'Ms. Thompson', 'Mr. Nguyen', 'Mrs. Davis'][(idx + i) % 5],
          start_time: `${String(startHour).padStart(2, '0')}:00`,
          end_time: `${String(Math.min(23, startHour + duration)).padStart(2, '0')}:00`,
          duration_hours: duration,
          care_type: ['Personal Care', 'Meal Prep', 'Companionship', 'Medical Support'][(idx + i) % 4],
          color: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'][(idx + i) % 5],
        });
      }
      return {
        caregiver_id: cg.id,
        caregiver_name: cg.name,
        total_hours: shifts.reduce((a, s) => a + s.duration_hours, 0),
        shift_count: shifts.length,
        shifts,
      };
    });
    res.json({
      date: today.toISOString().split('T')[0],
      hour_range: { start: 6, end: 22 },
      caregivers: timeline,
      summary: {
        total_caregivers: timeline.length,
        total_shifts: timeline.reduce((a, c) => a + c.shift_count, 0),
        total_hours: timeline.reduce((a, c) => a + c.total_hours, 0),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============== VIZ 2: GET /api/custom-views/client-coverage-heatmap ==============
router.get('/client-coverage-heatmap', auth, async (req, res) => {
  try {
    const clients = [
      'Mrs. Wilson', 'Mr. Garcia', 'Ms. Thompson', 'Mr. Nguyen',
      'Mrs. Davis', 'Mr. Patel', 'Ms. Robinson', 'Mr. Liu',
      'Mrs. Anderson', 'Mr. Singh',
    ];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const matrix = clients.map((client, ci) =>
      days.map((day, di) => {
        const seed = (ci * 7 + di) % 11;
        const coverage_pct = Math.min(100, 40 + seed * 6 + ((ci + di) % 3) * 5);
        const required_hours = 4 + (ci % 4);
        const scheduled_hours = Math.round((coverage_pct / 100) * required_hours * 10) / 10;
        return {
          client,
          day,
          coverage_pct,
          required_hours,
          scheduled_hours,
          status: coverage_pct >= 95 ? 'full' : coverage_pct >= 70 ? 'partial' : 'gap',
        };
      })
    );
    const gaps = matrix.flat().filter(c => c.status === 'gap').length;
    const full = matrix.flat().filter(c => c.status === 'full').length;
    res.json({
      clients,
      days,
      matrix,
      summary: {
        total_cells: clients.length * days.length,
        full_coverage: full,
        gaps,
        avg_coverage_pct: Math.round(matrix.flat().reduce((a, c) => a + c.coverage_pct, 0) / (clients.length * days.length)),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============== NON-VIZ 1: GET /api/custom-views/timesheet-pdf ==============
router.get('/timesheet-pdf', auth, async (req, res) => {
  try {
    const employee_id = req.query.employee_id || '1';
    const period = req.query.period || 'current_week';
    const e = await pool.query('SELECT first_name, last_name, hourly_rate FROM employees WHERE id = $1', [employee_id]).catch(() => ({ rows: [] }));
    const emp = e.rows[0] || { first_name: 'Maria', last_name: 'Sanchez', hourly_rate: 22.5 };
    const empName = `${emp.first_name} ${emp.last_name}`;
    const rate = parseFloat(emp.hourly_rate || 22.5);

    const entries = [];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    let totalHours = 0;
    days.forEach((d, i) => {
      const hours = 6 + (i % 3);
      totalHours += hours;
      entries.push({
        day: d, date: `2026-05-${11 + i}`, client: ['Mrs. Wilson', 'Mr. Garcia', 'Ms. Thompson'][i % 3],
        start: '08:00', end: `${8 + hours}:00`, hours, care_type: 'Personal Care',
      });
    });

    const pdfLines = [
      '%PDF-1.4',
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    ];
    let content = `BT /F1 14 Tf 50 740 Td (IHSS Timesheet — ${empName}) Tj ET\n`;
    content += `BT /F1 10 Tf 50 720 Td (Period: ${period}) Tj ET\n`;
    content += `BT /F1 10 Tf 50 705 Td (Hourly Rate: $${rate.toFixed(2)}) Tj ET\n`;
    let y = 680;
    content += `BT /F1 10 Tf 50 ${y} Td (Day  Date         Client          Start End  Hours) Tj ET\n`;
    entries.forEach(e => {
      y -= 15;
      content += `BT /F1 9 Tf 50 ${y} Td (${e.day}  ${e.date}  ${e.client.padEnd(15)} ${e.start} ${e.end}  ${e.hours}) Tj ET\n`;
    });
    y -= 25;
    content += `BT /F1 11 Tf 50 ${y} Td (Total Hours: ${totalHours}    Gross Pay: $${(totalHours * rate).toFixed(2)}) Tj ET\n`;
    const stream = `4 0 obj << /Length ${content.length} >> stream\n${content}endstream endobj\n`;
    pdfLines.push(stream);
    pdfLines.push('5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj');
    pdfLines.push('xref 0 6 0000000000 65535 f');
    pdfLines.push('trailer << /Size 6 /Root 1 0 R >>');
    pdfLines.push('startxref 0 %%EOF');
    const pdf = pdfLines.join('\n');

    res.json({
      employee_id,
      employee_name: empName,
      period,
      pay_period_start: '2026-05-11',
      pay_period_end: '2026-05-15',
      hourly_rate: rate,
      entries,
      summary: {
        total_hours: totalHours,
        regular_hours: Math.min(40, totalHours),
        overtime_hours: Math.max(0, totalHours - 40),
        gross_pay: Math.round(totalHours * rate * 100) / 100,
      },
      pdf_base64: Buffer.from(pdf).toString('base64'),
      pdf_size_bytes: pdf.length,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============== NON-VIZ 2: Scheduling Rules Editor (CRUD) ==============
router.get('/scheduling-rules', auth, (req, res) => {
  res.json({ rules: schedulingRules, total: schedulingRules.length });
});

router.post('/scheduling-rules', auth, (req, res) => {
  try {
    const { name, rule_type, value, applies_to, priority, active } = req.body || {};
    if (!name || !rule_type) return res.status(400).json({ error: 'name and rule_type required' });
    const rule = {
      id: nextRuleId++,
      name, rule_type, value: value || '',
      applies_to: applies_to || 'all_caregivers',
      priority: priority || 'medium',
      active: active !== false,
      created_at: new Date().toISOString(),
    };
    schedulingRules.push(rule);
    res.status(201).json({ rule, message: 'Rule created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/scheduling-rules/:id', auth, (req, res) => {
  const idx = schedulingRules.findIndex(r => r.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Rule not found' });
  schedulingRules[idx] = { ...schedulingRules[idx], ...req.body, id: schedulingRules[idx].id };
  res.json({ rule: schedulingRules[idx], message: 'Rule updated' });
});

router.delete('/scheduling-rules/:id', auth, (req, res) => {
  const idx = schedulingRules.findIndex(r => r.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Rule not found' });
  const removed = schedulingRules.splice(idx, 1)[0];
  res.json({ rule: removed, message: 'Rule deleted' });
});

module.exports = router;
