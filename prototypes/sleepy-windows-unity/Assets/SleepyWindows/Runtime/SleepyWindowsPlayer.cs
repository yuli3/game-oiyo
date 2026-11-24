using System.Collections;
using UnityEngine;

// Sleepy Windows 3D: the web Sleepy Windows (src/components/games/SleepyWindows.tsx, src/lib/games/sleepy-windows.ts)
// rebuilt in Unity on the web's own 360 × 560 px field (OiyoField). A tap flips a window's light and its four
// neighbours'. Put every window to sleep within the taps. The 30 blocks are the web's own (SleepyWindowsStages.cs).
public class SleepyWindowsPlayer : MonoBehaviour
{
    const string Slug = "sleepy-windows";
    const int StageCount = 30;
    const float WW = 46f, WH = 50f, Gap = 12f, Top = 96f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of sleepy-windows.ts) ----------------
    SleepyWindowsStages.Level st;
    int cols, rows, stageIdx, starsWon, taps;
    bool[] lit;
    bool over, won;

    void Flip(int i)
    {
        int r = i / cols, c = i % cols;
        lit[i] = !lit[i];
        if (r > 0) lit[i - cols] = !lit[i - cols];
        if (r < rows - 1) lit[i + cols] = !lit[i + cols];
        if (c > 0) lit[i - 1] = !lit[i - 1];
        if (c < cols - 1) lit[i + 1] = !lit[i + 1];
    }

    void Tap(int i)
    {
        if (over || i < 0 || i >= lit.Length) return;
        Flip(i);
        taps++;
        bool any = false;
        foreach (bool l in lit) any |= l;
        if (!any) { over = true; won = true; }
        else if (taps >= st.limit) over = true;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (taps <= st.par) return 3;
        if (taps <= Mathf.CeilToInt(st.par * 1.5f) + 1) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, cursorObj;
    Renderer[] pane;
    Transform[] sleeper, sleeperHead;
    float[] glow;
    Material litMat, darkMat, frameMat, wallMat, figureMat, glowMat;
    Bursts sparkle;
    Synth synth;
    bool showStages, keyed;
    int cursor;

    float BX => (360f - (cols * WW + (cols + 1) * Gap)) / 2f;
    Vector2 WinCentre(int i) => new Vector2(BX + Gap + (i % cols) * (WW + Gap) + WW / 2f, Top + Gap + (i / cols) * (WH + Gap) + WH / 2f);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.11f, 0.12f, 0.23f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.55f, 0.58f, 0.7f), 0.55f, 40f, -30f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        litMat = OiyoArcade.LitGlow(new Color(1f, 0.88f, 0.4f), new Color(0.9f, 0.7f, 0.2f), 0.3f);
        darkMat = OiyoArcade.Lit(new Color(0.17f, 0.23f, 0.4f), 0.6f);
        frameMat = OiyoArcade.Lit(new Color(0.13f, 0.15f, 0.16f), 0.3f);
        wallMat = OiyoArcade.Lit(new Color(0.53f, 0.56f, 0.59f), 0.2f);
        figureMat = OiyoArcade.Lit(new Color(0.96f, 0.62f, 0f), 0.2f);
        glowMat = OiyoArcade.Glow(new Color(0.3f, 0.67f, 0.97f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = SleepyWindowsStages.All[stageIdx];
        cols = st.cols; rows = st.rows;
        lit = new bool[cols * rows];
        for (int k = 0; k < lit.Length; k++) lit[k] = st.lit[k] == 1;
        taps = 0; over = false; won = false; starsWon = 0; cursor = 0; keyed = false;
        glow = new float[lit.Length];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Block").transform;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Box(string name, Material m, float x, float y, float w, float h, float z, float d)
    {
        var o = OiyoArcade.Prim(PrimitiveType.Cube, name, m, root).transform;
        o.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), d);
        o.position = field.W(x, y, z);
        return o;
    }

    void BuildScene()
    {
        float bw = cols * WW + (cols + 1) * Gap, bh = rows * WH + (rows + 1) * Gap;
        Box("Wall", wallMat, BX + bw / 2f, Top + bh / 2f, bw, bh, 0.3f, 0.6f);
        Box("Roof", OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.3f), BX + bw / 2f, Top - 13f, bw + 12f, 26f, 0.2f, 0.8f);
        Box("Step", frameMat, BX + bw / 2f, Top + bh + 8f, bw + 20f, 16f, 0.2f, 0.8f);
        var moon = OiyoArcade.Prim(PrimitiveType.Sphere, "Moon", OiyoArcade.Glow(new Color(1f, 0.98f, 0.86f)), root).transform;
        moon.localScale = Vector3.one * OiyoField.U(34f);
        moon.position = field.W(315f, 40f, 1f);
        pane = new Renderer[lit.Length];
        sleeper = new Transform[lit.Length];
        sleeperHead = new Transform[lit.Length];
        for (int i = 0; i < lit.Length; i++)
        {
            var c = WinCentre(i);
            Box("Frame", frameMat, c.x, c.y, WW + 6f, WH + 6f, 0.02f, 0.1f);
            pane[i] = Box("Pane", darkMat, c.x, c.y, WW, WH, -0.02f, 0.06f).GetComponent<Renderer>();
            Box("Mullion", frameMat, c.x, c.y, 2f, WH, -0.07f, 0.04f);
            sleeper[i] = Box("Body", figureMat, c.x, c.y + 14f, 16f, 22f, -0.06f, 0.02f);
            sleeperHead[i] = Box("Head", figureMat, c.x, c.y - 2f, 10f, 10f, -0.06f, 0.02f);
        }
        cursorObj = Box("Cursor", glowMat, 0f, 0f, WW + 10f, 4f, -0.2f, 0.02f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("sleepy-windows", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        for (int k = 0; k < glow.Length; k++) glow[k] = Mathf.Max(0f, glow[k] - dt * 3f);
        Animate(dt);
    }

    void Press(int i)
    {
        if (state != GameState.Playing || over) return;
        int before = 0; foreach (bool l in lit) if (l) before++;
        Tap(i);
        glow[i] = 1f;
        int after = 0; foreach (bool l in lit) if (l) after++;
        synth.Tone(after < before ? 392f : 523f, 0.08f, Wave.Triangle, 0.1f);
        if (over) End();
    }

    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; return; }
                    // input is read once per frame: a tap on a window flips it and its neighbours
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        int c = Mathf.FloorToInt((f.x - BX - Gap / 2f) / (WW + Gap)), r = Mathf.FloorToInt((f.y - Top - Gap / 2f) / (WH + Gap));
                        if (c >= 0 && c < cols && r >= 0 && r < rows) { cursor = r * cols + c; Press(cursor); }
                    }
                    int r0 = cursor / cols, c0 = cursor % cols;
                    bool moved = true;
                    if (Input.GetKeyDown(KeyCode.UpArrow)) cursor = Mathf.Max(0, r0 - 1) * cols + c0;
                    else if (Input.GetKeyDown(KeyCode.DownArrow)) cursor = Mathf.Min(rows - 1, r0 + 1) * cols + c0;
                    else if (Input.GetKeyDown(KeyCode.LeftArrow)) cursor = r0 * cols + Mathf.Max(0, c0 - 1);
                    else if (Input.GetKeyDown(KeyCode.RightArrow)) cursor = r0 * cols + Mathf.Min(cols - 1, c0 + 1);
                    else moved = false;
                    if (moved) { keyed = true; if (state == GameState.Ready) state = GameState.Playing; }
                    if (Input.GetKeyDown(KeyCode.Space) || confirm)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else { keyed = true; Press(cursor); }
                    }
                    return;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm && ResultLive) LoadStage(won ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                return;
            case GameState.Menu:
                if (!showStages && confirm) LoadStage(stageIdx);
                return;
        }
    }

    float endTime;
    bool ResultLive => Time.unscaledTime - endTime > 0.45f;

    void End()
    {
        if (state != GameState.Playing) return;
        endTime = Time.unscaledTime;
        starsWon = StarsFor();
        if (won)
        {
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, (st.limit - taps) * 10), StageCount);
            sparkle.Emit(field.W(180f, 60f, -1f), new Color(1f, 0.95f, 0.7f), 40, 4f, 0.1f, 1f);
            StartCoroutine(Arp(new[] { 784f, 659f, 523f, 392f, 523f }, 0.12f));
        }
        else
        {
            state = GameState.GameOver;
            StartCoroutine(Arp(new[] { 392f, 330f, 262f }, 0.14f));
        }
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.18f, Wave.Triangle, 0.22f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void Animate(float dt)
    {
        if (root == null) return;
        float bh = rows * WH + (rows + 1) * Gap;
        field.Fit(56f, 10f, 0f, 20f, Mathf.Max(520f, Top + bh + 30f));
        for (int i = 0; i < lit.Length; i++)
        {
            pane[i].sharedMaterial = lit[i] ? litMat : darkMat;
            sleeper[i].gameObject.SetActive(lit[i]);
            sleeperHead[i].gameObject.SetActive(lit[i]);
            var c = WinCentre(i);
            pane[i].transform.position = field.W(c.x, c.y, -0.02f - glow[i] * 0.15f);
        }
        cursorObj.gameObject.SetActive(keyed);
        var cc = WinCentre(cursor);
        cursorObj.position = field.W(cc.x, cc.y + WH / 2f + 6f, -0.2f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the screen point (px from
    // the top-left) of the window the fewest-taps plan taps next (the plan comes with the stage).
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog) return;
        if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        string next = "null";
        if (state == GameState.Playing && !over && taps < st.plan.Length)
        {
            var c = WinCentre(st.plan[taps]);
            var sp = cam.WorldToScreenPoint(field.W(c.x, c.y, 0f));
            next = $"[{sp.x:F1},{Screen.height - sp.y:F1}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"taps\":{taps},\"par\":{st.par},\"limit\":{st.limit},\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.3f, 0.67f, 0.97f, 0.97f);
    static readonly Color Dark = new Color(0.08f, 0.09f, 0.16f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} × {1} windows", SleepyWindowsStages.All[i].cols, SleepyWindowsStages.All[i].rows);

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu)
        {
            if (showStages)
            {
                int pick = OiyoScreens.Stages(w, h, Dark, Accent, Slug, StageCount, U("Choose a stage"), U("Back"), U("Stage"));
                if (pick == -2) showStages = false; else if (pick >= 0) LoadStage(pick);
                return;
            }
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.98f, 0.86f), U("Sleepy Windows"),
                U("Tap a window and its light flips, along with the neighbours above, below and beside. Put every window to sleep within the taps."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Taps {0}/{1}", taps, st.limit), 15, new Color(1f, 0.98f, 0.86f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap a lit window to put it to sleep!"), 120f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = won ? $"<size=14>{F("All asleep in {0} taps", taps)}</size>" : "";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("Everyone's asleep!") : U("Out of taps"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
