using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class PeglinRogueBuild
{
    const string ScenePath = "Assets/PeglinRogue/PeglinSlice.unity";

    public static void Prepare()
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        new GameObject("PeglinRogueController").AddComponent<PeglinRoguePlayer>();
        EditorSceneManager.SaveScene(scene, ScenePath);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        PlayerSettings.companyName = "OIYO";
        PlayerSettings.productName = "Peglin Rogue Unity";
        PlayerSettings.defaultInterfaceOrientation = UIOrientation.AutoRotation;
        PlayerSettings.runInBackground = false;
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
            throw new Exception("PeglinRogue WebGL build failed: " + report.summary.result);
        }

        string indexHtmlPath = "Builds/WebGL/index.html";
        if (File.Exists(indexHtmlPath))
        {
            string html = File.ReadAllText(indexHtmlPath);
            html = html.Replace("canvas.style.width = \"960px\";", "canvas.style.width = \"100vw\";")
                       .Replace("canvas.style.height = \"600px\";", "canvas.style.height = \"100dvh\";")
                       .Replace("</head>", "<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#0f172a;touch-action:none;}#unity-container{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;display:flex;align-items:center;justify-content:center;background:#0f172a;}#unity-canvas{width:100vw!important;height:100dvh!important;background:#0f172a;touch-action:none;}#unity-footer{display:none!important;}</style></head>");
            File.WriteAllText(indexHtmlPath, html);
        }
    }
}
