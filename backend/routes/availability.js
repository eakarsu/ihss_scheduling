const createCrudRouter = require('./crudFactory');
const columns = ['employee_name', 'store_name', 'day_of_week', 'available_from', 'available_to', 'max_hours', 'preferred_shift', 'effective_date', 'expiry_date', 'status', 'notes'];
module.exports = createCrudRouter('availability', columns);
