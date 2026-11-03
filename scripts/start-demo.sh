#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
VECTOR_DIR="$ROOT_DIR/vector"
ENV_FILE="${ENV_FILE:-$FRONTEND_DIR/.env.local}"
APP_PORT="${APP_PORT:-3000}"
VECTOR_PORT="${VECTOR_PORT:-8001}"
LOG_DIR="$(mktemp -d -t autocare-demo.XXXXXX)"
WEB_PID=""
VECTOR_PID=""

say() { printf '[AutoCare] %s\n' "$*"; }
fail() { printf '[AutoCare] ERROR: %s\n' "$*" >&2; exit 1; }

cleanup() {
  local code=$?
  trap - EXIT INT TERM
  [[ -n "$WEB_PID" ]] && kill "$WEB_PID" 2>/dev/null || true
  [[ -n "$VECTOR_PID" ]] && kill "$VECTOR_PID" 2>/dev/null || true
  wait "$WEB_PID" "$VECTOR_PID" 2>/dev/null || true
  say "Services stopped. Logs remain in $LOG_DIR"
  exit "$code"
}
trap cleanup EXIT INT TERM

for command in node npm python3 curl; do
  command -v "$command" >/dev/null || fail "Missing required command: $command"
done

if [[ ! -f "$ENV_FILE" && -f "$FRONTEND_DIR/.env" ]]; then
  ENV_FILE="$FRONTEND_DIR/.env"
  say "Using frontend/.env; rename it to .env.local when convenient."
fi
[[ -f "$ENV_FILE" ]] || fail "Create frontend/.env.local from frontend/.env.example and fill in the values."

# The documented .env format is shell-compatible KEY=value assignments.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# This demo launcher is intentionally local-only, even if the environment file
# contains a stale or non-local service URL.
export VECTOR_SERVICE_URL="http://127.0.0.1:$VECTOR_PORT"

for name in DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME SESSION_SECRET; do
  [[ -n "${!name:-}" ]] || fail "$name is missing in $ENV_FILE"
done
[[ ${#SESSION_SECRET} -ge 32 && "$SESSION_SECRET" != replace-* ]] || \
  fail "SESSION_SECRET must be a non-placeholder value of at least 32 characters."

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  say "Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm ci)
fi

if [[ ! -x "$VECTOR_DIR/.venv/bin/python" ]]; then
  say "Creating the semantic-search virtual environment..."
  python3 -m venv "$VECTOR_DIR/.venv"
  "$VECTOR_DIR/.venv/bin/pip" install -r "$VECTOR_DIR/requirements.txt"
fi

say "Checking MySQL and preparing the demo accounts..."
(cd "$FRONTEND_DIR" && node --env-file="$ENV_FILE" scripts/seed.mjs) || \
  fail "Database setup failed. Run sql/00_install_all.sql and check the DB_* values."

say "Starting semantic search on http://127.0.0.1:$VECTOR_PORT ..."
(
  cd "$VECTOR_DIR"
  exec "$VECTOR_DIR/.venv/bin/python" -m uvicorn service:app --host 127.0.0.1 --port "$VECTOR_PORT"
) >"$LOG_DIR/vector.log" 2>&1 &
VECTOR_PID=$!

vector_curl=(curl -fsS --max-time 3)
if [[ -n "${VECTOR_SERVICE_TOKEN:-}" ]]; then
  vector_curl+=(-H "X-Internal-Token: $VECTOR_SERVICE_TOKEN")
fi

ready=false
for ((attempt=1; attempt<=90; attempt++)); do
  if "${vector_curl[@]}" "http://127.0.0.1:$VECTOR_PORT/health" >"$LOG_DIR/vector-health.json" 2>/dev/null; then
    ready=true
    break
  fi
  kill -0 "$VECTOR_PID" 2>/dev/null || {
    tail -40 "$LOG_DIR/vector.log" >&2
    fail "Semantic-search service exited during startup."
  }
  (( attempt % 10 == 0 )) && say "Semantic model is still loading ($((attempt * 2))s)..."
  sleep 2
done
[[ "$ready" == true ]] || fail "Semantic search did not become ready; see $LOG_DIR/vector.log"

if ! python3 - "$LOG_DIR/vector-health.json" <<'PY'
import json, sys
health = json.load(open(sys.argv[1], encoding="utf-8"))
print(f"[AutoCare] Vector model: {health['embedding_model']} | indexed notes: {health['documents']} | metric: {health['metric']}")
raise SystemExit(1 if health.get("degraded") or health.get("last_error") else 0)
PY
then
  say "WARNING: Vector health is degraded. Read vector.log before demonstrating meaning-only search."
fi

say "Starting the web app on http://localhost:$APP_PORT ..."
(
  cd "$FRONTEND_DIR"
  exec ./node_modules/.bin/next dev -H 127.0.0.1 -p "$APP_PORT"
) >"$LOG_DIR/web.log" 2>&1 &
WEB_PID=$!

ready=false
for ((attempt=1; attempt<=60; attempt++)); do
  if curl -fsS --max-time 3 "http://127.0.0.1:$APP_PORT/api/status" >"$LOG_DIR/app-status.json" 2>/dev/null; then
    ready=true
    break
  fi
  kill -0 "$WEB_PID" 2>/dev/null || {
    tail -40 "$LOG_DIR/web.log" >&2
    fail "Web app exited during startup."
  }
  sleep 1
done
[[ "$ready" == true ]] || fail "Web app did not become ready; see $LOG_DIR/web.log"

say "Demo is ready: http://localhost:$APP_PORT/login"
say "Logs: $LOG_DIR (web.log and vector.log)"
say "Press Ctrl+C to stop both services cleanly."

# Exit if either service dies; the trap then stops its companion.
wait -n "$WEB_PID" "$VECTOR_PID" || true
fail "A demo service stopped unexpectedly; inspect $LOG_DIR"
