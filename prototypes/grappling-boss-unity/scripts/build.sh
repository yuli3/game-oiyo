#!/bin/bash
# Builds the WebGL player into public/prototypes/grappling-boss-unity/ and drops the ~1GB Library cache
# afterwards (the 2026-11-21 disk-full lesson). Art and fonts are committed; rebuild them with
# scripts/make_art.py and scripts/build-fonts.py only when they change.
set -euo pipefail
UNITY_APP="${UNITY_EDITOR:-/Applications/Unity/Hub/Editor/6000.3.28f1/Unity.app/Contents/MacOS/Unity}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$PROJECT_DIR/Logs"
echo "=== Building Grappling Boss 3D Unity WebGL ==="
"$UNITY_APP" -batchmode -quit -projectPath "$PROJECT_DIR" \
    -executeMethod GrapplingBossBuild.WebGL \
    -logFile "$PROJECT_DIR/Logs/build.log"
DEST_DIR="$PROJECT_DIR/../../public/prototypes/grappling-boss-unity"
rm -rf "$DEST_DIR"
mkdir -p "$DEST_DIR"
cp -R "$PROJECT_DIR/Builds/WebGL/"* "$DEST_DIR/"
node "$PROJECT_DIR/../../scripts/unity/patch-unity-index.mjs"
if [ "${KEEP_LIBRARY:-0}" != "1" ]; then rm -rf "$PROJECT_DIR/Library" "$PROJECT_DIR/Builds" "$PROJECT_DIR/Temp"; fi
echo "=== Done: $DEST_DIR ($(du -sh "$DEST_DIR" | cut -f1)) ==="
