using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Drop-in for Input.GetMouseButton*/mousePosition/touchCount on the OIYO Unity builds.
/// Inside the game.oiyo.net page iframe the player could miss a touch's release, and while the
/// iframe had no focus it dropped the first tap (2026-11-23). In the WebGL player this reads the
/// browser pointer events from Plugins/WebGL/OiyoPointer.jslib instead; everywhere else (and for
/// mouse buttons other than the left one) it passes straight through to Input.
/// </summary>
public static class OiyoPointerInput
{
#if UNITY_WEBGL && !UNITY_EDITOR
    [System.Runtime.InteropServices.DllImport("__Internal")] static extern void OiyoPointerInit();
    [System.Runtime.InteropServices.DllImport("__Internal")] static extern int OiyoPointerDrain(float[] buf, int maxEvents);
    const bool Web = true;
#else
    static void OiyoPointerInit() { }
    static int OiyoPointerDrain(float[] buf, int maxEvents) { return 0; }
    const bool Web = false;
#endif

    static readonly float[] buf = new float[256 * 4];
    static readonly Dictionary<int, Vector2> down = new Dictionary<int, Vector2>();
    static int polledFrame = -1;
    static bool began, ended;
    static Vector2 lastPos;
    static bool hasPos;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Install()
    {
        if (!Web) return;
        OiyoPointerInit();
        var go = new GameObject("OiyoPointerInput");
        go.hideFlags = HideFlags.HideInHierarchy;
        Object.DontDestroyOnLoad(go);
        go.AddComponent<Pump>();
    }

    // Polls once at the very start of every frame, so every script sees the same presses and a
    // press made while nothing was reading input is not replayed later.
    [DefaultExecutionOrder(-32000)]
    sealed class Pump : MonoBehaviour { void Update() { Poll(); } }

    static void Poll()
    {
        if (!Web || polledFrame == Time.frameCount) return;
        polledFrame = Time.frameCount;
        began = ended = false;
        int n = OiyoPointerDrain(buf, 256);
        for (int i = 0; i < n; i++)
        {
            int phase = (int)buf[i * 4];
            int id = (int)buf[i * 4 + 1];
            var pos = new Vector2(buf[i * 4 + 2], buf[i * 4 + 3]);
            if (phase == 0) { down[id] = pos; began = true; lastPos = pos; hasPos = true; }
            else if (phase == 1) { if (down.ContainsKey(id)) { down[id] = pos; lastPos = pos; hasPos = true; } }
            else
            {
                if (pos.x >= 0f) { lastPos = pos; hasPos = true; }
                if (down.Remove(id)) ended = true;
            }
        }
    }

    public static bool GetMouseButtonDown(int button)
    {
        if (!Web || button != 0) return Input.GetMouseButtonDown(button);
        Poll();
        return began;
    }

    public static bool GetMouseButtonUp(int button)
    {
        if (!Web || button != 0) return Input.GetMouseButtonUp(button);
        Poll();
        return ended && down.Count == 0;
    }

    public static bool GetMouseButton(int button)
    {
        if (!Web || button != 0) return Input.GetMouseButton(button);
        Poll();
        return down.Count > 0 || began;
    }

    /// <summary>The pressed pointer's position while one is down, else the mouse (hover) position.</summary>
    public static Vector3 mousePosition
    {
        get
        {
            if (!Web) return Input.mousePosition;
            Poll();
            if (down.Count > 0 || began || ended) return lastPos;
            return hasPos && Input.touchSupported ? (Vector3)lastPos : Input.mousePosition;
        }
    }

    /// <summary>Touches are read through the pointer events above in the WebGL player.</summary>
    public static int touchCount => Web ? 0 : Input.touchCount;
}
