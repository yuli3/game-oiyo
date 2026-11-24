using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Mandu Pleat 3D: the web Mandu Pleat (src/components/games/ManduPleat.tsx, src/lib/games/mandu-pleat.ts)
// rebuilt in Unity on the web's own 360 × 560 px field (OiyoField). Each dumpling: hold to spoon filling
// (level rises at its fill rate, capped at 1.25) and let go inside [lo, hi] — over is a burst, under is
// flat. Then a pinch runs along the folded edge at its speed; each press makes a pleat where it is. The
// edge is judged in equal stretches of 1/pleats: a gap under (1 − tol) of one tears, over (1 + tol) stays
// open, and one pleat too many tears at once. Fill the tray to the mark. The 30 trays are the web's own
// (ManduPleatStages.cs).
public class ManduPleatPlayer : MonoBehaviour
{
    const string Slug = "mandu-pleat";
    const int StageCount = 30;
    const float LevelMax = 1.25f, CX = 160f, CY = 250f, R = 110f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of mandu-pleat.ts) ----------------
    ManduPleatStages.Level st;
    int stageIdx, idx, starsWon;
    bool fillPhase, holding, over, won;
    float level, pos, t;
    readonly List<float> taps = new List<float>();
    readonly List<string> results = new List<string>(); // "" good, or the fault

    int Count => st.dumplings.Length / 6;
    float D(int k) => st.dumplings[Mathf.Min(idx, Count - 1) * 6 + k];
    float FillRate => D(0);
    float Lo => D(1);
    float Hi => D(2);
    int Pleats => Mathf.RoundToInt(D(3));
    float Speed => D(4);
    float Tol => D(5);
    int Good { get { int g = 0; foreach (var r in results) if (r == "") g++; return g; } }

    void NewKitchen() { idx = 0; fillPhase = true; level = 0f; holding = false; pos = 0f; t = 0f; taps.Clear(); results.Clear(); over = false; won = false; }

    string JudgeSeam()
    {
        float g = 1f / Pleats;
        float prev = 0f;
        for (int i = 0; i <= taps.Count; i++)
        {
            float m = i < taps.Count ? taps[i] : 1f;
            float gap = m - prev;
            if (gap < g * (1f - Tol)) return "tear";
            if (gap > g * (1f + Tol)) return "open";
            prev = m;
        }
        return "";
    }

    void Next(string fault)
    {
        results.Add(fault);
        idx++;
        level = 0f; holding = false; pos = 0f; taps.Clear();
        if (idx >= Count) { over = true; won = Good >= st.need; }
        else fillPhase = true;
    }

    // what finished on this call: null for nothing, "" for a good dumpling, else the fault
    string Press(out bool pleat)
    {
        pleat = false;
        if (over) return null;
        if (fillPhase) { holding = true; return null; }
        taps.Add(pos);
        pleat = true;
        if (taps.Count > Pleats - 1) { Next("tear"); return "tear"; }
        return null;
    }

    string Release()
    {
        if (over || !fillPhase || !holding) return null;
        holding = false;
        if (level > Hi) { Next("burst"); return "burst"; }
        if (level < Lo) { Next("flat"); return "flat"; }
        fillPhase = false; pos = 0f;
        return null;
    }

    string Step(float dt)
    {
        if (over) return null;
        t += dt;
        if (fillPhase && holding) level = Mathf.Min(LevelMax, level + FillRate * dt);
        else if (!fillPhase)
        {
            pos += Speed * dt;
            if (pos >= 1f) { pos = 1f; string f = JudgeSeam(); Next(f); return f; }
        }
        return null;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (Good == Count) return 3;
        if (Good >= Mathf.Min(Count, st.need + 1)) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, wrapper, folded, mound, spoon, pinch;
    readonly List<Transform> pleatMarks = new List<Transform>();
    readonly List<Transform> guides = new List<Transform>();
    readonly List<Transform> tray = new List<Transform>();
    Material wrapMat, foldMat, fillMat, burstMat, spoonMat, pinchMat, pleatMat, guideMat, tableMat, trayMat, okMat, badMat;
    Bursts bursts;
    Synth synth;
    bool showStages;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.96f, 0.89f, 0.76f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.7f, 0.64f, 0.58f), 0.9f, 40f, -25f);
        bursts = new Bursts(transform, 0.7f);
        synth = new Synth(gameObject);
        wrapMat = OiyoField.Sprite("MP/wrapper");
        foldMat = OiyoField.Sprite("MP/folded");
        fillMat = OiyoArcade.Lit(new Color(0.56f, 0.36f, 0.23f), 0.3f, OiyoArcade.Art("MP/filling", true));
        burstMat = OiyoArcade.Lit(new Color(0.79f, 0.16f, 0.16f), 0.3f);
        spoonMat = OiyoArcade.Lit(new Color(0.68f, 0.71f, 0.74f), 0.8f, null, 0.6f);
        pinchMat = OiyoField.Sprite("MP/pinch");
        pleatMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(0.55f, 0.57f, 0.6f, 1f));
        guideMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(0.18f, 0.62f, 0.27f, 0.5f));
        tableMat = OiyoArcade.Lit(Color.white, 0.25f, OiyoArcade.Art("MP/wood", true));
        trayMat = OiyoArcade.Lit(new Color(0.79f, 0.16f, 0.16f), 0.5f);
        okMat = OiyoField.Sprite("MP/mandu_ok");
        badMat = OiyoField.Sprite("MP/mandu_bad");
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = ManduPleatStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Table").transform;
        NewKitchen();
        starsWon = 0;
        showStages = false;
        pressId = int.MinValue;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        var table = OiyoArcade.Prim(PrimitiveType.Cube, "Table", tableMat, root);
        table.transform.position = field.W(180f, 280f, 0.4f);
        table.transform.localScale = new Vector3(OiyoField.U(420f), OiyoField.U(460f), 0.6f);
        var trayBox = OiyoArcade.Prim(PrimitiveType.Cube, "Tray", trayMat, root);
        trayBox.transform.position = field.W(180f, 510f, -0.1f);
        trayBox.transform.localScale = new Vector3(OiyoField.U(340f), OiyoField.U(44f), 0.3f);
        wrapper = OiyoField.Quad("Wrapper", wrapMat, root, R * 2f, R * 2f);
        wrapper.position = field.W(CX, CY, -0.2f);
        folded = OiyoField.Quad("Folded", foldMat, root, R * 2f, R * 0.75f + 8f);
        folded.position = field.W(CX, CY - R * 0.375f + 4f, -0.2f);
        mound = OiyoArcade.Prim(PrimitiveType.Sphere, "Filling", fillMat, root).transform;
        spoon = new GameObject("Spoon").transform;
        spoon.SetParent(root, false);
        var bowl = OiyoArcade.Prim(PrimitiveType.Sphere, "Bowl", spoonMat, spoon);
        bowl.transform.localPosition = Vector3.zero; bowl.transform.localScale = new Vector3(1.4f, 0.6f, 0.9f);
        var handle = OiyoArcade.Prim(PrimitiveType.Cube, "Handle", spoonMat, spoon);
        handle.transform.localPosition = new Vector3(0.3f, 1.6f, 0f); handle.transform.localScale = new Vector3(0.25f, 3f, 0.15f);
        pinch = OiyoField.Quad("Pinch", pinchMat, root, 30f, 30f);
        pleatMarks.Clear(); guides.Clear(); tray.Clear();
        for (int i = 0; i < 12; i++)
        {
            var p = OiyoField.Quad("Pleat", pleatMat, root, 4f, 30f);
            p.gameObject.SetActive(false);
            pleatMarks.Add(p);
            var g = OiyoField.Quad("Guide", guideMat, root, 4f, 12f);
            g.gameObject.SetActive(false);
            guides.Add(g);
        }
        for (int i = 0; i < Count; i++)
        {
            var m = OiyoField.Quad("Mandu", okMat, root, 30f, 22f);
            m.position = field.W(36f + i * 32f, 510f, -0.4f);
            m.gameObject.SetActive(false);
            tray.Add(m);
        }
    }

    Vector2 Edge(float p)
    {
        float a = Mathf.PI + p * Mathf.PI;
        return new Vector2(CX + Mathf.Cos(a) * R, CY + Mathf.Sin(a) * R * 0.75f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("mandu-pleat", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            Announce(Step(dt));
            if (over) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.9f; msgC = c; }

    void Announce(string f)
    {
        if (f == null) return;
        if (f == "")
        {
            Toast(U("Lovely!"), new Color(0.45f, 0.85f, 0.5f));
            bursts.Emit(field.W(CX, CY - 30f, -0.6f), new Color(1f, 0.83f, 0.23f), 14, 2.5f, 0.12f, 0.6f, Vector3.up);
            synth.Tone(784f, 0.14f, Wave.Triangle, 0.18f, 1175f, 8f);
            return;
        }
        string text = f == "flat" ? U("Too little filling") : f == "burst" ? U("It burst!") : f == "tear" ? U("The pleats tore") : U("Left open");
        Toast(text, new Color(1f, 0.5f, 0.45f));
        if (f == "burst") bursts.Emit(field.W(CX, CY, -0.6f), new Color(0.56f, 0.36f, 0.23f), 18, 3f, 0.14f, 0.6f);
        synth.Tone(240f, 0.2f, Wave.Square, 0.08f, 160f, 8f);
    }

    int pressId = int.MinValue;

    void Down()
    {
        // the first tap only starts the tray, so it can't spoil the first dumpling
        if (state == GameState.Ready) { state = GameState.Playing; return; }
        Announce(Press(out bool pleat));
        if (pleat) synth.Tone(660f, 0.06f, Wave.Triangle, 0.12f, 880f, 14f);
        if (over) End();
    }

    void Up()
    {
        Announce(Release());
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
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; pressId = int.MinValue; Up(); return; }
                    // presses are read once per frame: down spoons or pleats, up settles the filling
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos)) continue;
                        pressId = b.id;
                        Down();
                    }
                    foreach (var e in OiyoArcade.Ended()) if (e.id == pressId) { pressId = int.MinValue; Up(); }
                    if (Input.GetKeyDown(KeyCode.Space)) Down();
                    if (Input.GetKeyUp(KeyCode.Space)) Up();
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
        pressId = int.MinValue;
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Good, StageCount);
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
        field.Fit(90f, 20f, 10f);
        bool filling = !over && fillPhase;
        wrapper.gameObject.SetActive(filling);
        mound.gameObject.SetActive(filling);
        spoon.gameObject.SetActive(filling && holding);
        folded.gameObject.SetActive(!over && !fillPhase);
        pinch.gameObject.SetActive(!over && !fillPhase);
        if (filling)
        {
            float r = 10f + level / LevelMax * 70f;
            mound.position = field.W(CX, CY, -0.3f);
            mound.localScale = new Vector3(OiyoField.U(r * 2f), OiyoField.U(r * 2f), OiyoField.U(r * 1.2f));
            mound.GetComponent<Renderer>().sharedMaterial = level > Hi ? burstMat : fillMat;
            spoon.position = field.W(CX + 25f, CY - 70f, -1.2f);
        }
        for (int i = 0; i < pleatMarks.Count; i++)
        {
            bool on = !over && !fillPhase && i < taps.Count;
            pleatMarks[i].gameObject.SetActive(on);
            if (on)
            {
                var e = Edge(taps[i]);
                var mid = new Vector2(CX + (e.x - CX) * 0.82f, CY + (e.y - CY) * 0.82f);
                pleatMarks[i].position = field.W(mid.x, mid.y, -0.3f);
                pleatMarks[i].rotation = Quaternion.Euler(0f, 0f, -Mathf.Atan2(e.x - CX, -(e.y - CY)) * Mathf.Rad2Deg);
            }
            bool g = !over && !fillPhase && stageIdx < 5 && i < Pleats - 1;
            guides[i].gameObject.SetActive(g);
            if (g) { var e = Edge((i + 1f) / Pleats); guides[i].position = field.W(e.x, e.y - 8f, -0.35f); }
        }
        if (!over && !fillPhase) { var p = Edge(pos); pinch.position = field.W(p.x, p.y - 8f, -0.5f); }
        for (int i = 0; i < tray.Count; i++)
        {
            bool on = i < results.Count;
            tray[i].gameObject.SetActive(on);
            if (on) tray[i].GetComponent<Renderer>().sharedMaterial = results[i] == "" ? okMat : badMat;
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: which dumpling,
    // the phase, the spoon level and its band, the pinch's place along the edge, its speed, how many
    // pleats the edge takes, the tolerance, the pleats so far, the results and the mark.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        var rs = new System.Text.StringBuilder();
        foreach (var r in results) { if (rs.Length > 0) rs.Append(','); rs.Append('"').Append(r).Append('"'); }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F3},\"idx\":{idx},\"phase\":\"{(over ? "done" : fillPhase ? "fill" : "pleat")}\",\"holding\":{(holding ? "true" : "false")},\"level\":{level:F4},\"lo\":{Lo:F4},\"hi\":{Hi:F4},\"rate\":{FillRate:F4},\"pos\":{pos:F4},\"speed\":{Speed:F4},\"pleats\":{Pleats},\"tol\":{Tol:F3},\"taps\":{taps.Count},\"results\":[{rs}],\"good\":{Good},\"need\":{st.need},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.79f, 0.16f, 0.16f, 0.97f);
    static readonly Color Dark = new Color(0.2f, 0.13f, 0.09f, 0.88f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} dumplings", ManduPleatStages.All[i].dumplings.Length / 6);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.93f, 0.85f), U("Mandu Pleat"),
                U("Hold to spoon in filling and let go in the green band, then tap pleats on an even beat."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Goal {0}", st.need), 15, new Color(1f, 0.92f, 0.8f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("Tray {0}/{1}", Good, st.need) + (over ? "" : "  ·  " + (fillPhase ? U("Filling goes in while you hold") : U("Pleat on an even beat!"))), 14, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; pressId = int.MinValue; Up(); }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Playing || state == GameState.Ready)
        {
            // the spoon gauge with its green band, the red burst zone above it
            float gx = w - 46f, gy = 110f, gh = Mathf.Min(260f, h - 260f);
            System.Func<float, float> ly = lv => gy + gh - lv / LevelMax * gh;
            OiyoArcade.Panel(new Rect(gx - 6f, gy - 6f, 34f, gh + 12f), Dark);
            OiyoArcade.Fill(new Rect(gx, gy, 22f, ly(Hi) - gy), new Color(0.98f, 0.32f, 0.32f));
            OiyoArcade.Fill(new Rect(gx, ly(Hi), 22f, ly(Lo) - ly(Hi)), new Color(0.25f, 0.75f, 0.34f));
            OiyoArcade.Fill(new Rect(gx - 6f, ly(fillPhase ? level : 0f) - 2f, 34f, 4f), Color.white);
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Just enough filling, then even pleats."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("Tray {0}/{1}", Good, st.need);
            string body = $"<size=14>{F("{0}/{1} made well", Good, Count)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("A full tray of mandu!") : U("Not enough dumplings"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
