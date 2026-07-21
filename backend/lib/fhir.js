const { encrypt } = require('./encryption');
const { sha256, canonical } = require('./canonical');
const { appendAudit } = require('./audit');
const { activeConsent, CareError, requireRole } = require('./policy');
const { loadConfig } = require('../config');

function patientIdentity(resource) {
  if (resource?.resourceType !== 'Patient' || !resource.id || !Array.isArray(resource.identifier) || !resource.identifier[0]?.system || !resource.identifier[0]?.value) throw new CareError(400, 'FHIR Patient requires id and a system-qualified identifier', 'fhir_invalid');
  const name = resource.name?.[0];
  if (!name?.family || !resource.birthDate) throw new CareError(400, 'FHIR Patient requires family name and birthDate for identity matching', 'fhir_identity_incomplete');
  const identity = `${resource.identifier[0].system}|${resource.identifier[0].value}|${resource.birthDate}|${String(name.family).toLowerCase()}`;
  return { identityHash: sha256(identity), displayLabel: `${name.given?.[0] || ''} ${name.family}`.trim(), phi: { identifier: resource.identifier, name: resource.name, birthDate: resource.birthDate, telecom: resource.telecom || [], address: resource.address || [] } };
}

async function importPatient(db, actor, input) {
  requireRole(actor, ['ADMIN','CASEWORKER','CLINICIAN']);
  if (!input.sourceUrl || !input.sourceTimestamp || !input.versionId) throw new CareError(400, 'FHIR source URL, timestamp, and version are required', 'provenance_missing');
  const identity = patientIdentity(input.resource);
  const payloadHash = sha256(canonical(input.resource));
  await db.query('BEGIN');
  try {
    let client = (await db.query('SELECT * FROM clients WHERE organization_id=$1 AND identity_hash=$2 FOR UPDATE', [actor.organization_id, identity.identityHash])).rows[0];
    if (!client) {
      if (!input.consentEvidence?.sourceReference || !input.consentEvidence?.evidenceHash) throw new CareError(409, 'New identities require FHIR import consent evidence', 'consent_required');
      const encrypted = encrypt(identity.phi);
      client = (await db.query(`INSERT INTO clients(organization_id,identity_hash,display_label,fhir_resource_id,identity_confidence,phi_ciphertext,phi_iv,phi_tag) VALUES($1,$2,$3,$4,'PROVISIONAL',$5,$6,$7) RETURNING *`, [actor.organization_id, identity.identityHash, identity.displayLabel, input.resource.id, encrypted.ciphertext, encrypted.iv, encrypted.tag])).rows[0];
      await db.query(`INSERT INTO client_consents(organization_id,client_id,scopes,source_reference,evidence_hash,effective_at,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7)`, [actor.organization_id, client.id, ['FHIR_IMPORT'], input.consentEvidence.sourceReference, input.consentEvidence.evidenceHash, input.consentEvidence.effectiveAt || new Date(), actor.id]);
    }
    if (!await activeConsent(db, actor.organization_id, client.id, 'FHIR_IMPORT')) throw new CareError(409, 'Active FHIR import consent is required', 'consent_required');
    const prior = await db.query('SELECT payload_hash FROM fhir_resources WHERE organization_id=$1 AND resource_type=$2 AND resource_id=$3 AND version_id=$4', [actor.organization_id, 'Patient', input.resource.id, input.versionId]);
    if (prior.rows[0]) {
      if (prior.rows[0].payload_hash !== payloadHash) throw new CareError(409, 'FHIR version replay has different content', 'idempotency_conflict');
      await db.query('ROLLBACK'); return { clientId: client.id, duplicate: true, payloadHash };
    }
    const encryptedResource = encrypt(input.resource);
    await db.query(`INSERT INTO fhir_resources(organization_id,client_id,resource_type,resource_id,version_id,source_url,source_timestamp,payload_hash,ciphertext,iv,tag,imported_by) VALUES($1,$2,'Patient',$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [actor.organization_id, client.id, input.resource.id, input.versionId, input.sourceUrl, new Date(input.sourceTimestamp), payloadHash, encryptedResource.ciphertext, encryptedResource.iv, encryptedResource.tag, actor.id]);
    await appendAudit(db, { organizationId: actor.organization_id, actorUserId: actor.id, clientId: client.id, action: 'fhir.patient_imported', details: { resourceId: input.resource.id, versionId: input.versionId, sourceUrl: input.sourceUrl, payloadHash, identityConfidence: client.identity_confidence } });
    await db.query('COMMIT'); return { clientId: client.id, duplicate: false, payloadHash, identityConfidence: client.identity_confidence };
  } catch (error) { await db.query('ROLLBACK'); throw error; }
}

async function fetchFhir(resourceType, id) {
  const config = loadConfig();
  if (!config.fhirUrl || !config.fhirToken) throw new CareError(503, 'FHIR provider is not configured', 'provider_unavailable');
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${config.fhirUrl.replace(/\/$/,'')}/${encodeURIComponent(resourceType)}/${encodeURIComponent(id)}`, { headers: { accept: 'application/fhir+json', authorization: `Bearer ${config.fhirToken}` }, signal: controller.signal });
    if (!response.ok) throw new CareError(502, `FHIR provider returned ${response.status}`, 'provider_failed');
    const text = await response.text(); if (Buffer.byteLength(text) > 1_000_000) throw new CareError(502, 'FHIR response exceeds one megabyte', 'provider_invalid');
    return JSON.parse(text);
  } catch (error) { if (error instanceof CareError) throw error; throw new CareError(502, 'FHIR provider request failed', 'provider_failed'); }
  finally { clearTimeout(timer); }
}
module.exports = { patientIdentity, importPatient, fetchFhir };
