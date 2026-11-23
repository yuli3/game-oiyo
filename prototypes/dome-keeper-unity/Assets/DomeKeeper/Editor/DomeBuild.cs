using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class DomeBuild
{
    const string ScenePath = "Assets/DomeKeeper/DomeSlice.unity";

    public static void Prepare()
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        new GameObject("DomeKeeperController").AddComponent<DomeKeeperPlayer>();
        EditorSceneManager.SaveScene(scene, ScenePath);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        PlayerSettings.companyName = "OIYO";
        PlayerSettings.productName = "Drill Dome Defense";
        PlayerSettings.defaultInterfaceOrientation = UIOrientation.AutoRotation;
        PlayerSettings.runInBackground = true; // keep running when the page iframe has no focus (2026-11-23)
        AssetDatabase.SaveAssets();
    }

    public static void WebGL()
    {
        Prepare();
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
        PlayerSettings.WebGL.decompressionFallback = true;
        if (Directory.Exists("Builds/WebGL/Build")) Directory.Delete("Builds/WebGL/Build", true);
        Directory.CreateDirectory("Builds/WebGL");
        var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
        {
            scenes = new[] { ScenePath },
            locationPathName = "Builds/WebGL",
            target = BuildTarget.WebGL,
            options = BuildOptions.None
        });
        if (report.summary.result != BuildResult.Succeeded)
        {
            throw new Exception("DomeKeeper WebGL build failed: " + report.summary.result);
        }

        string indexHtmlPath = "Builds/WebGL/index.html";
        if (File.Exists(indexHtmlPath))
        {
            string html = File.ReadAllText(indexHtmlPath);
            html = html.Replace("canvas.style.width = \"960px\";", "canvas.style.width = \"100vw\";")
                       .Replace("canvas.style.height = \"600px\";", "canvas.style.height = \"100dvh\";")
                       .Replace("</head>", "<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#090E18;touch-action:none;}#unity-container{position:fixed!important;inset:0!important;transform:none!important;width:100vw!important;height:100dvh!important;display:flex;align-items:center;justify-content:center;background:#090E18;}#unity-canvas{width:100vw!important;height:100dvh!important;background:#090E18;touch-action:none;}#unity-footer{display:none!important;}</style></head>");
            html = System.Text.RegularExpressions.Regex.Replace(html, "<title>[^<]*</title>", "<title>Drill Dome Defense · OIYO</title>");
            File.WriteAllText(indexHtmlPath, html);
        }
    }
}
