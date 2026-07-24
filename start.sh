#!/bin/sh
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$project_dir"
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi
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

api_port="${BACKEND_PORT:-${PORT:-}}"
ui_port="${FRONTEND_PORT:-${CLIENT_PORT:-}}"
case "$api_port:$ui_port" in *[!0-9:]*|:*) echo 'API and UI ports must be numeric' >&2; exit 2;; esac
if [ "$api_port" = "$ui_port" ]; then echo 'API and UI ports must be different' >&2; exit 2; fi
for assigned_port in "$api_port" "$ui_port"; do
  if lsof -tiTCP:"$assigned_port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Assigned port $assigned_port is already in use; no process was stopped" >&2
    exit 1
  fi
done

child_pids=""
cleanup() {
  trap - EXIT INT TERM
  for child_pid in $child_pids; do kill "$child_pid" >/dev/null 2>&1 || true; done
  for child_pid in $child_pids; do wait "$child_pid" >/dev/null 2>&1 || true; done
}
trap cleanup EXIT INT TERM

npm --prefix backend start &
backend_pid=$!
child_pids="$backend_pid"

VITE_API_URL="http://127.0.0.1:$api_port/api" npm --prefix frontend start -- --host 127.0.0.1 --port "$ui_port" --strictPort &
frontend_pid=$!
child_pids="$child_pids $frontend_pid"

echo "IHSS care API listening on http://127.0.0.1:$api_port"
echo "IHSS care UI listening on http://127.0.0.1:$ui_port"

while kill -0 "$backend_pid" >/dev/null 2>&1 && kill -0 "$frontend_pid" >/dev/null 2>&1; do sleep 1; done
runtime_result=1
if ! kill -0 "$backend_pid" >/dev/null 2>&1; then
  wait "$backend_pid" || runtime_result=$?
else
  wait "$frontend_pid" || runtime_result=$?
fi
exit "$runtime_result"
