const createCrudRouter = require('./crudFactory');
const columns = ['store_number', 'name', 'district_name', 'region_name', 'address', 'city', 'state', 'zip', 'phone', 'store_manager', 'square_footage', 'open_date', 'status'];
module.exports = createCrudRouter('stores', columns);
