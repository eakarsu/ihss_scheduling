const router = require('express').Router();
const auth = require('../middleware/auth');
const { getPool } = require('../db');
const { appendAudit, verifyAudit } = require('../lib/audit');
const { sha256, canonical } = require('../lib/canonical');
const { decrypt } = require('../lib/encryption');
const { importPatient, fetchFhir } = require('../lib/fhir');
const { activeConsent, fieldScopes, CareError, requireRole } = require('../lib/policy');
const { proposeVisit, reviewVisit, disposeClient } = require('../lib/scheduling');

router.use(auth);

router.get('/clients', async (req, res, next) => {
  try {
    const actor = req.user;
    const rows = (await getPool().query(`SELECT c.* FROM clients c WHERE c.organization_id=$1 AND ($2=ANY(ARRAY['ADMIN','CLINICIAN','CASEWORKER']) OR EXISTS(SELECT 1 FROM client_access a WHERE a.client_id=c.id AND a.user_id=$3 AND a.revoked_at IS NULL AND (a.expires_at IS NULL OR a.expires_at>now()))) ORDER BY c.created_at DESC`, [actor.organization_id, actor.role, actor.id])).rows;
    const projected = [];
    for (const client of rows) {
      const scopes = await fieldScopes(getPool(), actor, client.id);
      const item = { id: client.id, identityConfidence: client.identity_confidence, disposedAt: client.disposed_at, retainUntil: client.retain_until, legalHold: client.legal_hold };
      if (scopes.includes('IDENTITY')) item.displayLabel = client.display_label;
      if (scopes.includes('CONTACT') && !client.disposed_at) item.contact = decrypt({ ciphertext: client.phi_ciphertext, iv: client.phi_iv, tag: client.phi_tag }).telecom;
      projected.push(item);
    }
    res.json(projected);
  } catch (error) { next(error); }
});

router.get('/caregivers', async (req, res, next) => {
  try {
    requireRole(req.user, ['ADMIN','CASEWORKER','CLINICIAN']);
    res.json((await getPool().query(`SELECT u.id,u.name,p.skills,p.credential_expires_at,p.max_weekly_minutes FROM users u JOIN caregiver_profiles p ON p.user_id=u.id WHERE u.organization_id=$1 AND u.active AND p.active ORDER BY u.name`, [req.user.organization_id])).rows);
  } catch (error) { next(error); }
});

router.get('/visits', async (req, res, next) => {
  try {
    requireRole(req.user, ['ADMIN','CASEWORKER','CLINICIAN','CAREGIVER']);
    const caregiverClause = req.user.role === 'CAREGIVER'
      ? `AND v.caregiver_user_id=$2 AND EXISTS(
          SELECT 1 FROM client_access a
          WHERE a.organization_id=v.organization_id AND a.client_id=v.client_id AND a.user_id=$2
            AND 'SCHEDULE'=ANY(a.field_scopes) AND a.revoked_at IS NULL
            AND (a.expires_at IS NULL OR a.expires_at>now())
        )`
      : '';
    const parameters = req.user.role === 'CAREGIVER' ? [req.user.organization_id, req.user.id] : [req.user.organization_id];
    res.json((await getPool().query(`SELECT v.id,v.client_id,v.caregiver_user_id,v.start_at,v.end_at,v.status,v.version,v.risk_flags,v.provenance,u.name AS caregiver_name FROM visits v JOIN users u ON u.id=v.caregiver_user_id WHERE v.organization_id=$1 ${caregiverClause} ORDER BY v.start_at`, parameters)).rows);
  } catch (error) { next(error); }
});

router.post('/fhir/import', async (req, res, next) => {
  const db = await getPool().connect();
  try { res.status(201).json(await importPatient(db, req.user, req.body)); }
  catch (error) { next(error); } finally { db.release(); }
});

router.post('/fhir/sync/:type/:id', async (req, res, next) => {
  const db = await getPool().connect();
  try {
    const resource = await fetchFhir(req.params.type, req.params.id);
    res.status(201).json(await importPatient(db, req.user, { ...req.body, resource }));
  } catch (error) { next(error); } finally { db.release(); }
});

router.post('/clients/:id/consents', async (req, res, next) => {
  const db = await getPool().connect();
  try {
    requireRole(req.user, ['ADMIN','CASEWORKER']);
    const { scopes, sourceReference, effectiveAt, expiresAt } = req.body || {};
    if (!Array.isArray(scopes) || !scopes.length || !sourceReference) throw new CareError(400, 'Consent scopes and source evidence are required');
    await db.query('BEGIN');
    const client = await db.query('SELECT 1 FROM clients WHERE id=$1 AND organization_id=$2', [req.params.id, req.user.organization_id]);
    if (!client.rows[0]) throw new CareError(404, 'Client not found');
    const evidenceHash = sha256(canonical({ scopes: [...scopes].sort(), sourceReference, effectiveAt, expiresAt: expiresAt || null }));
    const consent = (await db.query(`INSERT INTO client_consents(organization_id,client_id,scopes,source_reference,evidence_hash,effective_at,expires_at,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [req.user.organization_id, req.params.id, scopes, sourceReference, evidenceHash, effectiveAt, expiresAt || null, req.user.id])).rows[0];
    await appendAudit(db, { organizationId: req.user.organization_id, actorUserId: req.user.id, clientId: req.params.id, action: 'consent.recorded', details: { consentId: consent.id, scopes, evidenceHash } });
    await db.query('COMMIT'); res.status(201).json(consent);
  } catch (error) { await db.query('ROLLBACK'); next(error); } finally { db.release(); }
});

router.post('/consents/:id/revoke', async (req, res, next) => {
  const db = await getPool().connect();
  try {
    requireRole(req.user, ['ADMIN','CASEWORKER']); await db.query('BEGIN');
    const consent = (await db.query(`UPDATE client_consents SET revoked_at=now() WHERE id=$1 AND organization_id=$2 AND revoked_at IS NULL RETURNING *`, [req.params.id, req.user.organization_id])).rows[0];
    if (!consent) throw new CareError(404, 'Active consent not found');
    await appendAudit(db, { organizationId: req.user.organization_id, actorUserId: req.user.id, clientId: consent.client_id, action: 'consent.revoked', details: { consentId: consent.id, reason: req.body?.reason || 'not supplied' } });
    await db.query('COMMIT'); res.json(consent);
  } catch (error) { await db.query('ROLLBACK'); next(error); } finally { db.release(); }
});

router.post('/clients/:id/access', async (req, res, next) => {
  const db = await getPool().connect();
  try {
    requireRole(req.user, ['ADMIN','CASEWORKER']); const { userId, fieldScopes: scopes, reason, expiresAt } = req.body || {};
    if (!userId || !Array.isArray(scopes) || !scopes.length || !reason) throw new CareError(400, 'User, field scopes, and reason are required');
    await db.query('BEGIN');
    const access = (await db.query(`INSERT INTO client_access(organization_id,client_id,user_id,field_scopes,granted_by,reason,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(client_id,user_id) DO UPDATE SET field_scopes=EXCLUDED.field_scopes,granted_by=EXCLUDED.granted_by,reason=EXCLUDED.reason,expires_at=EXCLUDED.expires_at,revoked_at=NULL RETURNING *`, [req.user.organization_id, req.params.id, userId, scopes, req.user.id, reason, expiresAt || null])).rows[0];
    await appendAudit(db, { organizationId: req.user.organization_id, actorUserId: req.user.id, clientId: req.params.id, action: 'client.access_granted', details: { userId, scopes, expiresAt: expiresAt || null } });
    await db.query('COMMIT'); res.status(201).json(access);
  } catch (error) { await db.query('ROLLBACK'); next(error); } finally { db.release(); }
});

router.delete('/clients/:id/access/:userId', async (req, res, next) => {
  const db = await getPool().connect();
  try {
    requireRole(req.user, ['ADMIN','CASEWORKER']); await db.query('BEGIN');
    const access = (await db.query(`UPDATE client_access SET revoked_at=now() WHERE organization_id=$1 AND client_id=$2 AND user_id=$3 AND revoked_at IS NULL RETURNING id`, [req.user.organization_id, req.params.id, req.params.userId])).rows[0];
    if (!access) throw new CareError(404, 'Active access not found');
    await appendAudit(db, { organizationId: req.user.organization_id, actorUserId: req.user.id, clientId: req.params.id, action: 'client.access_revoked', details: { userId: req.params.userId } });
    await db.query('COMMIT'); res.json({ revoked: true });
  } catch (error) { await db.query('ROLLBACK'); next(error); } finally { db.release(); }
});

router.post('/clients/:id/care-plans', async (req, res, next) => {
  const db = await getPool().connect();
  try {
    requireRole(req.user, ['CLINICIAN','CASEWORKER']); const { requiredSkills, contraindications = [], sourceReference, jurisdiction, effectiveAt, expiresAt } = req.body || {};
    if (!Array.isArray(requiredSkills) || !requiredSkills.length || !sourceReference || !jurisdiction || !effectiveAt) throw new CareError(400, 'Skills, source, jurisdiction, and effective date are required');
    await db.query('BEGIN');
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`care-plan:${req.params.id}`]);
    const prior = await db.query('SELECT coalesce(max(version),0)::int AS version FROM care_plans WHERE client_id=$1 AND organization_id=$2', [req.params.id, req.user.organization_id]);
    const version = prior.rows[0].version + 1; const evidenceHash = sha256(canonical({ requiredSkills, contraindications, sourceReference, jurisdiction, effectiveAt, expiresAt: expiresAt || null }));
    const plan = (await db.query(`INSERT INTO care_plans(organization_id,client_id,version,required_skills,contraindications,source_reference,evidence_hash,jurisdiction,effective_at,expires_at,status,authored_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PENDING_REVIEW',$11) RETURNING *`, [req.user.organization_id, req.params.id, version, requiredSkills, contraindications, sourceReference, evidenceHash, jurisdiction, effectiveAt, expiresAt || null, req.user.id])).rows[0];
    await appendAudit(db, { organizationId: req.user.organization_id, actorUserId: req.user.id, clientId: req.params.id, action: 'care_plan.created', details: { planId: plan.id, version, evidenceHash } });
    await db.query('COMMIT'); res.status(201).json(plan);
  } catch (error) { await db.query('ROLLBACK'); next(error); } finally { db.release(); }
});

router.post('/care-plans/:id/review', async (req, res, next) => {
  const db = await getPool().connect();
  try {
    requireRole(req.user, ['CLINICIAN']); const { decision, rationale } = req.body || {};
    if (!['APPROVED','REJECTED'].includes(decision) || !rationale || rationale.length < 12) throw new CareError(400, 'Decision and substantive rationale are required');
    await db.query('BEGIN'); const plan = (await db.query(`SELECT * FROM care_plans WHERE id=$1 AND organization_id=$2 FOR UPDATE`, [req.params.id, req.user.organization_id])).rows[0];
    if (!plan) throw new CareError(404, 'Care plan not found'); if (plan.authored_by === req.user.id) throw new CareError(409, 'Author cannot review their own plan', 'separation_of_duties');
    const updated = (await db.query(`UPDATE care_plans SET status=$1,reviewed_by=$2,review_rationale=$3 WHERE id=$4 AND status='PENDING_REVIEW' RETURNING *`, [decision, req.user.id, rationale, plan.id])).rows[0];
    if (!updated) throw new CareError(409, 'Care plan is no longer pending');
    await appendAudit(db, { organizationId: req.user.organization_id, actorUserId: req.user.id, clientId: plan.client_id, action: `care_plan.review_${decision.toLowerCase()}`, details: { planId: plan.id, version: plan.version } });
    await db.query('COMMIT'); res.json(updated);
  } catch (error) { await db.query('ROLLBACK'); next(error); } finally { db.release(); }
});

router.post('/visits', async (req, res, next) => { try { res.status(201).json(await proposeVisit(getPool(), req.user, req.body)); } catch (error) { next(error); } });
router.post('/visits/:id/review', async (req, res, next) => { try { res.json(await reviewVisit(getPool(), req.user, req.params.id, req.body)); } catch (error) { next(error); } });
router.post('/clients/:id/dispose', async (req, res, next) => { try { res.json(await disposeClient(getPool(), req.user, req.params.id)); } catch (error) { next(error); } });
router.get('/audit/verify', async (req, res, next) => { try { requireRole(req.user, ['ADMIN','AUDITOR']); res.json({ valid: await verifyAudit(getPool(), req.user.organization_id) }); } catch (error) { next(error); } });
router.get('/incidents', async (req, res, next) => { try { requireRole(req.user, ['ADMIN','CASEWORKER','CLINICIAN']); res.json((await getPool().query('SELECT id,client_id,visit_id,severity,category,summary,status,assigned_clinician_id,created_at,resolved_at FROM incidents WHERE organization_id=$1 ORDER BY created_at DESC', [req.user.organization_id])).rows); } catch (error) { next(error); } });

module.exports = router;
