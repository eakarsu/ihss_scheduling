const crypto = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { getPool, closePool } = require('../db');
const { loadConfig } = require('../config');
const { importPatient, patientIdentity, fetchFhir } = require('../lib/fhir');
const { proposeVisit, reviewVisit, disposeClient } = require('../lib/scheduling');
const { verifyAudit } = require('../lib/audit');
const { createApp } = require('../app');

const id = () => crypto.randomUUID();
const state = { orgA: id(), orgB: id(), admin: id(), caseworker: id(), clinician: id(), caregiver: id(), outsider: id() };
let clientId; let missingVisit; let assignedVisit; let consentId;
const patient = { resourceType: 'Patient', id: 'patient-101', meta: { versionId: '1' }, identifier: [{ system: 'https://county.invalid/member', value: 'member-101' }], name: [{ given: ['Maria'], family: 'Lopez' }], birthDate: '1945-05-02', telecom: [{ system: 'phone', value: 'tokenized-phone' }], address: [{ city: 'Oakland', state: 'CA' }] };
const actor = (key) => ({ id: state[key], organization_id: key === 'outsider' ? state.orgB : state.orgA, role: key === 'admin' ? 'ADMIN' : key === 'caseworker' ? 'CASEWORKER' : key === 'clinician' ? 'CLINICIAN' : 'CAREGIVER', active: true, token_version: 1 });
function token(key) { const a = actor(key); const config = loadConfig(); return jwt.sign({ organizationId: a.organization_id, tokenVersion: 1 }, config.jwtSecret, { subject: a.id, issuer: config.issuer, audience: config.audience, expiresIn: '15m' }); }

let pool;
test.before(async () => {
  pool = getPool();
  await pool.query(`TRUNCATE audit_events,provider_events,incidents,visit_reviews,visits,fhir_resources,caregiver_availability,caregiver_profiles,care_plans,client_access,client_consents,clients,users,organizations CASCADE`);
  await pool.query('INSERT INTO organizations(id,name) VALUES($1,$2),($3,$4)', [state.orgA, 'County A', state.orgB, 'County B']);
  const passwordHash = await bcrypt.hash('correct-horse-battery-staple', 4);
  await pool.query(`INSERT INTO users(id,organization_id,name,email,password_hash,role) VALUES
    ($1,$6,'Admin','admin@a.invalid',$8,'ADMIN'),($2,$6,'Case Worker','case@a.invalid',$8,'CASEWORKER'),($3,$6,'Clinician','clinician@a.invalid',$8,'CLINICIAN'),($4,$6,'Caregiver','caregiver@a.invalid',$8,'CAREGIVER'),($5,$7,'Outside','outside@b.invalid',$8,'CASEWORKER')`, [state.admin,state.caseworker,state.clinician,state.caregiver,state.outsider,state.orgA,state.orgB,passwordHash]);
  await pool.query(`INSERT INTO caregiver_profiles(user_id,organization_id,skills,credential_reference,credential_expires_at,max_weekly_minutes) VALUES($1,$2,$3,'registry:credential-1','2027-01-01',2400)`, [state.caregiver,state.orgA,['mobility','medication-observation']]);
  await pool.query(`INSERT INTO caregiver_availability(organization_id,caregiver_user_id,start_at,end_at,source_reference) VALUES($1,$2,'2026-08-01T08:00:00Z','2026-08-01T18:00:00Z','availability:verified-1')`, [state.orgA,state.caregiver]);
});

test.after(async () => closePool());

test('configuration and FHIR identity rules fail closed', async () => {
    assert.throws(() => loadConfig({ DATABASE_URL:'postgresql://localhost/db', JWT_SECRET:'short' }), /AUDIT_SIGNING_KEY|required/);
    const complete = { DATABASE_URL:'postgresql://db.internal/care', JWT_SECRET:'j'.repeat(32), AUDIT_SIGNING_KEY:'a'.repeat(32), PHI_ENCRYPTION_KEY_BASE64:Buffer.alloc(32).toString('base64'), CORS_ORIGINS:'https://care.example' };
    assert.throws(() => loadConfig({ ...complete, NODE_ENV:'production', DATABASE_URL:'postgresql://127.0.0.1/care', DATABASE_SSL_REQUIRED:'true' }), /loopback/);
    assert.throws(() => loadConfig({ ...complete, NODE_ENV:'production' }), /verified database TLS/);
    assert.throws(() => loadConfig({ ...complete, NODE_ENV:'production', DATABASE_SSL_REQUIRED:'true', FHIR_API_URL:'http://fhir.internal' }), /HTTPS/);
    assert.throws(() => patientIdentity({ resourceType:'Patient', id:'x' }), /identifier/);
    await assert.rejects(() => fetchFhir('Patient','x'), (error) => error.code === 'provider_unavailable');
  });

test('requires explicitly provisioned, live identities', async () => {
    const app=createApp();
    await request(app).post('/api/auth/register').send({}).expect(410);
    await request(app).post('/api/auth/login').send({ organizationId:state.orgA,email:'admin@a.invalid',password:'wrong-password' }).expect(401);
    const login=await request(app).post('/api/auth/login').send({ organizationId:state.orgA,email:'admin@a.invalid',password:'correct-horse-battery-staple' }).expect(200);
    assert.equal(login.body.user.role,'ADMIN');
    await pool.query('UPDATE users SET token_version=token_version+1 WHERE id=$1',[state.admin]);
    await request(app).get('/api/care/clients').set('authorization',`Bearer ${login.body.token}`).expect(401);
    await pool.query('UPDATE users SET token_version=1 WHERE id=$1',[state.admin]);
  });

test('imports a consented FHIR Patient with encrypted immutable provenance', async () => {
    const db = await pool.connect();
    try {
      const result = await importPatient(db, actor('caseworker'), { resource: patient, sourceUrl:'https://fhir.county.invalid/Patient/patient-101', sourceTimestamp:'2026-07-19T12:00:00Z', versionId:'1', consentEvidence:{sourceReference:'consent:paper-101',evidenceHash:'a'.repeat(64),effectiveAt:'2026-07-01T00:00:00Z'} });
      clientId = result.clientId; assert.equal(result.duplicate,false); assert.equal(result.identityConfidence,'PROVISIONAL');
      const resource = (await pool.query('SELECT * FROM fhir_resources WHERE client_id=$1',[clientId])).rows[0];
      assert.equal(resource.payload_hash.length,64); assert.equal(resource.ciphertext.includes('Maria'),false);
      await assert.rejects(() => pool.query("UPDATE fhir_resources SET source_url='https://attacker.invalid' WHERE id=$1",[resource.id]),/immutable/);
    } finally { db.release(); }
  });

test('deduplicates identical FHIR versions and rejects altered replay', async () => {
    const db = await pool.connect();
    try {
      assert.equal((await importPatient(db,actor('caseworker'),{resource:patient,sourceUrl:'https://fhir.county.invalid/Patient/patient-101',sourceTimestamp:'2026-07-19T12:00:00Z',versionId:'1'})).duplicate,true);
      await assert.rejects(() => importPatient(db,actor('caseworker'),{resource:{...patient,telecom:[{system:'phone',value:'altered'}]},sourceUrl:'https://fhir.county.invalid/Patient/patient-101',sourceTimestamp:'2026-07-19T12:00:00Z',versionId:'1'}),error=>error.code==='idempotency_conflict');
    } finally { db.release(); }
  });

test('missing consent and care-plan data creates a high-risk handoff', async () => {
    missingVisit = await proposeVisit(pool,actor('caseworker'),{clientId,caregiverUserId:state.caregiver,startAt:'2026-08-01T10:00:00Z',endAt:'2026-08-01T11:00:00Z',sourceReference:'referral:missing-data'});
    assert.equal(missingVisit.status,'ESCALATED'); assert.deepEqual(missingVisit.risk_flags.sort(),['NO_APPROVED_CARE_PLAN','NO_SCHEDULING_CONSENT']);
    assert.equal((await pool.query("SELECT severity FROM incidents WHERE visit_id=$1",[missingVisit.id])).rows[0].severity,'HIGH');
    await assert.rejects(() => reviewVisit(pool,actor('clinician'),missingVisit.id,{decision:'APPROVED',rationale:'Reviewed and attempted approval',expectedVersion:1}),error=>error.code==='safety_blocked');
    assert.equal((await reviewVisit(pool,actor('clinician'),missingVisit.id,{decision:'REJECTED',rationale:'Missing consent and approved care plan',expectedVersion:1})).status,'CANCELLED');
  });

test('records consent and requires independent care-plan review', async () => {
    const consent = (await pool.query(`INSERT INTO client_consents(organization_id,client_id,scopes,source_reference,evidence_hash,effective_at,recorded_by) VALUES($1,$2,$3,'consent:schedule-101',$4,'2026-07-01',$5) RETURNING id`,[state.orgA,clientId,['SCHEDULING','CARE_DELIVERY'],crypto.randomBytes(32).toString('hex'),state.caseworker])).rows[0]; consentId=consent.id;
    const plan = (await pool.query(`INSERT INTO care_plans(organization_id,client_id,version,required_skills,contraindications,source_reference,evidence_hash,jurisdiction,effective_at,status,authored_by) VALUES($1,$2,1,$3,$4,'clinician-order:101',$5,'CA','2026-07-01','PENDING_REVIEW',$6) RETURNING *`,[state.orgA,clientId,['mobility'],['fall-risk'],crypto.randomBytes(32).toString('hex'),state.caseworker])).rows[0];
    await assert.rejects(() => pool.query(`UPDATE care_plans SET status='APPROVED',reviewed_by=$1,review_rationale='self' WHERE id=$2`,[state.caseworker,plan.id]),/check constraint/);
    await pool.query(`UPDATE care_plans SET status='APPROVED',reviewed_by=$1,review_rationale='Independent clinical source review' WHERE id=$2`,[state.clinician,plan.id]);
    await assert.rejects(() => pool.query(`UPDATE care_plans SET evidence_hash='tampered' WHERE id=$1`,[plan.id]),/immutable/);
  });

test('assigns only after deterministic checks and independent clinician review', async () => {
    const proposed=await proposeVisit(pool,actor('caseworker'),{clientId,caregiverUserId:state.caregiver,startAt:'2026-08-01T12:00:00Z',endAt:'2026-08-01T13:00:00Z',sourceReference:'referral:approved-101'});
    assert.equal(proposed.status,'PROPOSED'); assert.deepEqual(proposed.risk_flags,[]);
    assignedVisit=await reviewVisit(pool,actor('clinician'),proposed.id,{decision:'APPROVED',rationale:'Care plan, credential, availability, and consent verified',expectedVersion:1});
    assert.equal(assignedVisit.status,'ASSIGNED'); assert.equal(assignedVisit.version,2);
    await assert.rejects(() => pool.query(`UPDATE visit_reviews SET rationale='tampered' WHERE visit_id=$1`,[proposed.id]),/append-only/);
  });

test('blocks overlapping assignments and stale review versions', async () => {
    const overlap=await proposeVisit(pool,actor('caseworker'),{clientId,caregiverUserId:state.caregiver,startAt:'2026-08-01T12:30:00Z',endAt:'2026-08-01T13:30:00Z',sourceReference:'referral:overlap'});
    assert.equal(overlap.status,'ESCALATED'); assert.ok(overlap.risk_flags.includes('CAREGIVER_OVERLAP'));
    await assert.rejects(()=>reviewVisit(pool,actor('clinician'),overlap.id,{decision:'APPROVED',rationale:'Attempt overlapping assignment review',expectedVersion:9}),error=>error.code==='version_conflict');
    await assert.rejects(()=>reviewVisit(pool,actor('clinician'),overlap.id,{decision:'APPROVED',rationale:'Attempt overlapping assignment review',expectedVersion:1}),error=>error.code==='safety_blocked');
  });

test('enforces tenant and field-level access with immediate revocation', async () => {
    assert.deepEqual((await request(createApp()).get('/api/care/visits').set('authorization',`Bearer ${token('caregiver')}`).expect(200)).body,[]);
    await pool.query(`INSERT INTO client_access(organization_id,client_id,user_id,field_scopes,granted_by,reason) VALUES($1,$2,$3,$4,$5,'assigned visit')`,[state.orgA,clientId,state.caregiver,['CONTACT','SCHEDULE'],state.caseworker]);
    const app=createApp();
    const allowed=await request(app).get('/api/care/clients').set('authorization',`Bearer ${token('caregiver')}`).expect(200);
    assert.equal(allowed.body.length,1); assert.equal(allowed.body[0].displayLabel,undefined); assert.equal(allowed.body[0].contact[0].value,'tokenized-phone');
    assert.ok((await request(app).get('/api/care/visits').set('authorization',`Bearer ${token('caregiver')}`).expect(200)).body.length>0);
    await pool.query(`UPDATE client_access SET revoked_at=now() WHERE client_id=$1 AND user_id=$2`,[clientId,state.caregiver]);
    assert.deepEqual((await request(app).get('/api/care/clients').set('authorization',`Bearer ${token('caregiver')}`).expect(200)).body,[]);
    assert.deepEqual((await request(app).get('/api/care/visits').set('authorization',`Bearer ${token('caregiver')}`).expect(200)).body,[]);
    assert.deepEqual((await request(app).get('/api/care/clients').set('authorization',`Bearer ${token('outsider')}`).expect(200)).body,[]);
  });

test('revokes consent without rewriting its evidence', async () => {
    const before=(await pool.query('SELECT evidence_hash FROM client_consents WHERE id=$1',[consentId])).rows[0];
    await pool.query('UPDATE client_consents SET revoked_at=now() WHERE id=$1',[consentId]);
    assert.equal((await pool.query('SELECT evidence_hash FROM client_consents WHERE id=$1',[consentId])).rows[0].evidence_hash,before.evidence_hash);
    await assert.rejects(()=>pool.query("UPDATE client_consents SET source_reference='tampered' WHERE id=$1",[consentId]),/immutable/);
  });

test('retention and legal hold preserve evidence while disposing encrypted payloads', async () => {
    await pool.query(`UPDATE clients SET retain_until='2020-01-01',legal_hold=true WHERE id=$1`,[clientId]);
    await assert.rejects(()=>disposeClient(pool,actor('admin'),clientId),error=>error.code==='retention_blocked');
    await pool.query(`UPDATE clients SET legal_hold=false WHERE id=$1`,[clientId]);
    assert.deepEqual(await disposeClient(pool,actor('admin'),clientId),{disposed:true,evidenceRetained:true});
    const fhir=(await pool.query('SELECT payload_hash,ciphertext FROM fhir_resources WHERE client_id=$1',[clientId])).rows[0]; assert.equal(fhir.ciphertext,''); assert.equal(fhir.payload_hash.length,64);
  });

test('preserves a verifiable immutable audit chain', async () => {
    assert.equal(await verifyAudit(pool,state.orgA),true);
    const event=(await pool.query('SELECT id FROM audit_events WHERE organization_id=$1 LIMIT 1',[state.orgA])).rows[0];
    await assert.rejects(()=>pool.query("UPDATE audit_events SET action='tampered' WHERE id=$1",[event.id]),/append-only/);
    assert.equal((await pool.query('SELECT status FROM visits WHERE id=$1',[assignedVisit.id])).rows[0].status,'ASSIGNED');
  });
