const createCrudRouter = require('./crudFactory');
const columns = ['name', 'code', 'region_name', 'district_manager', 'city', 'state', 'total_stores', 'total_employees', 'status'];
module.exports = createCrudRouter('districts', columns);
