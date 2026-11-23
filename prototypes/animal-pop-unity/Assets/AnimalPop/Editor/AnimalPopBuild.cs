using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class AnimalPopBuild
{
    const string ScenePath = "Assets/AnimalPop/AnimalPop.unity";

    public static void Prepare()
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        new GameObject("AnimalPopController").AddComponent<AnimalPopPlayer>();
        EditorSceneManager.SaveScene(scene, ScenePath);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        PlayerSettings.companyName = "OIYO";
        PlayerSettings.productName = "Animal Pop 3D";
        PlayerSettings.defaultInterfaceOrientation = UIOrientation.AutoRotation;
        // Embedded in the game.oiyo.net page the iframe never gets window focus before the first
        // tap, and with runInBackground off the player sat frozen and ate that tap (2026-11-23).
        PlayerSettings.runInBackground = true;
        AssetDatabase.SaveAssets();
    }

    public static void WebGL()
    {
        // Everything the runtime asks Shader.Find / OiyoArcade for must ship in the build.
        EnsureAlwaysIncludedShaders("Standard", "Unlit/Color", "Unlit/Texture", "Unlit/Transparent", "Sprites/Default");
        Prepare();
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
        PlayerSettings.WebGL.decompressionFallback = true;
        if (Directory.Exists("Builds/WebGL")) Directory.Delete("Builds/WebGL", true);
        Directory.CreateDirectory("Builds/WebGL");
        var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
        {
            scenes = new[] { ScenePath },
            locationPathName = "Builds/WebGL",
            target = BuildTarget.WebGL,
            options = BuildOptions.None
        });
        if (report.summary.result != BuildResult.Succeeded)
            throw new Exception("AnimalPop WebGL build failed: " + report.summary.result);

        string indexHtmlPath = "Builds/WebGL/index.html";
        if (File.Exists(indexHtmlPath))
        {
            string html = File.ReadAllText(indexHtmlPath);
            html = html.Replace("canvas.style.width = \"960px\";", "canvas.style.width = \"100vw\";")
                       .Replace("canvas.style.height = \"600px\";", "canvas.style.height = \"100dvh\";")
                       .Replace("</head>", "<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#0f172a;touch-action:none;}#unity-container{position:fixed!important;inset:0!important;transform:none!important;width:100vw!important;height:100dvh!important;display:flex;align-items:center;justify-content:center;background:#0f172a;}#unity-canvas{width:100vw!important;height:100dvh!important;background:#0f172a;touch-action:none;}#unity-footer{display:none!important;}</style></head>");
            html = System.Text.RegularExpressions.Regex.Replace(html, "<title>[^<]*</title>", "<title>Animal Pop 3D · OIYO</title>");
            File.WriteAllText(indexHtmlPath, html);
        }
    }

    static void EnsureAlwaysIncludedShaders(params string[] names)
    {
        var assets = AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/GraphicsSettings.asset");
        if (assets == null || assets.Length == 0) return;
        var so = new SerializedObject(assets[0]);
        var list = so.FindProperty("m_AlwaysIncludedShaders");
        foreach (var name in names)
        {
            var shader = Shader.Find(name);
            if (shader == null) continue;
            bool present = false;
            for (int i = 0; i < list.arraySize; i++)
                if (list.GetArrayElementAtIndex(i).objectReferenceValue == shader) { present = true; break; }
            if (present) continue;
            list.InsertArrayElementAtIndex(list.arraySize);
            list.GetArrayElementAtIndex(list.arraySize - 1).objectReferenceValue = shader;
        }
        so.ApplyModifiedProperties();
        AssetDatabase.SaveAssets();
    }
}
