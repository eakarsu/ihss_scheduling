const router = require('express').Router;
const pool = require('../db');
const auth = require('../middleware/auth');

function createCrudRouter(tableName, columns) {
  const r = router();

  r.get('/', auth, async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${tableName} ORDER BY id DESC`);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  r.get('/:id', auth, async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${tableName} WHERE id=$1`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  r.post('/', auth, async (req, res) => {
    try {
      const cols = columns.filter((c) => req.body[c] !== undefined);
      const vals = cols.map((c) => req.body[c]);
      const placeholders = cols.map((_, i) => `$${i + 1}`);
      const result = await pool.query(
        `INSERT INTO ${tableName} (${cols.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
        vals
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  r.put('/:id', auth, async (req, res) => {
    try {
      const cols = columns.filter((c) => req.body[c] !== undefined);
      const vals = cols.map((c) => req.body[c]);
      const sets = cols.map((c, i) => `${c}=$${i + 1}`);
      vals.push(req.params.id);
      const result = await pool.query(
        `UPDATE ${tableName} SET ${sets.join(',')} WHERE id=$${vals.length} RETURNING *`,
        vals
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  r.delete('/:id', auth, async (req, res) => {
    try {
      const result = await pool.query(`DELETE FROM ${tableName} WHERE id=$1 RETURNING *`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return r;
}

module.exports = createCrudRouter;
