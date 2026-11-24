using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Sell the Heat 3D: the web Sell the Heat (src/components/games/SellTheHeat.tsx, src/lib/games/sell-the-heat.ts)
// rebuilt in Unity. The rules are the web's: neighbours turn to you at five windows on a seeded
// schedule. A real caller raises a hand `tell` seconds after turning and calls you at `call`; tap their
// window first to sell your heat (+1), or they call and you buy theirs (−1). A looker never raises a
// hand and turns away at `call`; tapping a looker or an empty window is rude (−1). Finish the morning
// at or above the mark. The 30 mornings are the web's own (SellTheHeatStages.cs). Keyboard: 1 to 5.
public class SellTheHeatPlayer : MonoBehaviour
{
    const string Slug = "sell-the-heat";
    const int StageCount = 30, Windows = 5;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of sell-the-heat.ts) ----------------
    SellTheHeatStages.Level st;
    int stageIdx, turnCount;
    float t;
    bool[] doneTurn;
    int sold, bought, rude, starsWon, realCount;
    bool over, won;

    int Win(int i) => Mathf.RoundToInt(st.turns[i * 5]);
    float At(int i) => st.turns[i * 5 + 1];
    bool Real(int i) => st.turns[i * 5 + 2] > 0.5f;
    float Tell(int i) => st.turns[i * 5 + 3];
    float Call(int i) => st.turns[i * 5 + 4];

    void NewMorning()
    {
        t = 0f; turnCount = st.turns.Length / 5; doneTurn = new bool[turnCount];
        sold = 0; bought = 0; rude = 0; over = false; won = false;
        realCount = 0; for (int i = 0; i < turnCount; i++) if (Real(i)) realCount++;
    }
    int ActiveAt(int win)
    {
        for (int i = 0; i < turnCount; i++) if (Win(i) == win && !doneTurn[i] && t >= At(i) && t < At(i) + Call(i)) return i;
        return -1;
    }
    bool HandUp(int i) => Real(i) && t >= At(i) + Tell(i);
    int Score => sold - bought - rude;

    string Tap(int win)
    {
        if (over) return null;
        int i = ActiveAt(win);
        if (i < 0) { rude++; return "rude"; }
        doneTurn[i] = true;
        if (!Real(i)) { rude++; return "rude"; }
        sold++;
        return "sold";
    }

    // returns the windows where someone called first this frame; sets over at the end
    readonly List<int> boughtNow = new List<int>();
    bool Step(float dt)
    {
        boughtNow.Clear();
        if (over) return false;
        t += dt;
        for (int i = 0; i < turnCount; i++)
            if (!doneTurn[i] && t >= At(i) + Call(i))
            {
                doneTurn[i] = true;
                if (Real(i)) { bought++; boughtNow.Add(Win(i)); }
            }
        if (t >= st.length) { over = true; won = Score >= st.need; return true; }
        return false;
    }

    int StarsFor()
    {
        if (!won) return 0;
        int s = Score;
        if (s >= realCount) return 3;
        if (s >= st.need + Mathf.CeilToInt((realCount - st.need) / 2f)) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    Camera cam;
    Transform root;
    readonly Transform[] frames = new Transform[Windows];
    readonly Transform[] faces = new Transform[Windows];
    readonly Transform[] hands = new Transform[Windows];
    readonly Renderer[] faceR = new Renderer[Windows];
    readonly Renderer[] paneR = new Renderer[Windows];
    Material faceMat, sideMat, handMat, wallMat, roofMat, woodMat, paperMat, litMat, snowMat;
    Bursts bursts;
    Synth synth;
    bool showStages;
    static readonly Vector3[] WinPos =
    {
        new Vector3(-2.4f, 3.4f, 0f), new Vector3(0f, 3.4f, 0f), new Vector3(2.4f, 3.4f, 0f),
        new Vector3(-1.2f, 1.0f, 0f), new Vector3(1.2f, 1.0f, 0f),
    };
    const float WinW = 1.9f, WinH = 2f;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 45f; cam.nearClipPlane = 0.1f; cam.farClipPlane = 100f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.65f, 0.85f, 1f);
        OiyoField.Lights(new Color(0.7f, 0.72f, 0.78f), 0.9f, 35f, 20f);
        bursts = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        faceMat = OiyoField.Sprite("HT/face");
        sideMat = OiyoField.Sprite("HT/side");
        handMat = OiyoField.Sprite("HT/hand");
        wallMat = OiyoArcade.Lit(new Color(0.91f, 0.93f, 0.94f), 0.15f);
        roofMat = OiyoArcade.Lit(new Color(0.13f, 0.15f, 0.16f), 0.3f);
        woodMat = OiyoArcade.Lit(new Color(0.42f, 0.27f, 0.14f), 0.25f);
        paperMat = OiyoArcade.Lit(Color.white, 0.05f, OiyoArcade.Art("HT/lattice", true));
        litMat = OiyoArcade.Lit(new Color(1f, 0.98f, 0.86f), 0.05f);
        snowMat = OiyoArcade.Lit(new Color(0.97f, 0.98f, 1f), 0.4f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        st = SellTheHeatStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("House").transform;
        NewMorning();
        starsWon = 0;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        var wall = OiyoArcade.Prim(PrimitiveType.Cube, "Wall", wallMat, root);
        wall.transform.position = new Vector3(0f, 2.2f, 0.3f);
        wall.transform.localScale = new Vector3(8.6f, 5.4f, 0.4f);
        var roof = OiyoArcade.Prim(PrimitiveType.Cube, "Roof", roofMat, root);
        roof.transform.position = new Vector3(0f, 5.3f, 0f);
        roof.transform.localScale = new Vector3(9.6f, 0.6f, 1.6f);
        var beam = OiyoArcade.Prim(PrimitiveType.Cube, "Beam", woodMat, root);
        beam.transform.position = new Vector3(0f, 2.2f, 0f);
        beam.transform.localScale = new Vector3(8.6f, 0.15f, 0.2f);
        var ground = OiyoArcade.Prim(PrimitiveType.Cube, "Snow", snowMat, root);
        ground.transform.position = new Vector3(0f, -0.6f, -2f);
        ground.transform.localScale = new Vector3(20f, 0.4f, 8f);
        for (int w = 0; w < Windows; w++)
        {
            var f = OiyoArcade.Prim(PrimitiveType.Cube, "Frame", woodMat, root).transform;
            f.position = WinPos[w] + new Vector3(0f, 0f, 0.05f);
            f.localScale = new Vector3(WinW + 0.2f, WinH + 0.2f, 0.2f);
            frames[w] = f;
            var pane = OiyoArcade.Prim(PrimitiveType.Quad, "Pane", paperMat, root);
            pane.transform.position = WinPos[w] + new Vector3(0f, 0f, -0.07f);
            pane.transform.localScale = new Vector3(WinW, WinH, 1f);
            paneR[w] = pane.GetComponent<Renderer>();
            faces[w] = OiyoField.Quad("Neighbour", faceMat, root, 1f, 1f);
            faces[w].localScale = new Vector3(1.4f, 1.4f, 1f);
            faces[w].position = WinPos[w] + new Vector3(0f, -0.1f, -0.12f);
            faceR[w] = faces[w].GetComponent<Renderer>();
            hands[w] = OiyoField.Quad("Hand", handMat, root, 1f, 1f);
            hands[w].localScale = new Vector3(0.6f, 0.7f, 1f);
            hands[w].position = WinPos[w] + new Vector3(0.62f, 0.45f, -0.14f);
        }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("sell-the-heat", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            bool end = Step(dt);
            foreach (int w in boughtNow) { Toast(U("Oops, you bought their heat"), new Color(1f, 0.6f, 0.3f)); synth.Tone(240f, 0.2f, Wave.Square, 0.1f, 160f, 8f); }
            if (end) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.8f; msgC = c; }

    /// <summary>The window under a screen point, or −1 (the wall around the windows does nothing).</summary>
    int WindowAt(Vector2 screen)
    {
        for (int w = 0; w < Windows; w++)
        {
            var a = cam.WorldToScreenPoint(WinPos[w] + new Vector3(-WinW * 0.5f - 0.15f, -WinH * 0.5f - 0.15f, 0f));
            var b = cam.WorldToScreenPoint(WinPos[w] + new Vector3(WinW * 0.5f + 0.15f, WinH * 0.5f + 0.15f, 0f));
            if (screen.x >= Mathf.Min(a.x, b.x) && screen.x <= Mathf.Max(a.x, b.x) && screen.y >= Mathf.Min(a.y, b.y) && screen.y <= Mathf.Max(a.y, b.y)) return w;
        }
        return -1;
    }

    void DoTap(int w)
    {
        string r = Tap(w);
        var at = WinPos[w] + new Vector3(0f, 0.2f, -0.3f);
        if (r == "sold") { Toast(U("Buy my heat!"), new Color(0.55f, 1f, 0.6f)); bursts.Emit(at, new Color(1f, 0.83f, 0.23f), 16, 2.5f, 0.12f, 0.5f); synth.Tone(784f, 0.12f, Wave.Triangle, 0.16f, 1175f, 8f); }
        else if (r == "rude") { Toast(U("Rude!"), new Color(1f, 0.5f, 0.45f)); synth.Tone(200f, 0.15f, Wave.Square, 0.1f, 140f, 10f); }
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
                    // taps are read once per frame; the first one only starts the morning
                    var wins = new List<int>();
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        int w = WindowAt(b.pos);
                        if (w >= 0) wins.Add(w);
                    }
                    for (int k = 0; k < Windows; k++)
                        if (Input.GetKeyDown(KeyCode.Alpha1 + k) || Input.GetKeyDown(KeyCode.Keypad1 + k))
                        {
                            if (state == GameState.Ready) { state = GameState.Playing; continue; }
                            wins.Add(k);
                        }
                    foreach (int w in wins) DoTap(w);
                    return;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm && ResultLive) LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                return;
            case GameState.Menu:
                if (!showStages && (confirm || Input.GetKeyDown(KeyCode.Space))) LoadStage(stageIdx);
                return;
        }
    }

    float endTime;
    bool ResultLive => Time.unscaledTime - endTime > 0.45f;

    void End()
    {
        if (state != GameState.Playing) return;
        endTime = Time.unscaledTime;
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Score, StageCount);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
        }
        else
        {
            starsWon = 0;
            state = GameState.GameOver;
            synth.Tone(220f, 0.6f, Wave.Triangle, 0.2f, 110f, 3f);
        }
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.18f, Wave.Triangle, 0.22f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void Animate(float dt)
    {
        if (root == null) return;
        bool playing = state == GameState.Playing;
        for (int w = 0; w < Windows; w++)
        {
            int i = playing ? ActiveAt(w) : -1;
            bool peek = false;
            if (i < 0 && playing)
                for (int k = 0; k < turnCount; k++) if (Win(k) == w && t >= At(k) - 0.6f && t < At(k)) { peek = true; break; }
            faces[w].gameObject.SetActive(i >= 0 || peek);
            faceR[w].sharedMaterial = i >= 0 ? faceMat : sideMat;
            hands[w].gameObject.SetActive(i >= 0 && HandUp(i));
            paneR[w].sharedMaterial = i >= 0 ? litMat : paperMat;
        }
        bool portrait = cam.aspect < 1f;
        cam.transform.position = new Vector3(0f, 2.3f, portrait ? -16f : -10f);
        cam.transform.LookAt(new Vector3(0f, 2.2f, 0f));
        for (int w = 0; w < Windows; w++) { faces[w].rotation = cam.transform.rotation; hands[w].rotation = cam.transform.rotation; }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: per window,
    // 0 nobody, 1 turned, 2 turned with a hand up, and each window's centre on screen (px).
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        var sb = new System.Text.StringBuilder();
        for (int w = 0; w < Windows; w++)
        {
            int i = state == GameState.Playing ? ActiveAt(w) : -1;
            sb.Append(w == 0 ? "" : ",").Append(i < 0 ? 0 : HandUp(i) ? 2 : 1);
        }
        var pos = new System.Text.StringBuilder();
        for (int w = 0; w < Windows; w++)
        {
            var p = cam.WorldToScreenPoint(WinPos[w]);
            pos.Append(w == 0 ? "" : ",").Append(Mathf.RoundToInt(p.x)).Append(',').Append(Mathf.RoundToInt(Screen.height - p.y));
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F3},\"win\":[{sb}],\"pos\":[{pos}],\"sold\":{sold},\"bought\":{bought},\"rude\":{rude},\"need\":{st.need},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.91f, 0.35f, 0.05f, 0.97f);
    static readonly Color Dark = new Color(0.13f, 0.15f, 0.2f, 0.86f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Mark {0}", SellTheHeatStages.All[i].need);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.85f, 0.55f), U("Sell the Heat"),
                U("When a neighbour turns to you and raises a hand, tap their window first. No hand, no tap."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>   " + F("{0}s left", Mathf.Max(0f, st.length - t).ToString("F1")), 15, new Color(1f, 0.92f, 0.75f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("Heat sold {0}/{1}", Mathf.Max(0, Score), st.need), 16, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start the morning"), U("Then tap a neighbour the moment their hand goes up."), 170f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("Heat sold {0}/{1}", Mathf.Max(0, Score), st.need);
            string body = $"<size=14>{F("{0} sold · {1} bought · {2} rude", sold, bought, rude)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("You sold all your heat!") : U("It's going to be a hot summer"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
