const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { getPool } = require('../db');
const { loadConfig } = require('../config');
const authenticate = require('../middleware/auth');

router.get('/demo-credentials', async (_req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production' || (process.env.ENABLE_DEMO_CREDENTIAL_AUTOFILL || 'true') !== 'true') {
      return res.status(404).json({ error: 'Not found' });
    }
    const email = String(process.env.PROVISION_ADMIN_EMAIL || process.env.DEMO_EMAIL || '').trim().toLowerCase();
    const password = String(process.env.PROVISION_ADMIN_PASSWORD || process.env.DEMO_PASSWORD || '');
    if (!email || !password) return res.status(404).json({ error: 'Demo credentials are unavailable' });
    const account = (await getPool().query(
      'SELECT organization_id FROM users WHERE lower(email)=lower($1) AND active=TRUE ORDER BY created_at DESC LIMIT 1',
      [email],
    )).rows[0];
    if (!account) return res.status(404).json({ error: 'Demo account is not provisioned' });
    res.set('Cache-Control', 'no-store').json({ organizationId: account.organization_id, email, password });
  } catch (error) { next(error); }
});
router.use(rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false }));
router.post('/register', (_req, res) => res.status(410).json({ error: 'Public registration is disabled; use explicit administrator provisioning' }));
router.post('/login', async (req, res, next) => {
  try {
    const { organizationId, tenant, tenantSlug, email, password } = req.body || {};
    const organization = organizationId || tenantSlug || tenant;
    if (!organization || !email || typeof password !== 'string') return res.status(400).json({ error: 'Organization, email, and password are required' });
    const result = await getPool().query(
      `SELECT users.* FROM users JOIN organizations ON organizations.id=users.organization_id
       WHERE (organizations.id::text=$1 OR organizations.name=$1) AND lower(users.email)=lower($2)`,
      [organization, email],
    );
    const user = result.rows[0];
    if (!user || !user.active || !await bcrypt.compare(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    const config = loadConfig();
    const token = jwt.sign({ organizationId: user.organization_id, tokenVersion: user.token_version }, config.jwtSecret, { subject: user.id, algorithm: 'HS256', issuer: config.issuer, audience: config.audience, expiresIn: '15m' });
    res.json({ token, user: { id: user.id, organizationId: user.organization_id, name: user.name, email: user.email, role: user.role } });
  } catch (error) { next(error); }
});
router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));
module.exports = router;
