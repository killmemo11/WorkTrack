#!/usr/bin/env bash
# Copyright (c) 2026 Mohamed Yehia
# SPDX-License-Identifier: AGPL-3.0

# Restore a backup into a scratch database and verify it. Never restores over
# the live database unless explicitly forced.
#
#   bash backend/scripts/restore.sh [/path/to/worktrack_daily_*.sql.gz]
#
# Env:
#   RESTORE_DB                  scratch database (default: ${DB_NAME}_restore_verify)
#   KEEP_RESTORE_DB=true        keep the scratch database for inspection
#   ALLOW_EXISTING_RESTORE_DB=true
#                               replace an existing scratch database
#   ALLOW_PRODUCTION_RESTORE=true
#                               permit RESTORE_DB to equal DB_NAME (dangerous)
#   MYSQL_BIN                   client binary (default: mysql)
#   SKIP_DOTENV=true            do not read $WORKTRACK_HOME/.env

set -Eeuo pipefail
umask 077

APP_DIR="${WORKTRACK_HOME:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
BACKUP_FILE="${1:-}"
KEEP_RESTORE_DB="${KEEP_RESTORE_DB:-false}"

if [ -f "$APP_DIR/.env" ] && [ "${SKIP_DOTENV:-false}" != "true" ]; then
  source "$APP_DIR/.env"
fi

: "${DB_USER:?DB_USER is required}"
: "${DB_NAME:?DB_NAME is required}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"

RESTORE_DB="${RESTORE_DB:-${DB_NAME}_restore_verify}"
if ! [[ "$RESTORE_DB" =~ ^[A-Za-z0-9_]+$ ]]; then
  echo "ERROR: RESTORE_DB may only contain letters, digits and underscores" >&2
  exit 1
fi
if [ "$RESTORE_DB" = "$DB_NAME" ] && [ "${ALLOW_PRODUCTION_RESTORE:-false}" != "true" ]; then
  echo "ERROR: refusing to restore over the live database ($DB_NAME)" >&2
  exit 1
fi

if [ -z "$BACKUP_FILE" ]; then
  BACKUP_FILE=$(ls -1t "$APP_DIR"/backups/worktrack_*.sql.gz 2>/dev/null | head -n 1 || true)
fi
if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: backup file not found; pass a path or place one in $APP_DIR/backups" >&2
  exit 1
fi
if [ "$(wc -c < "$BACKUP_FILE")" -lt 1024 ]; then
  echo "ERROR: ${BACKUP_FILE} is suspiciously small" >&2
  exit 1
fi
if ! gzip -t "$BACKUP_FILE"; then
  echo "ERROR: ${BACKUP_FILE} is not a valid gzip file" >&2
  exit 1
fi

MYSQL_BIN="${MYSQL_BIN:-mysql}"
command -v "$MYSQL_BIN" >/dev/null 2>&1 || {
  echo "ERROR: $MYSQL_BIN not found; set MYSQL_BIN to the client binary" >&2
  exit 1
}

export MYSQL_PWD="${DB_PASSWORD:-}"
MYSQL=("$MYSQL_BIN" --default-character-set=utf8mb4 -u "$DB_USER")
if [ -n "${DB_SOCKET:-}" ]; then
  MYSQL+=(--socket="$DB_SOCKET")
else
  MYSQL+=(--protocol=TCP -h "$DB_HOST" -P "$DB_PORT")
fi

exists=$("${MYSQL[@]}" -N -e "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '$RESTORE_DB'")
if [ "$exists" -gt 0 ]; then
  if [ "${ALLOW_EXISTING_RESTORE_DB:-false}" != "true" ]; then
    echo "ERROR: database $RESTORE_DB already exists; set ALLOW_EXISTING_RESTORE_DB=true to replace it" >&2
    exit 1
  fi
  echo "Dropping existing scratch database $RESTORE_DB"
  "${MYSQL[@]}" -e "DROP DATABASE \`$RESTORE_DB\`"
fi

cleanup() {
  if [ "${KEEP_RESTORE_DB}" != "true" ]; then
    "${MYSQL[@]}" -e "DROP DATABASE IF EXISTS \`$RESTORE_DB\`" >/dev/null 2>&1 || true
  else
    echo "Scratch database kept: $RESTORE_DB"
  fi
}
trap cleanup EXIT

echo "Creating $RESTORE_DB and restoring $(basename "$BACKUP_FILE")"
"${MYSQL[@]}" -e "CREATE DATABASE \`$RESTORE_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
gzip -dc "$BACKUP_FILE" | "${MYSQL[@]}" "$RESTORE_DB"

tables=$("${MYSQL[@]}" -N -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$RESTORE_DB'")
employees_table=$("${MYSQL[@]}" -N -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$RESTORE_DB' AND TABLE_NAME = 'employees'")
if [ "$tables" -lt 10 ] || [ "$employees_table" -ne 1 ]; then
  echo "ERROR: restored schema looks incomplete (tables=$tables, employees=$employees_table)" >&2
  if [ "$KEEP_RESTORE_DB" != "true" ]; then
    echo "Set KEEP_RESTORE_DB=true to inspect the scratch database" >&2
  fi
  exit 1
fi

employees=$("${MYSQL[@]}" -N -e "SELECT COUNT(*) FROM \`$RESTORE_DB\`.employees")
echo "Restore drill passed: ${tables} tables, ${employees} employee rows"
