const { appendAudit } = require('./audit');
const { sha256, canonical } = require('./canonical');
const { activeConsent, CareError, requireRole } = require('./policy');

const hardFlags = new Set(['NO_SCHEDULING_CONSENT','NO_APPROVED_CARE_PLAN','SKILL_MISMATCH','CREDENTIAL_EXPIRED','CAREGIVER_OVERLAP','CLIENT_DISPOSED']);

async function evaluateSafety(db, actor, input) {
  const client = (await db.query('SELECT * FROM clients WHERE id=$1 AND organization_id=$2', [input.clientId, actor.organization_id])).rows[0];
  if (!client) throw new CareError(404, 'Client not found', 'not_found');
  const caregiver = (await db.query(`SELECT p.*,u.active AS user_active FROM caregiver_profiles p JOIN users u ON u.id=p.user_id WHERE p.user_id=$1 AND p.organization_id=$2`, [input.caregiverUserId, actor.organization_id])).rows[0];
  if (!caregiver || !caregiver.active || !caregiver.user_active) throw new CareError(404, 'Active caregiver not found', 'caregiver_unavailable');
  const plan = (await db.query(`SELECT * FROM care_plans WHERE client_id=$1 AND organization_id=$2 AND status='APPROVED' AND effective_at<=$3 AND (expires_at IS NULL OR expires_at>$3) ORDER BY version DESC LIMIT 1`, [input.clientId, actor.organization_id, input.startAt])).rows[0];
  const flags = [];
  if (client.disposed_at) flags.push('CLIENT_DISPOSED');
  if (!await activeConsent(db, actor.organization_id, input.clientId, 'SCHEDULING', input.startAt)) flags.push('NO_SCHEDULING_CONSENT');
  if (!plan) flags.push('NO_APPROVED_CARE_PLAN');
  if (plan && plan.required_skills.some((skill) => !caregiver.skills.includes(skill))) flags.push('SKILL_MISMATCH');
  if (new Date(caregiver.credential_expires_at) <= new Date(input.endAt)) flags.push('CREDENTIAL_EXPIRED');
  const availability = await db.query(`SELECT 1 FROM caregiver_availability WHERE organization_id=$1 AND caregiver_user_id=$2 AND start_at<=$3 AND end_at>=$4`, [actor.organization_id, input.caregiverUserId, input.startAt, input.endAt]);
  if (!availability.rows[0]) flags.push('OUTSIDE_AVAILABILITY');
  const overlap = await db.query(`SELECT 1 FROM visits WHERE organization_id=$1 AND caregiver_user_id=$2 AND status IN ('PROPOSED','ESCALATED','ASSIGNED','IN_PROGRESS') AND tstzrange(start_at,end_at,'[)') && tstzrange($3,$4,'[)') AND ($5::uuid IS NULL OR id<>$5) LIMIT 1`, [actor.organization_id, input.caregiverUserId, input.startAt, input.endAt, input.visitId || null]);
  if (overlap.rows[0]) flags.push('CAREGIVER_OVERLAP');
  return { client, caregiver, plan, flags };
}

async function proposeVisit(pool, actor, value) {
  requireRole(actor, ['ADMIN','CASEWORKER']);
  const startAt = new Date(value.startAt); const endAt = new Date(value.endAt);
  if (!value.clientId || !value.caregiverUserId || !(endAt > startAt)) throw new CareError(400, 'Valid client, caregiver, and time range are required');
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`caregiver:${value.caregiverUserId}`]);
    const safety = await evaluateSafety(db, actor, { clientId: value.clientId, caregiverUserId: value.caregiverUserId, startAt, endAt });
    const provenance = { sourceReference: value.sourceReference, carePlanVersion: safety.plan?.version || null, evaluatedAt: new Date().toISOString(), algorithm: 'deterministic-safety-v1' };
    if (!value.sourceReference) throw new CareError(400, 'Schedule source reference is required', 'provenance_missing');
    const status = safety.flags.length ? 'ESCALATED' : 'PROPOSED';
    const visit = (await db.query(`INSERT INTO visits(organization_id,client_id,caregiver_user_id,proposed_by,care_plan_id,start_at,end_at,status,risk_flags,provenance) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [actor.organization_id, value.clientId, value.caregiverUserId, actor.id, safety.plan?.id || null, startAt, endAt, status, JSON.stringify(safety.flags), JSON.stringify(provenance)])).rows[0];
    if (safety.flags.length) await db.query(`INSERT INTO incidents(organization_id,client_id,visit_id,severity,category,summary,status,reported_by) VALUES($1,$2,$3,$4,'SCHEDULING_SAFETY',$5,'ESCALATED',$6)`, [actor.organization_id, value.clientId, visit.id, safety.flags.some((flag) => hardFlags.has(flag)) ? 'HIGH' : 'MEDIUM', `Scheduling escalation: ${safety.flags.join(', ')}`, actor.id]);
    await appendAudit(db, { organizationId: actor.organization_id, actorUserId: actor.id, clientId: value.clientId, action: 'visit.proposed', details: { visitId: visit.id, status, flags: safety.flags, provenanceHash: sha256(canonical(provenance)) } });
    await db.query('COMMIT'); return visit;
  } catch (error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
}

async function reviewVisit(pool, actor, visitId, value) {
  requireRole(actor, ['CLINICIAN']);
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const visit = (await db.query('SELECT * FROM visits WHERE id=$1 AND organization_id=$2 FOR UPDATE', [visitId, actor.organization_id])).rows[0];
    if (!visit) throw new CareError(404, 'Visit not found', 'not_found');
    if (!['PROPOSED','ESCALATED'].includes(visit.status)) throw new CareError(409, 'Visit is not awaiting review', 'state_conflict');
    if (visit.proposed_by === actor.id) throw new CareError(409, 'Proposer cannot review the same visit', 'separation_of_duties');
    if (Number(value.expectedVersion) !== visit.version) throw new CareError(409, 'Visit changed before review', 'version_conflict');
    if (!['APPROVED','REJECTED'].includes(value.decision) || !value.rationale || value.rationale.length < 12) throw new CareError(400, 'Decision and substantive rationale are required');
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`caregiver:${visit.caregiver_user_id}`]);
    const safety = await evaluateSafety(db, actor, { clientId: visit.client_id, caregiverUserId: visit.caregiver_user_id, startAt: visit.start_at, endAt: visit.end_at, visitId: visit.id });
    if (value.decision === 'APPROVED' && safety.flags.some((flag) => hardFlags.has(flag))) throw new CareError(409, `Hard safety flags block assignment: ${safety.flags.join(', ')}`, 'safety_blocked');
    const status = value.decision === 'APPROVED' ? 'ASSIGNED' : 'CANCELLED';
    await db.query(`INSERT INTO visit_reviews(organization_id,visit_id,reviewer_id,decision,rationale,risk_flags) VALUES($1,$2,$3,$4,$5,$6)`, [actor.organization_id, visit.id, actor.id, value.decision, value.rationale, JSON.stringify(safety.flags)]);
    const updated = (await db.query(`UPDATE visits SET status=$1,version=version+1,reviewed_by=$2,review_rationale=$3,risk_flags=$4,updated_at=now() WHERE id=$5 RETURNING *`, [status, actor.id, value.rationale, JSON.stringify(safety.flags), visit.id])).rows[0];
    await appendAudit(db, { organizationId: actor.organization_id, actorUserId: actor.id, clientId: visit.client_id, action: `visit.review_${value.decision.toLowerCase()}`, details: { visitId: visit.id, flags: safety.flags, version: updated.version } });
    await db.query('COMMIT'); return updated;
  } catch (error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
}

async function disposeClient(pool, actor, clientId) {
  requireRole(actor, ['ADMIN']);
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const client = (await db.query('SELECT * FROM clients WHERE id=$1 AND organization_id=$2 FOR UPDATE', [clientId, actor.organization_id])).rows[0];
    if (!client) throw new CareError(404, 'Client not found');
    if (client.legal_hold || !client.retain_until || new Date(client.retain_until) > new Date()) throw new CareError(409, 'Legal hold or unexpired retention blocks disposition', 'retention_blocked');
    await db.query(`UPDATE clients SET display_label='Disposed evidence record',phi_ciphertext='',phi_iv='',phi_tag='',disposed_at=now(),updated_at=now() WHERE id=$1`, [clientId]);
    await db.query(`UPDATE fhir_resources SET ciphertext='',iv='',tag='' WHERE client_id=$1`, [clientId]);
    await appendAudit(db, { organizationId: actor.organization_id, actorUserId: actor.id, clientId, action: 'client.payload_disposed', details: { evidenceRowsRetained: true, retainUntil: client.retain_until } });
    await db.query('COMMIT'); return { disposed: true, evidenceRetained: true };
  } catch (error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
}
module.exports = { evaluateSafety, proposeVisit, reviewVisit, disposeClient, hardFlags };
