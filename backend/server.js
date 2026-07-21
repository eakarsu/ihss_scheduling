const { createApp } = require('./app');
const { loadConfig } = require('./config');
const { getPool } = require('./db');

async function start() {
  const config = loadConfig();
  const migration = await getPool().query("SELECT checksum FROM schema_migrations WHERE version='001_governed_care'");
  if (!migration.rows[0]) throw new Error('Required migration 001_governed_care is not applied');
  createApp().listen(config.port, config.host, () => console.log(`IHSS care operations listening on ${config.port}`));
}
start().catch((error) => { console.error(error.message); process.exitCode = 1; });
