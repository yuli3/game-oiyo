#!/usr/bin/env bash
set -e
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
UNITY_BIN="/Applications/Unity/Hub/Editor/6000.3.28f1/Unity.app/Contents/MacOS/Unity"
LOG_FILE="$PROJECT_DIR/build_webgl.log"
BUILD_OUTPUT="$PROJECT_DIR/../../public/prototypes/paper-flight-unity"

echo "=== Building Paper Flight 3D Unity WebGL ==="
"$UNITY_BIN" \
  -batchmode \
  -quit \
  -projectPath "$PROJECT_DIR" \
  -executeMethod PaperFlight.Editor.PaperFlightBuild.BuildWebGL \
  -logFile "$LOG_FILE"

echo "=== Build Succeeded! Copying to game-oiyo public directory ==="
mkdir -p "$BUILD_OUTPUT"
cp -R "$PROJECT_DIR/Builds/WebGL/"* "$BUILD_OUTPUT/"
node "$BUILD_OUTPUT/../../../scripts/unity/patch-unity-index.mjs"
echo "=== Done! WebGL deployed to $BUILD_OUTPUT ==="
