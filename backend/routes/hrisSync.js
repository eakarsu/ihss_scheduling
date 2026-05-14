// HRIS / payroll provider integrations (ADP, Gusto, Workday).
// TODO: configure credentials — ADP_CLIENT_ID/SECRET, GUSTO_API_KEY, WORKDAY_TENANT/USER/PASS.
const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

async function getJson(url, headers) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

router.get('/providers', auth, (_req, res) => {
  res.json({
    providers: [
      { id: 'adp', configured: !!process.env.ADP_CLIENT_ID },
      { id: 'gusto', configured: !!process.env.GUSTO_API_KEY },
      { id: 'workday', configured: !!process.env.WORKDAY_TENANT }
    ]
  });
});

router.get('/gusto/employees', auth, async (_req, res) => {
  const key = process.env.GUSTO_API_KEY;
  const companyId = process.env.GUSTO_COMPANY_ID;
  if (!key || !companyId) return res.status(503).json({ error: 'Gusto not configured' });
  try {
    const data = await getJson(`https://api.gusto.com/v1/companies/${companyId}/employees`, {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json'
    });
    res.json({ employees: data });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.post('/adp/payroll-export', auth, async (req, res) => {
  if (!process.env.ADP_CLIENT_ID) return res.status(503).json({ error: 'ADP not configured' });
  // TODO: configure credentials — implement client_credentials OAuth2 + post to /events/payroll/v1/...
  res.json({ status: 'queued', rows: (req.body.rows || []).length, note: 'Implement ADP OAuth + POST.' });
});

router.post('/workday/sync', auth, async (req, res) => {
  if (!process.env.WORKDAY_TENANT) return res.status(503).json({ error: 'Workday not configured' });
  // TODO: configure credentials — Workday SOAP / REST integration goes here.
  res.json({ status: 'queued', note: 'Implement Workday SOAP/REST.' });
});

module.exports = router;
