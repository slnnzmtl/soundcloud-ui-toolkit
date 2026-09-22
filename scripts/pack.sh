#!/usr/bin/env bash
# Build a Chrome Web Store zip with runtime files only.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")"
OUT_DIR="$ROOT/dist"
ZIP_NAME="soundcloud-wide-${VERSION}.zip"
ZIP_PATH="$OUT_DIR/$ZIP_NAME"

mkdir -p "$OUT_DIR"
rm -f "$ZIP_PATH"

zip -r "$ZIP_PATH" \
  manifest.json \
  background.js \
  content.js \
  styles.css \
  iframe-player.css \
  shared \
  popup \
  icons \
  -x "*.DS_Store" "*/.*"

echo "Wrote $ZIP_PATH"
unzip -l "$ZIP_PATH"
