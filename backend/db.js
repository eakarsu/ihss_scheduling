const { Pool } = require('pg');
const { loadConfig } = require('./config');

let pool;
function getPool() {
  if (!pool) {
    const config = loadConfig();
    pool = new Pool({ connectionString: config.databaseUrl, ssl: config.databaseSsl ? { rejectUnauthorized: true } : false, max: 10 });
  }
  return pool;
}

async function closePool() {
  if (pool) await pool.end();
  pool = undefined;
}

module.exports = { getPool, closePool };
