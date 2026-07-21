const bcrypt = require('bcryptjs');
const { getPool, closePool } = require('../db');

async function main() {
  const { PROVISION_EMAIL: email, PROVISION_NAME: name, PROVISION_PASSWORD: password, PROVISION_ROLE: role, PROVISION_ORGANIZATION_ID: organizationId, PROVISION_ORGANIZATION_NAME: organizationName } = process.env;
  if (!email || !name || !password || password.length < 16 || !['ADMIN','CASEWORKER','CLINICIAN','CAREGIVER','AUDITOR'].includes(role)) throw new Error('Name, email, 16+ character password, and valid role are required');
  const pool = getPool();
  let orgId = organizationId;
  if (!orgId) {
    if (role !== 'ADMIN' || !organizationName) throw new Error('Only an administrator can provision a new named organization');
    const existing = await pool.query('SELECT count(*)::int AS count FROM organizations');
    if (existing.rows[0].count !== 0) throw new Error('New-organization bootstrap is allowed only on an empty database');
    orgId = (await pool.query('INSERT INTO organizations(name) VALUES($1) RETURNING id', [organizationName])).rows[0].id;
  }
  const user = (await pool.query(`INSERT INTO users(organization_id,name,email,password_hash,role) VALUES($1,$2,lower($3),$4,$5) RETURNING id,organization_id,email,role`, [orgId, name, email, await bcrypt.hash(password, 12), role])).rows[0];
  console.log(JSON.stringify(user));
}
main().finally(closePool).catch((error) => { console.error(error.message); process.exitCode = 1; });
