const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { loadConfig } = require('./config');
const { getPool } = require('./db');
const { CareError } = require('./lib/policy');

function createApp() {
  const config = loadConfig();
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin(origin, callback) { if (!origin || config.origins.includes(origin)) callback(null, true); else callback(new CareError(403, 'Origin denied', 'origin_denied')); }, credentials: false }));
  app.use(rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: true, legacyHeaders: false }));
  app.use(express.json({ limit: '256kb', strict: true }));
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/care', require('./routes/care'));
  app.get('/api/health', async (_req, res) => {
    const result = await getPool().query("SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version='001_governed_care') AS migrated");
    res.status(result.rows[0].migrated ? 200 : 503).json({ status: result.rows[0].migrated ? 'ready' : 'migration_required' });
  });
  app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
  app.use((error, _req, res, _next) => {
    const status = error instanceof CareError ? error.status : 500;
    res.status(status).json({ error: status === 500 ? 'Internal server error' : error.message, code: error.code || 'internal_error' });
  });
  return app;
}
module.exports = { createApp };
