#!/usr/bin/env bash
# Copyright (c) 2026 Mohamed Yehia
# SPDX-License-Identifier: AGPL-3.0

# Print (or install with --apply) the cron entry that runs database backups.
# The entry is tagged so re-running the installer does not duplicate it.

set -euo pipefail

APP_DIR="${WORKTRACK_HOME:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
TAG="# worktrack-backup"
LINE="30 2 * * * /bin/bash $APP_DIR/backend/scripts/backup-cron.sh 2>&1 | logger -t worktrack-backup $TAG"

if [ "${1:-}" != "--apply" ]; then
  echo "Add this line to crontab (or re-run with --apply):"
  echo "$LINE"
  exit 0
fi

command -v crontab >/dev/null 2>&1 || { echo "ERROR: crontab not found" >&2; exit 1; }

existing=$(crontab -l 2>/dev/null | grep -v -F "$TAG" || true)
{
  [ -n "$existing" ] && printf '%s\n' "$existing"
  printf '%s\n' "$LINE"
} | crontab -

echo "Installed: $LINE"
