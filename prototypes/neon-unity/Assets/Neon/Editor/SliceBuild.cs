// PROTOTYPE ONLY — explicit scene creation; never modifies the live website.
using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class SliceBuild
{
    const string ScenePath = "Assets/Neon/Slice.unity";
    [MenuItem("OIYO/Prepare Neon Slice")]
    public static void Prepare()
    {
        // WHY: automation must not discard a designer's unsaved scene.
        if (!Application.isBatchMode && !EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
        ConfigureTextures();
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        new GameObject("Neon Slice").AddComponent<SlicePlayer>();
        EditorSceneManager.SaveScene(scene, ScenePath);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        PlayerSettings.companyName = "OIYO";
        PlayerSettings.productName = "Neon Slice Experiment";
        PlayerSettings.SetApplicationIdentifier(UnityEditor.Build.NamedBuildTarget.Android, "net.oiyo.neon.experiment");
        PlayerSettings.defaultInterfaceOrientation = UIOrientation.AutoRotation;
        PlayerSettings.runInBackground = false;
        AssetDatabase.SaveAssets();
    }
    static void ConfigureTextures()
    {
        string[] guids = AssetDatabase.FindAssets("t:Texture2D", new[] { "Assets/Neon/Resources/Textures" });
        foreach (string guid in guids)
        {
            string path = AssetDatabase.GUIDToAssetPath(guid);
            var importer = AssetImporter.GetAtPath(path) as TextureImporter;
            if (importer == null) continue;
            bool changed = false;
            if (importer.textureType != TextureImporterType.Sprite) { importer.textureType = TextureImporterType.Sprite; changed = true; }
            if (importer.spriteImportMode != SpriteImportMode.Single) { importer.spriteImportMode = SpriteImportMode.Single; changed = true; }
            if (!importer.alphaIsTransparency) { importer.alphaIsTransparency = true; changed = true; }
            if (importer.mipmapEnabled) { importer.mipmapEnabled = false; changed = true; }
            if (changed) importer.SaveAndReimport();
        }
    }
    [MenuItem("OIYO/Build Neon Slice/WebGL")]
    public static void WebGL()
    {
        Prepare();
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
        PlayerSettings.WebGL.decompressionFallback = true;
        if (Directory.Exists("Builds/WebGL/Build")) Directory.Delete("Builds/WebGL/Build", true);
        Directory.CreateDirectory("Builds/WebGL");
        var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions { scenes = new[] { ScenePath },
            locationPathName = "Builds/WebGL", target = BuildTarget.WebGL,
            options = BuildOptions.None });
        if (report.summary.result != BuildResult.Succeeded) throw new Exception("WebGL slice build failed: " + report.summary.result);
        string indexHtmlPath = "Builds/WebGL/index.html";
        if (File.Exists(indexHtmlPath))
        {
            string html = File.ReadAllText(indexHtmlPath);
            html = html.Replace("canvas.style.width = \"960px\";", "canvas.style.width = \"100vw\";")
                       .Replace("canvas.style.height = \"600px\";", "canvas.style.height = \"100dvh\";")
                       .Replace("</head>", "<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#07111F;touch-action:none;}#unity-container{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;display:flex;align-items:center;justify-content:center;background:#07111F;}#unity-canvas{width:100vw!important;height:100dvh!important;background:#07111F;touch-action:none;}#unity-footer{display:none!important;}</style></head>");
            File.WriteAllText(indexHtmlPath, html);
        }
    }
    public static void Android()
    {
        Prepare();
        Directory.CreateDirectory("Builds/Android");
        var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions { scenes = new[] { ScenePath },
            locationPathName = "Builds/Android/neon-slice.apk", target = BuildTarget.Android,
            options = BuildOptions.Development });
        if (report.summary.result != BuildResult.Succeeded) throw new Exception("Android slice build failed: " + report.summary.result);
    }
}
