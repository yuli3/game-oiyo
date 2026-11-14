#!/bin/sh
set -eu
project=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
case "${1:-probe}" in
  core)
    dotnet_cmd=${DOTNET_BIN:-/tmp/neon-unity-tools/dotnet/dotnet}
    if ! command -v "$dotnet_cmd" >/dev/null 2>&1; then dotnet_cmd=dotnet; fi
    if ! command -v "$dotnet_cmd" >/dev/null 2>&1; then echo 'NOT ASSESSED: .NET SDK missing (set DOTNET_BIN)' >&2; exit 2; fi
    DOTNET_CLI_HOME="${DOTNET_CLI_HOME:-/tmp}" DOTNET_CLI_TELEMETRY_OPTOUT=1 "$dotnet_cmd" run --project "$project/Verification/CoreChecks.csproj" --configuration Release
    ;;
  audit)
    dotnet_cmd=${DOTNET_BIN:-/tmp/neon-unity-tools/dotnet/dotnet}
    if ! command -v "$dotnet_cmd" >/dev/null 2>&1; then dotnet_cmd=dotnet; fi
    if ! command -v "$dotnet_cmd" >/dev/null 2>&1; then echo 'NOT ASSESSED: .NET SDK missing (set DOTNET_BIN)' >&2; exit 2; fi
    DOTNET_CLI_HOME="${DOTNET_CLI_HOME:-/tmp}" DOTNET_CLI_TELEMETRY_OPTOUT=1 "$dotnet_cmd" run --project "$project/Verification/SimulationAudit.csproj" --configuration Release
    ;;
  compile)
    dotnet_cmd=${DOTNET_BIN:-/tmp/neon-unity-tools/dotnet/dotnet}
    csc_dll="/tmp/neon-unity-tools/dotnet/sdk/10.0.404/Roslyn/bincore/csc.dll"
    rsp_dir="$project/Library/Bee/artifacts/2000b0aE.dag"
    if [ ! -f "$csc_dll" ] || [ ! -f "$rsp_dir/Assembly-CSharp.rsp" ]; then echo 'NOT ASSESSED: Roslyn csc or Unity Bee rsp missing' >&2; exit 2; fi
    (cd "$project" && "$dotnet_cmd" "$csc_dll" @"$rsp_dir/Assembly-CSharp.rsp" && "$dotnet_cmd" "$csc_dll" @"$rsp_dir/Assembly-CSharp-Editor.rsp" && cp "$rsp_dir/Assembly-CSharp.dll" "$project/Library/ScriptAssemblies/Assembly-CSharp.dll" && cp "$rsp_dir/Assembly-CSharp-Editor.dll" "$project/Library/ScriptAssemblies/Assembly-CSharp-Editor.dll")
    echo "UNITY MANAGED COMPILE: PASS (Assembly-CSharp.dll + Assembly-CSharp-Editor.dll)"
    ;;
  stage-web)
    rm -rf "$project/../../public/prototypes/neon-unity"
    mkdir -p "$project/../../public/prototypes/neon-unity"
    cp -R "$project/Builds/WebGL/"* "$project/../../public/prototypes/neon-unity/"
    echo "WEBGL STAGED: public/prototypes/neon-unity/"
    ;;
  probe|prepare|android|webgl)
    editor=${UNITY_EDITOR:-/Applications/Unity/Hub/Editor/6000.3.28f1/Unity.app/Contents/MacOS/Unity}
    if [ ! -x "$editor" ]; then echo 'NOT ASSESSED: Unity Editor missing (set UNITY_EDITOR)' >&2; exit 2; fi
    if [ "${1:-probe}" = probe ]; then "$editor" -version; exit; fi
    mkdir -p "$project/Logs"
    method=SliceBuild.Prepare
    if [ "$1" = android ]; then method=SliceBuild.Android; fi
    if [ "$1" = webgl ]; then method=SliceBuild.WebGL; fi
    "$editor" -batchmode -quit -projectPath "$project" -executeMethod "$method" -logFile "$project/Logs/$1.log"
    if [ "$1" = webgl ]; then
      rm -rf "$project/../../public/prototypes/neon-unity"
      mkdir -p "$project/../../public/prototypes/neon-unity"
      cp -R "$project/Builds/WebGL/"* "$project/../../public/prototypes/neon-unity/"
    fi
    ;;
  *) echo 'Usage: slice.sh probe|core|audit|compile|stage-web|prepare|android|webgl' >&2; exit 2 ;;
esac
