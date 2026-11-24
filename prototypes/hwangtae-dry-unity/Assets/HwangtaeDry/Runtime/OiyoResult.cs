using System;
using System.Collections.Generic;
using UnityEngine;

// Tells the game.oiyo.net page around this build how a run or stage ended, so the
// page can save it to the shared records and show its result card
// (src/components/games/UnityMainShell.astro). Plugins/WebGL/OiyoResult.jslib posts
// { type: "oiyo:game-result", slug, outcome, score } to the parent page.
// Copied into each Unity build by scripts/unity/oiyo-result/install.py; edit the source there.
public static class OiyoResult
{
#if UNITY_WEBGL && !UNITY_EDITOR
    [System.Runtime.InteropServices.DllImport("__Internal")]
    static extern void OiyoPostResult(string slug, string outcome, int score);
#endif

    static readonly HashSet<string> WinStates = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    { "Victory", "Win", "Won", "StageClear", "Cleared", "Clear", "LevelClear", "LevelComplete", "AllCleared", "AllClear", "Complete", "Completed", "TournamentComplete" };
    static readonly HashSet<string> LossStates = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    { "GameOver", "Defeat", "Failed", "Fail", "Lost", "Lose", "Dead" };

    static readonly Dictionary<string, string> Last = new Dictionary<string, string>();

    /// <summary>Sends one result now. outcome: "win", "loss" or "draw".</summary>
    public static void Report(string slug, string outcome, int score)
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        try { OiyoPostResult(slug, outcome, Mathf.Max(0, score)); } catch (Exception) { }
#else
        Debug.Log($"[OiyoResult] {slug} {outcome} {score}");
#endif
    }

    /// <summary>
    /// Call every frame with the game's state enum. Reports once each time the state
    /// changes into a win or loss state (by name, see WinStates/LossStates).
    /// The first state seen is never reported.
    /// </summary>
    public static void Track<T>(string slug, T state, int score) where T : struct, Enum
    {
        string name = state.ToString();
        if (Last.TryGetValue(slug, out var previous) && previous == name) return;
        bool first = previous == null;
        Last[slug] = name;
        if (first) return;
        if (WinStates.Contains(name)) Report(slug, "win", score);
        else if (LossStates.Contains(name)) Report(slug, "loss", score);
    }

    /// <summary>Edge-triggered bool version: reports when ended goes false -> true.</summary>
    public static void TrackEnded(string slug, bool ended, bool won, int score)
    {
        string name = ended ? (won ? "win" : "loss") : "playing";
        if (Last.TryGetValue(slug, out var previous) && previous == name) return;
        bool first = previous == null;
        Last[slug] = name;
        if (first || !ended) return;
        Report(slug, won ? "win" : "loss", score);
    }
}
