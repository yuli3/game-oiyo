#!/bin/sh
set -eu
project=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
case "${1:-probe}" in
  core)
    dotnet_cmd=${DOTNET_BIN:-dotnet}
    if ! command -v "$dotnet_cmd" >/dev/null 2>&1; then echo 'NOT ASSESSED: .NET SDK missing (set DOTNET_BIN)' >&2; exit 2; fi
    DOTNET_CLI_TELEMETRY_OPTOUT=1 "$dotnet_cmd" run --project "$project/Verification/CoreChecks.csproj" --configuration Release
    ;;
  probe|prepare|android)
    editor=${UNITY_EDITOR:-/Applications/Unity/Hub/Editor/6000.3.28f1/Unity.app/Contents/MacOS/Unity}
    if [ ! -x "$editor" ]; then echo 'NOT ASSESSED: Unity Editor missing (set UNITY_EDITOR)' >&2; exit 2; fi
    if [ "${1:-probe}" = probe ]; then "$editor" -version; exit; fi
    mkdir -p "$project/Logs"
    method=SliceBuild.Prepare
    if [ "$1" = android ]; then method=SliceBuild.Android; fi
    "$editor" -batchmode -quit -projectPath "$project" -executeMethod "$method" -logFile "$project/Logs/$1.log"
    ;;
  *) echo 'Usage: slice.sh probe|core|prepare|android' >&2; exit 2 ;;
esac
