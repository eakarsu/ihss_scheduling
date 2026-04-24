const createCrudRouter = require('./crudFactory');
const columns = ['employee_name', 'store_name', 'request_type', 'start_date', 'end_date', 'total_days', 'reason', 'submitted_date', 'approved_by', 'status', 'notes'];
module.exports = createCrudRouter('time_off_requests', columns);
