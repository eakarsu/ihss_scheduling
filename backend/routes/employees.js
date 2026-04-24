const createCrudRouter = require('./crudFactory');
const columns = ['employee_id', 'first_name', 'last_name', 'email', 'phone', 'role', 'department', 'store_name', 'district_name', 'hire_date', 'hourly_rate', 'employment_type', 'status'];
module.exports = createCrudRouter('employees', columns);
