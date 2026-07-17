#!/bin/bash
# WorkTrack Database Backup Script
# Usage: ./backup.sh [daily|weekly|monthly]

set -euo pipefail

BACKUP_TYPE="${1:-daily}"
BACKUP_DIR="$HOME/WorkTrack/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/worktrack_${BACKUP_TYPE}_${TIMESTAMP}.sql"

# Source DB credentials from .env
source "$HOME/WorkTrack/.env"

mkdir -p "$BACKUP_DIR"

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
echo "[$(date)] Backup saved: ${BACKUP_FILE}.gz"

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
