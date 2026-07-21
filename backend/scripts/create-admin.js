process.env.PROVISION_EMAIL ||= process.env.PROVISION_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
process.env.PROVISION_NAME ||= process.env.PROVISION_ADMIN_NAME || process.env.BOOTSTRAP_ADMIN_NAME || 'Runtime Administrator';
process.env.PROVISION_PASSWORD ||= process.env.PROVISION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
process.env.PROVISION_ROLE = 'ADMIN';
process.env.PROVISION_ORGANIZATION_NAME ||= process.env.BOOTSTRAP_TENANT_SLUG || process.env.BOOTSTRAP_TENANT_NAME || 'runtime-tenant';

require('./create-user');
