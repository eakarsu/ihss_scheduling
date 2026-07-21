#!/bin/sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"
if [ "${AUDIT_SIGNING_KEY:-}" = "" ] && [ "${JWT_REFRESH_SECRET:-}" != "" ]; then
  export AUDIT_SIGNING_KEY="$JWT_REFRESH_SECRET"
fi
if [ "${PHI_ENCRYPTION_KEY_BASE64:-}" = "" ] && [ "${MEMORY_ENCRYPTION_KEY_BASE64:-}" != "" ]; then
  export PHI_ENCRYPTION_KEY_BASE64="$MEMORY_ENCRYPTION_KEY_BASE64"
fi
if [ "${CORS_ORIGINS:-}" = "" ]; then
  export CORS_ORIGINS="http://127.0.0.1:${FRONTEND_PORT:-4000}"
fi
: "${AUDIT_SIGNING_KEY:?AUDIT_SIGNING_KEY is required}"
: "${PHI_ENCRYPTION_KEY_BASE64:?PHI_ENCRYPTION_KEY_BASE64 is required}"
: "${CORS_ORIGINS:?CORS_ORIGINS is required}"
if [ "${#JWT_SECRET}" -lt 32 ] || [ "${#AUDIT_SIGNING_KEY}" -lt 32 ]; then
  echo 'Signing secrets must be at least 32 characters' >&2
  exit 1
fi
exec npm --prefix backend start
