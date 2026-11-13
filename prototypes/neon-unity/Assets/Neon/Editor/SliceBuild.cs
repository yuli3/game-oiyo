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
