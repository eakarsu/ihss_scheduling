const bcrypt = require('bcryptjs');
const { getPool, closePool } = require('../db');

async function main() {
  const { PROVISION_EMAIL: email, PROVISION_NAME: name, PROVISION_PASSWORD: password, PROVISION_ROLE: role, PROVISION_ORGANIZATION_ID: organizationId, PROVISION_ORGANIZATION_NAME: organizationName } = process.env;
  if (!email || !name || !password || password.length < 16 || !['ADMIN','CASEWORKER','CLINICIAN','CAREGIVER','AUDITOR'].includes(role)) throw new Error('Name, email, 16+ character password, and valid role are required');
  const pool = getPool();
  let orgId = organizationId;
  if (!orgId) {
    if (role !== 'ADMIN' || !organizationName) throw new Error('Only an administrator can provision a new named organization');
    const matching = await pool.query('SELECT id FROM organizations WHERE lower(name)=lower($1) ORDER BY created_at LIMIT 1', [organizationName]);
    if (matching.rows[0]) orgId = matching.rows[0].id;
    else {
      const existing = await pool.query('SELECT id FROM organizations ORDER BY created_at LIMIT 2');
      if (existing.rows.length === 1) orgId = existing.rows[0].id;
      else if (existing.rows.length > 1) throw new Error('PROVISION_ORGANIZATION_ID is required when multiple organizations exist');
      else orgId = (await pool.query('INSERT INTO organizations(name) VALUES($1) RETURNING id', [organizationName])).rows[0].id;
    }
  }
  const user = (await pool.query(
    `INSERT INTO users(organization_id,name,email,password_hash,role)
     VALUES($1,$2,lower($3),$4,$5)
     ON CONFLICT(organization_id,email) DO UPDATE SET
       name=EXCLUDED.name,password_hash=EXCLUDED.password_hash,role=EXCLUDED.role,active=TRUE,token_version=users.token_version+1
     RETURNING id,organization_id,email,role`,
    [orgId, name, email, await bcrypt.hash(password, 12), role],
  )).rows[0];
  console.log(JSON.stringify(user));
}
main().finally(closePool).catch((error) => { console.error(error.message); process.exitCode = 1; });
