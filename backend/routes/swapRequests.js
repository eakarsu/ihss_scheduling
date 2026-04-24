const createCrudRouter = require('./crudFactory');
const columns = ['requester_name', 'swap_with_name', 'store_name', 'original_date', 'original_shift', 'swap_date', 'swap_shift', 'reason', 'approved_by', 'status', 'notes'];
module.exports = createCrudRouter('swap_requests', columns);
