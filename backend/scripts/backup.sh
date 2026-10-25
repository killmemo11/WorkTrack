#!/bin/bash
# WorkTrack Database Backup Script
# Usage: ./backup.sh [daily|weekly|monthly]
# Env:   WORKTRACK_HOME  repository root (defaults to this script's checkout)
#        BACKUP_DIR      destination directory (defaults to $WORKTRACK_HOME/backups)

set -euo pipefail

umask 077

BACKUP_TYPE="${1:-daily}"
APP_DIR="${WORKTRACK_HOME:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/worktrack_${BACKUP_TYPE}_${TIMESTAMP}.sql"

# Source DB credentials from .env
source "$APP_DIR/.env"

mkdir -p "$BACKUP_DIR"
trap 'rm -f "$BACKUP_FILE" "${BACKUP_FILE}.gz"' ERR

echo "[$(date)] Starting $BACKUP_TYPE backup..."

mysqldump \
  -u "$DB_USER" \
  -p"$DB_PASSWORD" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --add-drop-table \
  "$DB_NAME" > "$BACKUP_FILE"

gzip "$BACKUP_FILE"
gzip -t "${BACKUP_FILE}.gz"
SIZE=$(wc -c < "${BACKUP_FILE}.gz")
if [ "$SIZE" -lt 1024 ]; then
  rm -f "$BACKUP_FILE" "${BACKUP_FILE}.gz"
  echo "ERROR: backup is suspiciously small (${SIZE} bytes)" >&2
  exit 1
fi
trap - ERR
echo "[$(date)] Backup saved: ${BACKUP_FILE}.gz (${SIZE} bytes)"

# Retention: keep daily for 7 days, weekly for 4 weeks, monthly for 12 months
case "$BACKUP_TYPE" in
  daily)
    find "$BACKUP_DIR" -name "worktrack_daily_*.sql.gz" -mtime +7 -delete 2>/dev/null || true
    ;;
  weekly)
    find "$BACKUP_DIR" -name "worktrack_weekly_*.sql.gz" -mtime +28 -delete 2>/dev/null || true
    ;;
  monthly)
    find "$BACKUP_DIR" -name "worktrack_monthly_*.sql.gz" -mtime +365 -delete 2>/dev/null || true
    ;;
esac

echo "[$(date)] Backup complete. Retention cleanup done."
