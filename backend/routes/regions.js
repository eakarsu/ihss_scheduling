const createCrudRouter = require('./crudFactory');
const columns = ['name', 'code', 'description', 'regional_manager', 'headquarters_city', 'states_covered', 'total_stores', 'total_employees', 'status'];
module.exports = createCrudRouter('regions', columns);
