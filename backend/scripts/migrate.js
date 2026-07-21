const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { getPool, closePool } = require('../db');

async function main() {
  const pool = getPool();
  const migration = fs.readFileSync(path.join(__dirname, '../db/migrations/001_governed_care.sql'), 'utf8');
  const checksum = crypto.createHash('sha256').update(migration).digest('hex');
  const legacy = await pool.query("SELECT to_regclass('public.users') AS users, to_regclass('public.schema_migrations') AS journal");
  if (legacy.rows[0].users && !legacy.rows[0].journal) throw new Error('Unversioned legacy schema detected; reviewed migration is required and automatic mutation is refused');
  if (!legacy.rows[0].journal) {
    await pool.query('BEGIN');
    try {
      await pool.query(migration);
      await pool.query('INSERT INTO schema_migrations(version, checksum) VALUES ($1,$2)', ['001_governed_care', checksum]);
      await pool.query('COMMIT');
    } catch (error) { await pool.query('ROLLBACK'); throw error; }
  } else {
    const applied = await pool.query('SELECT checksum FROM schema_migrations WHERE version=$1', ['001_governed_care']);
    if (!applied.rows[0] || applied.rows[0].checksum !== checksum) throw new Error('Migration checksum mismatch');
  }
  console.log('Migration 001_governed_care verified');
}

main().finally(closePool).catch((error) => { console.error(error.message); process.exitCode = 1; });
