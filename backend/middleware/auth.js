const jwt = require('jsonwebtoken');
const { getPool } = require('../db');
const { loadConfig } = require('../config');

module.exports = async function auth(req, res, next) {
  const match = req.headers.authorization?.match(/^Bearer (.+)$/);
  if (!match) return res.status(401).json({ error: 'Authentication required', code: 'unauthorized' });
  try {
    const config = loadConfig();
    const token = jwt.verify(match[1], config.jwtSecret, { algorithms: ['HS256'], issuer: config.issuer, audience: config.audience });
    const result = await getPool().query('SELECT id,organization_id,name,email,role,active,token_version FROM users WHERE id=$1 AND organization_id=$2', [token.sub, token.organizationId]);
    const actor = result.rows[0];
    if (!actor || !actor.active || actor.token_version !== token.tokenVersion) return res.status(401).json({ error: 'Identity is inactive', code: 'identity_inactive' });
    req.user = actor; next();
  } catch {
    res.status(401).json({ error: 'Invalid session', code: 'unauthorized' });
  }
};
