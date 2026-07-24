const router = require('express').Router();
const auth = require('../middleware/auth');
const { getPool } = require('../db');
const { appendAudit } = require('../lib/audit');
const { canonical, sha256 } = require('../lib/canonical');
const { requestOperationalReadiness } = require('../lib/openrouter');

router.use(auth);

router.post('/operational-readiness', async (req, res, next) => {
  const workflowSummary = typeof req.body?.workflowSummary === 'string' ? req.body.workflowSummary.trim() : '';
  if (workflowSummary.length < 10 || workflowSummary.length > 1000) {
    return res.status(400).json({ error: 'workflowSummary must contain 10-1000 characters' });
  }
  const db = await getPool().connect();
  try {
    const evidence = await requestOperationalReadiness(workflowSummary);
    const payloadHash = sha256(canonical({ workflowSummary, result: evidence.result, providerReceipt: evidence.providerReceipt }));
    await db.query('BEGIN');
    const providerEvent = (await db.query(
      `INSERT INTO provider_events(organization_id,provider,event_id,payload_hash,outcome,evidence)
       VALUES($1,'openrouter',$2,$3,'SUCCEEDED',$4) RETURNING id,created_at`,
      [req.user.organization_id, evidence.providerReceipt.requestId, payloadHash, { result: evidence.result, providerReceipt: evidence.providerReceipt }],
    )).rows[0];
    await appendAudit(db, {
      organizationId: req.user.organization_id,
      actorUserId: req.user.id,
      action: 'ai.operational_readiness_generated',
      details: { providerEventId: providerEvent.id, payloadHash, providerReceipt: evidence.providerReceipt },
    });
    await db.query('COMMIT');
    return res.json({ analysisId: providerEvent.id, createdAt: providerEvent.created_at, ...evidence });
  } catch (error) {
    await db.query('ROLLBACK');
    return next(error);
  } finally {
    db.release();
  }
});

module.exports = router;
