#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SETS_DIR="$ROOT_DIR/sets"
TEMPLATE_DIR="$SETS_DIR/_template"
INDEX_FILE="$SETS_DIR/index.json"

usage() {
  cat <<'USAGE'
Gebruik:
  ./scripts/new-set.sh <set-id> [Titel]

Voorbeeld:
  ./scripts/new-set.sh teamreflectie "Team reflectie"
USAGE
}

if [ "${1-}" = "-h" ] || [ "${1-}" = "--help" ]; then
  usage
  exit 0
fi

if [ $# -lt 1 ]; then
  usage
  exit 1
fi

RAW_ID="$1"
RAW_TITLE="${2:-$1}"

SET_ID="$(printf '%s' "$RAW_ID" \
  | tr '[:upper:]' '[:lower:]' \
  | tr ' _' '--' \
  | sed -E 's/[^a-z0-9-]//g; s/-+/-/g; s/^-+//; s/-+$//')"

if [ -z "$SET_ID" ]; then
  echo "Fout: set-id is leeg na normalisatie." >&2
  exit 1
fi

if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "Fout: template map ontbreekt: $TEMPLATE_DIR" >&2
  exit 1
fi

if [ ! -f "$INDEX_FILE" ]; then
  echo "Fout: sets index ontbreekt: $INDEX_FILE" >&2
  exit 1
fi

TARGET_DIR="$SETS_DIR/$SET_ID"
if [ -e "$TARGET_DIR" ]; then
  echo "Fout: set bestaat al: $TARGET_DIR" >&2
  exit 1
fi

cp -R "$TEMPLATE_DIR" "$TARGET_DIR"
find "$TARGET_DIR" -name '.DS_Store' -delete

ESC_TITLE="$(printf '%s' "$RAW_TITLE" | sed -e 's/[&|]/\\&/g')"
for f in "$TARGET_DIR/meta.json" "$TARGET_DIR/intro.json"; do
  tmp="$(mktemp)"
  sed "s|__SET_ID__|$SET_ID|g; s|__SET_TITLE__|$ESC_TITLE|g" "$f" > "$tmp"
  mv "$tmp" "$f"
done

tmp_index="$(mktemp)"
jq --arg id "$SET_ID" --arg title "$RAW_TITLE" '
  .sets = ((.sets // []) | map(select(.id != $id)) + [{id:$id,title:$title}]) |
  .available = ((.available // []) | map(select(.id != $id)) + [{id:$id,title:$title}]) |
  .default = (if ((.default // "") | tostring | length) > 0 then .default else $id end)
' "$INDEX_FILE" > "$tmp_index"
mv "$tmp_index" "$INDEX_FILE"

echo "Nieuwe set aangemaakt: sets/$SET_ID"
echo "Opgenomen in sets/index.json met titel: $RAW_TITLE"
echo "Volgende stap: vervang in sets/$SET_ID de voorbeeldvragen en SVG kaarten."
