#!/bin/sh
set -eu
project=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
editor=${UNITY_EDITOR:-/Applications/Unity/Hub/Editor/6000.3.28f1/Unity.app/Contents/MacOS/Unity}
if [ ! -x "$editor" ]; then
  echo 'Unity 6000.3.28f1 Editor missing' >&2
  exit 2
fi
mkdir -p "$project/Logs"
"$editor" -batchmode -quit -projectPath "$project" -executeMethod CozyGliderBuild.WebGL -logFile "$project/Logs/webgl.log"
rm -rf "$project/../../public/prototypes/cozy-glider-unity"
mkdir -p "$project/../../public/prototypes/cozy-glider-unity"
cp -R "$project/Builds/WebGL/"* "$project/../../public/prototypes/cozy-glider-unity/"
echo "WEBGL STAGED: public/prototypes/cozy-glider-unity/"
