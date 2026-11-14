#!/bin/sh
set -eu
project=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
editor=${UNITY_EDITOR:-/Applications/Unity/Hub/Editor/6000.3.28f1/Unity.app/Contents/MacOS/Unity}
if [ ! -x "$editor" ]; then
  echo 'Unity 6000.3.28f1 Editor missing' >&2
  exit 2
fi
mkdir -p "$project/Logs"
"$editor" -batchmode -quit -projectPath "$project" -executeMethod FrostpunkBuild.WebGL -logFile "$project/Logs/webgl.log"
rm -rf "$project/../../public/prototypes/frostpunk-ring-unity"
mkdir -p "$project/../../public/prototypes/frostpunk-ring-unity"
cp -R "$project/Builds/WebGL/"* "$project/../../public/prototypes/frostpunk-ring-unity/"
echo "WEBGL STAGED: public/prototypes/frostpunk-ring-unity/"
