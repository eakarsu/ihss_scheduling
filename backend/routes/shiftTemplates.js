const createCrudRouter = require('./crudFactory');
const columns = ['name', 'store_name', 'department', 'start_time', 'end_time', 'hours', 'break_minutes', 'min_staff', 'max_staff', 'days_applicable', 'status', 'notes'];
module.exports = createCrudRouter('shift_templates', columns);
