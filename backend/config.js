function required(name, env = process.env) {
  const value = env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function loadConfig(env = process.env) {
  const jwtSecret = required('JWT_SECRET', env);
  const auditKey = env.AUDIT_SIGNING_KEY || env.JWT_REFRESH_SECRET;
  const encryptionValue = env.PHI_ENCRYPTION_KEY_BASE64 || env.MEMORY_ENCRYPTION_KEY_BASE64;
  if (!auditKey) throw new Error('AUDIT_SIGNING_KEY is required');
  if (!encryptionValue) throw new Error('PHI_ENCRYPTION_KEY_BASE64 is required');
  const encryption = Buffer.from(encryptionValue, 'base64');
  if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  if (auditKey.length < 32) throw new Error('AUDIT_SIGNING_KEY must be at least 32 characters');
  if (encryption.length !== 32) throw new Error('PHI_ENCRYPTION_KEY_BASE64 must decode to exactly 32 bytes');
  const origins = (env.CORS_ORIGINS || `http://127.0.0.1:${env.FRONTEND_PORT || 4000}`).split(',').map((value) => value.trim()).filter(Boolean);
  if (origins.some((value) => value === '*')) throw new Error('Wildcard CORS is forbidden');
  const databaseUrl = new URL(required('DATABASE_URL', env));
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) throw new Error('DATABASE_URL must be PostgreSQL');
  if (env.NODE_ENV === 'production' && ['localhost', '127.0.0.1'].includes(databaseUrl.hostname)) throw new Error('Production database cannot be loopback');
  if (env.NODE_ENV === 'production' && env.DATABASE_SSL_REQUIRED !== 'true') throw new Error('Production requires verified database TLS');
  if (env.NODE_ENV === 'production' && env.FHIR_API_URL && new URL(env.FHIR_API_URL).protocol !== 'https:') throw new Error('Production FHIR_API_URL must use HTTPS');
  return {
    databaseUrl: databaseUrl.toString(), jwtSecret, auditKey, encryptionKey: encryption, origins,
    issuer: env.JWT_ISSUER || 'ihss-care-operations', audience: env.JWT_AUDIENCE || 'ihss-care-client',
    host: env.HOST || '127.0.0.1', port: Number(env.BACKEND_PORT || 4001), databaseSsl: env.DATABASE_SSL_REQUIRED === 'true',
    fhirUrl: env.FHIR_API_URL || null, fhirToken: env.FHIR_API_TOKEN || null,
  };
}

module.exports = { loadConfig };
