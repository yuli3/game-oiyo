#!/usr/bin/env bash
set -e
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
UNITY_BIN="/Applications/Unity/Hub/Editor/6000.3.28f1/Unity.app/Contents/MacOS/Unity"
LOG_FILE="$PROJECT_DIR/build_webgl.log"
BUILD_OUTPUT="$PROJECT_DIR/../../public/prototypes/space-pinball-unity"

echo "=== Building Space Pinball 3D Unity WebGL ==="
"$UNITY_BIN" \
  -batchmode \
  -quit \
  -projectPath "$PROJECT_DIR" \
  -executeMethod SpacePinball.Editor.SpacePinballBuild.BuildWebGL \
  -logFile "$LOG_FILE"

echo "=== Build Succeeded! Copying to game-oiyo public directory ==="
mkdir -p "$BUILD_OUTPUT"
cp -R "$PROJECT_DIR/Builds/WebGL/"* "$BUILD_OUTPUT/"
echo "=== Done! WebGL deployed to $BUILD_OUTPUT ==="
