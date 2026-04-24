const createCrudRouter = require('./crudFactory');
const columns = ['store_name', 'incident_type', 'description', 'severity', 'location', 'reported_by', 'date_reported', 'date_resolved', 'corrective_action', 'status', 'notes'];
module.exports = createCrudRouter('incidents', columns);
