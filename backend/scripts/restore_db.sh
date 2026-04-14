#!/bin/bash
# ══════════════════════════════════════════════════════
# WellKOC — Emergency Database Restore Script
# Usage: ./restore_db.sh backups/wellkoc_20250415_010000.sql.gz
# ══════════════════════════════════════════════════════

set -e

BACKUP_FILE="${1}"

if [ -z "$BACKUP_FILE" ]; then
  echo "❌ Usage: $0 <backup_file.sql.gz>"
  echo ""
  echo "Available backups:"
  ls -lh backups/*.sql.gz 2>/dev/null || echo "  No backups found"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ File not found: $BACKUP_FILE"
  exit 1
fi

# Load env
source .env 2>/dev/null || true

DB_HOST="${DB_HOST:-db.gltdkplfukjfpajwftzd.supabase.co}"
DB_PORT="${DB_PORT:-6543}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-postgres}"

echo "══════════════════════════════════════════════"
echo "⚠️  WellKOC Emergency DB Restore"
echo "══════════════════════════════════════════════"
echo "  Host    : $DB_HOST:$DB_PORT"
echo "  Database: $DB_NAME"
echo "  Backup  : $BACKUP_FILE ($(du -sh $BACKUP_FILE | cut -f1))"
echo ""
echo "🚨 This will OVERWRITE the current database!"
read -p "   Type 'RESTORE' to confirm: " CONFIRM

if [ "$CONFIRM" != "RESTORE" ]; then
  echo "❌ Cancelled."
  exit 0
fi

echo ""
echo "⏳ Restoring..."

PGPASSWORD="${DB_PASSWORD}" \
  gunzip -c "$BACKUP_FILE" | psql \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --set ON_ERROR_STOP=off \
    2>&1

echo ""
echo "✅ Restore complete from: $BACKUP_FILE"
echo "   $(date '+%Y-%m-%d %H:%M:%S ICT')"
