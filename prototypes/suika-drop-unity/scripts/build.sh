#!/bin/bash
set -euo pipefail
UNITY_APP="/Applications/Unity/Hub/Editor/6000.3.28f1/Unity.app/Contents/MacOS/Unity"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Building Suika Fruit Drop Unity WebGL ==="
"$UNITY_APP" -batchmode -quit -projectPath "$PROJECT_DIR" \
    -executeMethod SuikaDropBuild.WebGL \
    -logFile "$PROJECT_DIR/Logs/build.log"

echo "=== Build Succeeded! Copying to game-oiyo public directory ==="
DEST_DIR="$PROJECT_DIR/../../public/prototypes/suika-drop-unity"
mkdir -p "$DEST_DIR"
cp -R "$PROJECT_DIR/Builds/WebGL/"* "$DEST_DIR/"
echo "=== Done! WebGL deployed to $DEST_DIR ==="
