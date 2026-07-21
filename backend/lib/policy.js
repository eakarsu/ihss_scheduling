class CareError extends Error {
  constructor(status, message, code = 'invalid_request') { super(message); this.status = status; this.code = code; }
}

const roleScopes = {
  ADMIN: ['IDENTITY','CONTACT','CARE_PLAN','SCHEDULE','INCIDENTS'],
  CLINICIAN: ['IDENTITY','CONTACT','CARE_PLAN','SCHEDULE','INCIDENTS'],
  CASEWORKER: ['IDENTITY','CONTACT','CARE_PLAN','SCHEDULE','INCIDENTS'],
  CAREGIVER: ['CONTACT','CARE_PLAN','SCHEDULE','INCIDENTS'],
  AUDITOR: [],
};

function requireRole(actor, roles) {
  if (!actor?.active) throw new CareError(401, 'Identity is inactive', 'identity_inactive');
  if (!roles.includes(actor.role)) throw new CareError(403, 'Role is not authorized', 'role_denied');
}

async function fieldScopes(db, actor, clientId) {
  if (['ADMIN','CLINICIAN','CASEWORKER'].includes(actor.role)) return roleScopes[actor.role];
  const result = await db.query(`SELECT field_scopes FROM client_access WHERE organization_id=$1 AND client_id=$2 AND user_id=$3 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>now())`, [actor.organization_id, clientId, actor.id]);
  if (!result.rows[0]) throw new CareError(404, 'Client not found', 'not_found');
  return result.rows[0].field_scopes;
}

async function activeConsent(db, organizationId, clientId, scope, at = new Date()) {
  const result = await db.query(`SELECT id FROM client_consents WHERE organization_id=$1 AND client_id=$2 AND $3=ANY(scopes) AND effective_at<=$4 AND (expires_at IS NULL OR expires_at>$4) AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1`, [organizationId, clientId, scope, at]);
  return result.rows[0] || null;
}
module.exports = { CareError, requireRole, fieldScopes, activeConsent };
