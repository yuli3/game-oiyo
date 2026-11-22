#!/bin/sh
# Usage: scripts/build.sh probe|prepare|webgl
# webgl builds with Unity and stages the result at public/prototypes/firefly-keeper-unity/.
set -eu
project=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
editor=${UNITY_EDITOR:-/Applications/Unity/Hub/Editor/6000.3.28f1/Unity.app/Contents/MacOS/Unity}
if [ ! -x "$editor" ]; then echo 'NOT ASSESSED: Unity Editor missing (set UNITY_EDITOR)' >&2; exit 2; fi
mkdir -p "$project/Logs"
case "${1:-probe}" in
  probe) "$editor" -version ;;
  prepare) "$editor" -batchmode -nographics -quit -projectPath "$project" -executeMethod FireflyKeeper.Editor.FireflyKeeperBuild.Prepare -logFile "$project/Logs/prepare.log" ;;
  webgl)
    "$editor" -batchmode -nographics -quit -projectPath "$project" -executeMethod FireflyKeeper.Editor.FireflyKeeperBuild.BuildWebGL -logFile "$project/Logs/webgl.log"
    dest="$project/../../public/prototypes/firefly-keeper-unity"
    rm -rf "$dest"; mkdir -p "$dest"
    cp -R "$project/Builds/WebGL/"* "$dest/"
    node "$dest/../../../scripts/unity/patch-unity-index.mjs"
    echo "WEBGL STAGED: public/prototypes/firefly-keeper-unity/"
    ;;
  *) echo 'Usage: build.sh probe|prepare|webgl' >&2; exit 2 ;;
esac
