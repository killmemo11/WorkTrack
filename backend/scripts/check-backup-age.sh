#!/usr/bin/env bash
# Copyright (c) 2026 Mohamed Yehia
# SPDX-License-Identifier: AGPL-3.0

# Fail when the newest backup is older than MAX_AGE_HOURS (default 30).
# Useful from cron, an external monitor, or a deploy preflight.

set -euo pipefail

APP_DIR="${WORKTRACK_HOME:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
MAX_AGE_HOURS="${MAX_AGE_HOURS:-30}"

latest=$(ls -1t "$BACKUP_DIR"/worktrack_*.sql.gz 2>/dev/null | head -n 1 || true)
if [ -z "$latest" ]; then
  echo "ERROR: no backups found in $BACKUP_DIR" >&2
  exit 1
fi

age_hours=$(( ( $(date +%s) - $(stat -c %Y "$latest") ) / 3600 ))
if [ "$age_hours" -gt "$MAX_AGE_HOURS" ]; then
  echo "ERROR: newest backup is ${age_hours}h old (limit ${MAX_AGE_HOURS}h): $latest" >&2
  exit 1
fi

echo "OK: newest backup is ${age_hours}h old: $latest"
