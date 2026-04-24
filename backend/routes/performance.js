const createCrudRouter = require('./crudFactory');
const columns = ['employee_name', 'store_name', 'review_period', 'reviewer', 'overall_rating', 'attendance_score', 'productivity_score', 'teamwork_score', 'goals', 'strengths', 'improvements', 'status'];
module.exports = createCrudRouter('performance_reviews', columns);
