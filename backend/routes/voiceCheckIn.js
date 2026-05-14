// Voice-driven check-in / incident reporting.
// TODO: configure credentials for Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN).
const express = require('express');
const auth = require('../middleware/auth');
const { aiQuery } = require('../openrouter');
const pool = require('../db');
const router = express.Router();

// In-memory voice sessions; replace with persistent table later.
const sessions = new Map();

router.post('/start', auth, (req, res) => {
  const { storeId } = req.body;
  const id = `vc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  sessions.set(id, { id, employeeId: req.user.id, storeId, transcript: [], createdAt: new Date() });
  res.json({ sessionId: id });
});

router.post('/:sessionId/utterance', auth, async (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'session not found' });
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  s.transcript.push({ role: 'user', text, at: new Date() });

  const out = await aiQuery(
    `You are a friendly workforce check-in agent. Detect intent: check_in | check_out | incident_report | other. Reply in <=2 sentences and return JSON {"reply":string,"intent":string,"slots":{...}}.`,
    s.transcript.map(t => `${t.role}: ${t.text}`).join('\n')
  ).catch(e => ({ success: false, result: 'AI error: ' + e.message }));

  let payload;
  try { payload = JSON.parse((out.result || '').match(/\{[\s\S]*\}/)[0]); } catch { payload = { reply: out.result, intent: 'other', slots: {} }; }
  s.transcript.push({ role: 'assistant', text: payload.reply, at: new Date(), intent: payload.intent });

  // Persist on real intents
  try {
    if (payload.intent === 'check_in') {
      await pool.query(
        'INSERT INTO attendance_events (employee_id, store_id, type, source) VALUES ($1, $2, $3, $4)',
        [s.employeeId, s.storeId || null, 'check_in', 'voice']
      );
    } else if (payload.intent === 'incident_report') {
      await pool.query(
        'INSERT INTO incidents (employee_id, store_id, description, source) VALUES ($1, $2, $3, $4)',
        [s.employeeId, s.storeId || null, payload.slots?.description || text, 'voice']
      );
    }
  } catch {}

  res.json(payload);
});

router.post('/:sessionId/end', auth, (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'session not found' });
  sessions.delete(s.id);
  res.json({ ok: true, transcriptLen: s.transcript.length });
});

module.exports = router;
