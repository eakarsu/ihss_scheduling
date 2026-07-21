#!/bin/sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_OUTPUT:?BACKUP_OUTPUT must be an explicit destination file}"
case "$BACKUP_OUTPUT" in /*) ;; *) echo 'BACKUP_OUTPUT must be absolute' >&2; exit 1;; esac
umask 077
exec pg_dump --format=custom --no-owner --file="$BACKUP_OUTPUT" "$DATABASE_URL"
