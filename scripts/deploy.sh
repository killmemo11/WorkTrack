#!/usr/bin/env bash
# Copyright (c) 2026 Mohamed Yehia
# SPDX-License-Identifier: AGPL-3.0

# Deploy a checkout on the target host. Called by GitHub Actions over SSH:
#
#   APP_DIR=~/WorkTrack HEALTH_URL=https://worktrack.ddns.net/api/health \
#     bash scripts/deploy.sh
#
# Rollback is code-only: migrations are applied before the restart and are not
# reverted automatically. Keep migrations backward-compatible with the previous
# release (expand/contract), and restore the pre-deploy dump if a rollback needs
# the old schema.

set -Eeuo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
BRANCH="${DEPLOY_BRANCH:-main}"
PM2_APP="${PM2_APP:-worktrack-backend}"
HEALTH_URL="${HEALTH_URL:-https://worktrack.ddns.net/api/health}"
HEALTH_ATTEMPTS="${HEALTH_ATTEMPTS:-12}"
HEALTH_DELAY="${HEALTH_DELAY:-5}"
MIGRATION_BASELINE="${MIGRATION_BASELINE:-024}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
SKIP_BACKUP="${SKIP_BACKUP:-false}"
BACKUP_TYPE="${BACKUP_TYPE:-daily}"

log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*"; }

cd "$APP_DIR"
[ -d .git ] || { log "ERROR: $APP_DIR is not a git checkout"; exit 1; }

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  log "ERROR: tracked files were modified on the host; refusing to deploy"
  git status --short
  exit 1
fi

PREVIOUS_COMMIT=$(git rev-parse HEAD)

rollback() {
  local status=$?
  log "ERROR: deploy failed (exit $status); rolling code back to $PREVIOUS_COMMIT"
  log "WARNING: database migrations are not rolled back"
  trap - ERR
  git reset --hard "$PREVIOUS_COMMIT" || log "ERROR: git rollback failed"
  (cd backend && npm ci --omit=dev) || log "ERROR: backend rollback install failed"
  (cd frontend && npm ci && npm run build) || log "ERROR: frontend rollback build failed"
  pm2 restart "$PM2_APP" || log "ERROR: PM2 rollback restart failed"
  exit "$status"
}
trap rollback ERR

log "Fetching origin/$BRANCH"
git fetch --prune origin "$BRANCH"
git merge --ff-only "origin/$BRANCH"

TARGET_COMMIT=$(git rev-parse HEAD)
if [ "$PREVIOUS_COMMIT" = "$TARGET_COMMIT" ]; then
  log "Already at $TARGET_COMMIT; rebuilding anyway"
else
  log "Deploying $PREVIOUS_COMMIT -> $TARGET_COMMIT"
fi

log "Installing backend dependencies"
(cd backend && npm ci --omit=dev)

log "Building frontend"
(cd frontend && npm ci && npm run build)

if [ "$SKIP_BACKUP" != "true" ]; then
  log "Backing up database ($BACKUP_TYPE)"
  WORKTRACK_HOME="$APP_DIR" bash "$APP_DIR/backend/scripts/backup.sh" "$BACKUP_TYPE"
else
  log "Skipping pre-deploy backup (SKIP_BACKUP=true)"
fi

if [ "$RUN_MIGRATIONS" = "true" ]; then
  if [ -n "$MIGRATION_BASELINE" ] && [ "$MIGRATION_BASELINE" != "none" ]; then
    log "Recording baseline through migration $MIGRATION_BASELINE (no-op after first run)"
    node "$APP_DIR/backend/scripts/migrate.js" --baseline-through="$MIGRATION_BASELINE"
  fi
  log "Applying pending migrations"
  node "$APP_DIR/backend/scripts/migrate.js"
else
  log "Skipping migrations (RUN_MIGRATIONS=false)"
fi

log "Restarting $PM2_APP"
pm2 restart "$PM2_APP"

log "Health checking $HEALTH_URL"
healthy=0
for attempt in $(seq 1 "$HEALTH_ATTEMPTS"); do
  if curl -fsS --max-time 10 "$HEALTH_URL" >/dev/null; then
    healthy=1
    break
  fi
  log "Health check $attempt/$HEALTH_ATTEMPTS failed; retrying in ${HEALTH_DELAY}s"
  sleep "$HEALTH_DELAY"
done
if [ "$healthy" != "1" ]; then
  log "ERROR: health check never succeeded"
  curl -sS -o /dev/null -w 'last HTTP status: %{http_code}\n' --max-time 10 "$HEALTH_URL" || true
  false
fi

trap - ERR
log "Deploy complete: $TARGET_COMMIT"
