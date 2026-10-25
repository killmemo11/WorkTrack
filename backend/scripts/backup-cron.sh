#!/usr/bin/env bash
# Copyright (c) 2026 Mohamed Yehia
# SPDX-License-Identifier: AGPL-3.0

# Daily entry point for cron. Runs exactly one tier per day: monthly on the 1st,
# weekly on Sundays, otherwise daily. backup.sh applies the matching retention.
#
# Crontab (on the server):
#   30 2 * * * /bin/bash ~/WorkTrack/backend/scripts/backup-cron.sh 2>&1 | logger -t worktrack-backup

set -euo pipefail

APP_DIR="${WORKTRACK_HOME:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DAY_OF_MONTH=$(date +%d)
DAY_OF_WEEK=$(date +%u)

if [ "$DAY_OF_MONTH" = "01" ]; then
  TIER=monthly
elif [ "$DAY_OF_WEEK" = "7" ]; then
  TIER=weekly
else
  TIER=daily
fi

WORKTRACK_HOME="$APP_DIR" bash "$APP_DIR/backend/scripts/backup.sh" "$TIER"

# A backup is only useful if it restores. Verify the monthly archive into a
# scratch database; disable with RUN_RESTORE_DRILL=false.
if [ "$TIER" = "monthly" ] && [ "${RUN_RESTORE_DRILL:-true}" = "true" ]; then
  bash "$APP_DIR/backend/scripts/restore.sh"
fi
