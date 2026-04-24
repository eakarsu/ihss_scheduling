const createCrudRouter = require('./crudFactory');
const columns = ['employee_name', 'store_name', 'training_name', 'category', 'required_by', 'completed_date', 'expiry_date', 'score', 'instructor', 'certification_id', 'status', 'notes'];
module.exports = createCrudRouter('training', columns);
