const createCrudRouter = require('./crudFactory');
const columns = ['title', 'message', 'target_scope', 'target_name', 'priority', 'author', 'publish_date', 'expiry_date', 'category', 'status', 'notes'];
module.exports = createCrudRouter('announcements', columns);
