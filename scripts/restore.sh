#!/usr/bin/env bash
# Restore a database dump produced by backup.sh, encrypted or not. Verified by verify-backup.sh.
#
#   scripts/restore.sh backups/db-20260608-191500.sql.gz.age
#
# Decryption — picks the mechanism from the file suffix:
#   *.age   needs BACKUP_AGE_IDENTITY (path to the age identity file holding the secret key)
#   *.gpg   needs BACKUP_GPG_PASSPHRASE
#   *.gz    plaintext (dev)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT/app"
DUMP="${1:?Usage: restore.sh <path/to/db-YYYYmmdd-HHMMSS.sql.gz[.age|.gpg]>}"

# Resolve DUMP relative to the current directory or the repo root.
[ -f "$DUMP" ] || DUMP="$ROOT/$DUMP"
[ -f "$DUMP" ] || { echo "Dump not found: $1" >&2; exit 1; }

# stdin (the raw artifact) -> stdout (the gzip stream), decrypting by suffix.
case "$DUMP" in
  *.age)
    command -v age >/dev/null || { echo "'age' is not installed" >&2; exit 1; }
    [ -n "${BACKUP_AGE_IDENTITY:-}" ] || { echo "set BACKUP_AGE_IDENTITY (path to the age identity file)" >&2; exit 1; }
    dec() { age -d -i "$BACKUP_AGE_IDENTITY"; } ;;
  *.gpg)
    command -v gpg >/dev/null || { echo "'gpg' is not installed" >&2; exit 1; }
    [ -n "${BACKUP_GPG_PASSPHRASE:-}" ] || { echo "set BACKUP_GPG_PASSPHRASE" >&2; exit 1; }
    dec() { gpg --batch --yes --quiet --decrypt --passphrase-fd 3 3<<<"$BACKUP_GPG_PASSPHRASE"; } ;;
  *.gz)
    dec() { cat; } ;;
  *)
    echo "Unrecognised dump suffix: $DUMP" >&2; exit 1 ;;
esac

cd "$APP_DIR"
echo "[restore] loading $DUMP into the organiser database"
dec < "$DUMP" | gunzip -c | docker compose exec -T db psql -v ON_ERROR_STOP=1 -U organiser -d organiser
echo "[restore] database restored."
echo "[restore] for resources, decrypt+untar the matching resources-*.tar.gz[.age|.gpg], e.g.:"
echo "[restore]   (age -d -i \"\$BACKUP_AGE_IDENTITY\" < backups/resources-STAMP.tar.gz.age) | tar xz -C \"$ROOT/data/resources\""
