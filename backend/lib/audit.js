const crypto = require('node:crypto');
const { canonical, sha256 } = require('./canonical');
const { loadConfig } = require('../config');

async function appendAudit(client, event) {
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`audit:${event.organizationId}`]);
  const prior = await client.query('SELECT sequence,event_hash FROM audit_events WHERE organization_id=$1 ORDER BY sequence DESC LIMIT 1', [event.organizationId]);
  const sequence = prior.rows[0] ? Number(prior.rows[0].sequence) + 1 : 1;
  const priorHash = prior.rows[0]?.event_hash || 'GENESIS';
  const createdAt = new Date();
  const payload = { organizationId: event.organizationId, sequence, actorUserId: event.actorUserId || null, clientId: event.clientId || null, action: event.action, details: event.details, priorHash, createdAt: createdAt.toISOString() };
  const eventHash = sha256(canonical(payload));
  const signature = crypto.createHmac('sha256', loadConfig().auditKey).update(eventHash).digest('hex');
  await client.query(`INSERT INTO audit_events(organization_id,sequence,actor_user_id,client_id,action,details,prior_hash,event_hash,signature,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [event.organizationId, sequence, event.actorUserId || null, event.clientId || null, event.action, event.details, priorHash, eventHash, signature, createdAt]);
  return { sequence, eventHash, signature };
}

async function verifyAudit(pool, organizationId) {
  const rows = (await pool.query('SELECT * FROM audit_events WHERE organization_id=$1 ORDER BY sequence', [organizationId])).rows;
  let priorHash = 'GENESIS';
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const payload = { organizationId, sequence: index + 1, actorUserId: row.actor_user_id, clientId: row.client_id, action: row.action, details: row.details, priorHash, createdAt: new Date(row.created_at).toISOString() };
    const hash = sha256(canonical(payload));
    const signature = crypto.createHmac('sha256', loadConfig().auditKey).update(hash).digest('hex');
    if (Number(row.sequence) !== index + 1 || row.prior_hash !== priorHash || row.event_hash !== hash || !crypto.timingSafeEqual(Buffer.from(row.signature, 'hex'), Buffer.from(signature, 'hex'))) return false;
    priorHash = hash;
  }
  return true;
}
module.exports = { appendAudit, verifyAudit };
