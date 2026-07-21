#!/bin/sh
set -eu
: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"
: "${RESTORE_INPUT:?RESTORE_INPUT must be an explicit backup file}"
[ "${ALLOW_NONPRODUCTION_RESTORE:-}" = 'RESTORE_EMPTY_NONPRODUCTION_DATABASE' ] || { echo 'Exact restore confirmation is required' >&2; exit 1; }
case "$RESTORE_DATABASE_URL" in *localhost*|*127.0.0.1*) ;; *) echo 'Restore target must be local/non-production' >&2; exit 1;; esac
[ -f "$RESTORE_INPUT" ] || { echo 'Backup file not found' >&2; exit 1; }
exec pg_restore --exit-on-error --clean --if-exists --no-owner --dbname="$RESTORE_DATABASE_URL" "$RESTORE_INPUT"
