const createCrudRouter = require('./crudFactory');
const columns = ['employee_name', 'store_name', 'pay_period', 'regular_hours', 'overtime_hours', 'hourly_rate', 'regular_pay', 'overtime_pay', 'total_pay', 'deductions', 'net_pay', 'status'];
module.exports = createCrudRouter('payroll', columns);
