const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: __dirname + '/../.env' });

const app = express();
const PORT = process.env.BACKEND_PORT || 4001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/regions', require('./routes/regions'));
app.use('/api/districts', require('./routes/districts'));
app.use('/api/stores', require('./routes/stores'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/shift-templates', require('./routes/shiftTemplates'));
app.use('/api/time-off', require('./routes/timeOff'));
app.use('/api/availability', require('./routes/availability'));
app.use('/api/coverage', require('./routes/coverage'));
app.use('/api/demand-forecast', require('./routes/demandForecast'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/training', require('./routes/training'));
app.use('/api/performance', require('./routes/performance'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/swap-requests', require('./routes/swapRequests'));
app.use('/api/labor-compliance', require('./routes/laborCompliance'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.listen(PORT, () => {
  console.log(`IHSS Scheduling Backend running on port ${PORT}`);
});
