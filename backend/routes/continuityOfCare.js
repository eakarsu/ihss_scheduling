const express = require('express');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json([
    { id: 1, client_name: 'Maria Lopez', caregiver_name: 'Ana Ruiz', continuity_score: 94, weekly_hours: 32, backup_gap: 'none', status: 'stable' },
    { id: 2, client_name: 'James Carter', caregiver_name: 'Tanya Bell', continuity_score: 71, weekly_hours: 28, backup_gap: 'weekend coverage', status: 'watch' },
    { id: 3, client_name: 'Evelyn Hart', caregiver_name: 'Marcus Lee', continuity_score: 58, weekly_hours: 40, backup_gap: 'overnight replacement', status: 'at risk' }
  ]);
});

module.exports = router;
