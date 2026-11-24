using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Ipchun Brush 3D: the web Ipchun Brush (src/components/games/IpchunBrush.tsx, src/lib/games/ipchun-brush.ts) rebuilt
// in Unity on the web's own 360 × 560 px field (OiyoField), writing box 300 px at (30, 140). Each of the eight
// strokes of 永 is a Catmull–Rom guide with a wanted width along it. The brush lays 24 − 0.06 × speed px (4–24),
// following its speed over 0.08 s. A stroke is checked at 25 points: close enough to the line (tol) at the right
// width (wTol). The stage's average must reach its mark. The 30 stages are the web's own (IpchunBrushStages.cs).
public class IpchunBrushPlayer : MonoBehaviour
{
    const string Slug = "ipchun-brush";
    const int StageCount = 30, Samples = 25;
    const float BoxX = 30f, BoxY = 140f, Box = 300f, WStill = 24f, WMin = 4f, WPerSpeed = 0.06f, InkSettle = 0.08f;

    static readonly string[] Kinds = { "dot", "horizontal", "vertical", "hook", "rising", "longLeft", "shortLeft", "rightFall" };
    static readonly string[] KindName = { "Dot", "Horizontal", "Vertical", "Hook", "Rising stroke", "Long left-falling", "Short left-falling", "Right-falling" };
    static readonly float[][] Pts =
    {
        new float[] { 120, 60, 145, 85, 160, 112 },
        new float[] { 50, 150, 150, 146, 250, 140 },
        new float[] { 150, 40, 150, 150, 150, 262 },
        new float[] { 150, 40, 150, 200, 150, 250, 118, 226 },
        new float[] { 70, 222, 140, 180, 205, 140 },
        new float[] { 222, 58, 184, 140, 124, 210, 50, 262 },
        new float[] { 204, 90, 164, 128, 120, 160 },
        new float[] { 80, 68, 150, 150, 220, 220, 272, 240 },
    };
    static readonly float[][] Widths =
    {
        new float[] { 6, 14, 20 }, new float[] { 22, 9, 9, 20 }, new float[] { 20, 10, 10, 18 }, new float[] { 20, 11, 12, 18, 5 },
        new float[] { 18, 11, 5 }, new float[] { 16, 13, 9, 4 }, new float[] { 16, 9, 5 }, new float[] { 6, 14, 22, 6 },
    };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of ipchun-brush.ts) ----------------
    IpchunBrushStages.Level st;
    int stageIdx, idx, starsWon;
    readonly List<float> scores = new List<float>();
    bool over, won;
    float t;

    List<Vector2> path;
    float len;

    void BuildPath(int kind)
    {
        var p = Pts[kind];
        int n = p.Length / 2;
        var pts = new Vector2[n];
        for (int i = 0; i < n; i++) pts[i] = new Vector2(BoxX + p[i * 2], BoxY + p[i * 2 + 1]);
        path = new List<Vector2>();
        for (int i = 0; i < n - 1; i++)
        {
            var p0 = pts[Mathf.Max(0, i - 1)]; var p1 = pts[i]; var p2 = pts[i + 1]; var p3 = pts[Mathf.Min(n - 1, i + 2)];
            for (int k = 0; k < 20; k++)
            {
                float u = k / 20f, u2 = u * u, u3 = u2 * u;
                path.Add(0.5f * (2f * p1 + (-p0 + p2) * u + (2f * p0 - 5f * p1 + 4f * p2 - p3) * u2 + (-p0 + 3f * p1 - 3f * p2 + p3) * u3));
            }
        }
        path.Add(pts[n - 1]);
        len = 0f;
        for (int i = 1; i < path.Count; i++) len += Vector2.Distance(path[i], path[i - 1]);
    }

    Vector2 PointAt(float s)
    {
        float left = Mathf.Clamp01(s) * len;
        for (int i = 1; i < path.Count; i++)
        {
            float d = Vector2.Distance(path[i], path[i - 1]);
            if (left <= d || i == path.Count - 1) return Vector2.Lerp(path[i - 1], path[i], d == 0f ? 0f : Mathf.Min(1f, left / d));
            left -= d;
        }
        return path[path.Count - 1];
    }

    static float WidthAt(int kind, float s)
    {
        var w = Widths[kind];
        float f = Mathf.Clamp01(s) * (w.Length - 1);
        int i = Mathf.Min(w.Length - 2, Mathf.FloorToInt(f));
        return w[i] + (w[i + 1] - w[i]) * (f - i);
    }

    struct Pt { public Vector2 p; public float t, w; }
    readonly List<Pt> trace = new List<Pt>();
    bool drawing;

    void AddPoint(Vector2 p)
    {
        float w = WStill;
        if (trace.Count > 0)
        {
            var last = trace[trace.Count - 1];
            float dt = Mathf.Max(1e-3f, t - last.t);
            float speed = Vector2.Distance(p, last.p) / dt;
            float target = Mathf.Clamp(WStill - WPerSpeed * speed, WMin, WStill);
            w = last.w + (target - last.w) * Mathf.Min(1f, dt / InkSettle);
        }
        trace.Add(new Pt { p = p, t = t, w = w });
    }

    float Judge(int kind)
    {
        int good = 0;
        for (int k = 0; k < Samples; k++)
        {
            float s = k / (float)(Samples - 1);
            var p = PointAt(s);
            float best = float.MaxValue, w = 0f;
            foreach (var q in trace) { float d = Vector2.Distance(q.p, p); if (d < best) { best = d; w = q.w; } }
            if (best <= st.tol && Mathf.Abs(w - WidthAt(kind, s)) <= st.wTol) good++;
        }
        return good / (float)Samples;
    }

    int Kind => st.strokes[Mathf.Min(idx, st.strokes.Length - 1)];
    float Average() { if (scores.Count == 0) return 0f; float a = 0f; foreach (var s in scores) a += s; return a / scores.Count; }

    void NewSheet() { idx = 0; scores.Clear(); over = false; won = false; t = 0f; trace.Clear(); drawing = false; BuildPath(Kind); }

    float Write()
    {
        float score = Judge(Kind);
        scores.Add(score);
        idx++;
        trace.Clear();
        if (idx >= st.strokes.Length) { over = true; won = Average() >= st.mark; }
        else BuildPath(Kind);
        return score;
    }

    int StarsFor()
    {
        if (!won) return 0;
        float a = Average();
        if (a >= 0.92f) return 3;
        if (a >= (st.mark + 0.92f) / 2f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, startDot;
    LineRenderer guide, ink;
    readonly List<LineRenderer> written = new List<LineRenderer>();
    Material paperMat, sheetMat, inkMat, guideMat, dotMat, oldInkMat;
    Bursts splash;
    Synth synth;
    bool showStages;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.48f, 0.18f, 0.12f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.7f, 0.66f, 0.62f), 0.6f, 30f, -20f);
        splash = new Bursts(transform, 0.6f);
        synth = new Synth(gameObject);
        paperMat = OiyoArcade.Lit(Color.white, 0.05f, OiyoArcade.Art("IB/paper", true));
        sheetMat = OiyoArcade.Lit(new Color(0.75f, 0.2f, 0.14f), 0.2f);
        inkMat = OiyoArcade.Glow(new Color(0.08f, 0.09f, 0.1f));
        oldInkMat = OiyoArcade.Glow(new Color(0.42f, 0.42f, 0.42f));
        guideMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(0.79f, 0.16f, 0.16f, 0.22f));
        dotMat = OiyoArcade.Glow(new Color(0.88f, 0.19f, 0.19f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = IpchunBrushStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Paper").transform;
        written.Clear();
        NewSheet();
        starsWon = 0;
        showStages = false;
        pressId = int.MinValue;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    LineRenderer Line(string name, Material m, float z)
    {
        var go = new GameObject(name);
        go.transform.SetParent(root, false);
        var lr = go.AddComponent<LineRenderer>();
        lr.sharedMaterial = m;
        lr.useWorldSpace = true;
        lr.numCapVertices = 6;
        lr.numCornerVertices = 4;
        lr.alignment = LineAlignment.View;
        lr.positionCount = 0;
        lr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        lr.receiveShadows = false;
        lineZ[lr] = z;
        return lr;
    }
    readonly Dictionary<LineRenderer, float> lineZ = new Dictionary<LineRenderer, float>();

    void SetLine(LineRenderer lr, IList<Vector2> pts, IList<float> widths)
    {
        float z = lineZ[lr];
        lr.positionCount = pts.Count;
        var curve = new AnimationCurve();
        float max = 0.0001f;
        foreach (var w in widths) max = Mathf.Max(max, w);
        for (int i = 0; i < pts.Count; i++)
        {
            lr.SetPosition(i, field.W(pts[i].x, pts[i].y, z));
            curve.AddKey(pts.Count == 1 ? 0f : i / (float)(pts.Count - 1), widths[i] / max);
        }
        lr.widthMultiplier = OiyoField.U(max);
        lr.widthCurve = curve;
    }

    void BuildScene()
    {
        var sheet = OiyoArcade.Prim(PrimitiveType.Cube, "Sheet", sheetMat, root);
        sheet.transform.position = field.W(180f, BoxY + Box / 2f, 0.3f);
        sheet.transform.localScale = new Vector3(OiyoField.U(Box + 40f), OiyoField.U(Box + 40f), 0.1f);
        var paper = OiyoArcade.Prim(PrimitiveType.Cube, "Paper", paperMat, root);
        paper.transform.position = field.W(180f, BoxY + Box / 2f, 0.2f);
        paper.transform.localScale = new Vector3(OiyoField.U(Box + 20f), OiyoField.U(Box + 20f), 0.1f);
        guide = Line("Guide", guideMat, 0.1f);
        ink = Line("Ink", inkMat, 0.05f);
        startDot = OiyoArcade.Prim(PrimitiveType.Sphere, "Start", dotMat, root).transform;
        startDot.localScale = Vector3.one * OiyoField.U(14f);
        ShowGuide();
    }

    void ShowGuide()
    {
        if (over) { guide.positionCount = 0; startDot.gameObject.SetActive(false); return; }
        var pts = new List<Vector2>(); var ws = new List<float>();
        for (int k = 0; k <= 60; k++) { pts.Add(PointAt(k / 60f)); ws.Add(WidthAt(Kind, k / 60f)); }
        SetLine(guide, pts, ws);
        startDot.gameObject.SetActive(true);
        var s0 = PointAt(0f);
        startDot.position = field.W(s0.x, s0.y, -0.1f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("ipchun-brush", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        if (state == GameState.Playing) t += dt;
        TestTick(dt);
        ReadInput(dt);
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 1.1f; msgC = c; }

    int pressId = int.MinValue;
    float keyS;
    bool keyDrawing;

    void BeginStroke(Vector2 f)
    {
        var s0 = PointAt(0f);
        if (Vector2.Distance(f, s0) > 40f) return;
        drawing = true;
        trace.Clear();
        AddPoint(f);
    }

    void EndStroke()
    {
        if (!drawing) return;
        drawing = false;
        if (trace.Count < 3) { trace.Clear(); ink.positionCount = 0; return; }
        // keep the stroke on the paper, greyed
        var old = Line("Written", oldInkMat, 0.08f);
        var pts = new List<Vector2>(); var ws = new List<float>();
        foreach (var q in trace) { pts.Add(q.p); ws.Add(q.w); }
        SetLine(old, pts, ws);
        written.Add(old);
        var endP = trace[trace.Count - 1].p;
        float score = Write();
        ink.positionCount = 0;
        int pct = Mathf.RoundToInt(score * 100f);
        Toast($"{pct}% · " + (pct >= 85 ? U("Masterful!") : pct >= 60 ? U("Good") : U("Practise again")), pct >= 60 ? new Color(0.55f, 1f, 0.6f) : new Color(1f, 0.6f, 0.3f));
        splash.Emit(field.W(endP.x, endP.y, -0.3f), new Color(0.1f, 0.1f, 0.1f), 6, 1f, 0.05f, 0.4f);
        synth.Tone(pct >= 60 ? 784f : 260f, 0.12f, Wave.Triangle, 0.14f, pct >= 60 ? 1047f : 180f, 8f);
        ShowGuide();
        if (over) End();
    }

    void ReadInput(float dt)
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; pressId = int.MinValue; drawing = false; trace.Clear(); return; }
                    // the finger is read once per frame: press on the red dot, drag along the guide, lift to finish
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        if (state == GameState.Ready) state = GameState.Playing;
                        pressId = b.id;
                        BeginStroke(f);
                    }
                    foreach (var hp in OiyoArcade.Held())
                        if (hp.id == pressId && drawing && field.ToField(hp.pos, out Vector2 f)) AddPoint(f);
                    foreach (var e in OiyoArcade.Ended())
                        if (e.id == pressId)
                        {
                            if (drawing && field.ToField(e.pos, out Vector2 f)) AddPoint(f);
                            pressId = int.MinValue;
                            EndStroke();
                        }
                    // keyboard: Space walks the brush along the guide; the up arrow makes it quick
                    if (Input.GetKeyDown(KeyCode.Space)) { if (state == GameState.Ready) state = GameState.Playing; keyS = 0f; keyDrawing = true; BeginStroke(PointAt(0f)); }
                    if (keyDrawing && Input.GetKey(KeyCode.Space) && drawing)
                    {
                        keyS = Mathf.Min(1f, keyS + (Input.GetKey(KeyCode.UpArrow) ? 300f : 70f) * dt / len);
                        AddPoint(PointAt(keyS));
                    }
                    if (keyDrawing && Input.GetKeyUp(KeyCode.Space)) { keyDrawing = false; EndStroke(); }
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.RoundToInt(Average() * 100f), StageCount);
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
        field.Fit(110f, 20f, 0f);
        if (drawing && trace.Count > 1)
        {
            var pts = new List<Vector2>(); var ws = new List<float>();
            foreach (var q in trace) { pts.Add(q.p); ws.Add(q.w); }
            SetLine(ink, pts, ws);
        }
        else if (!drawing) ink.positionCount = 0;
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the time, the stroke,
    // whether a stroke is being drawn, the guide at 61 points (screen x, y from the top-left, wanted width), the
    // stroke's length in field px, screen px per field px, the scores so far and the mark.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.005f;
        var g = new System.Text.StringBuilder();
        for (int k = 0; k <= 60 && !over; k++)
        {
            if (k > 0) g.Append(',');
            var p = PointAt(k / 60f);
            var sp = cam.WorldToScreenPoint(field.W(p.x, p.y, 0f));
            g.Append('[').Append(sp.x.ToString("F2")).Append(',').Append((Screen.height - sp.y).ToString("F2")).Append(',').Append(WidthAt(Kind, k / 60f).ToString("F2")).Append(']');
        }
        var sc = new System.Text.StringBuilder();
        for (int i = 0; i < scores.Count; i++) { if (i > 0) sc.Append(','); sc.Append(scores[i].ToString("F3")); }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F4},\"idx\":{idx},\"drawing\":{(drawing ? "true" : "false")},\"guide\":[{g}],\"len\":{len:F2},\"ppf\":{field.ScreenPerField():F4},\"scores\":[{sc}],\"mark\":{st.mark:F3},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.79f, 0.16f, 0.16f, 0.97f);
    static readonly Color Dark = new Color(0.2f, 0.08f, 0.06f, 0.88f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Goal {0}%", Mathf.RoundToInt(IpchunBrushStages.All[i].mark * 100f));

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.95f, 0.88f), U("Ipchun Brush"),
                U("Write the eight strokes of 永. A brush draws thick when slow and thin when fast: start on the red dot, follow the guide and match its swell and taper."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + (over ? "" : $"{idx + 1}/{st.strokes.Length} · {U(KindName[Kind])}"), 15, new Color(1f, 0.95f, 0.88f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), $"{Mathf.RoundToInt(Average() * 100f)}% / {Mathf.RoundToInt(st.mark * 100f)}%", 15, Color.white);
        OiyoArcade.Shadowed(new Rect(0f, 78f, w, 40f), "<b>立春大吉</b>", 30, new Color(1f, 0.96f, 0.9f), TextAnchor.MiddleCenter);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; pressId = int.MinValue; drawing = false; trace.Clear(); }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, h - 60f, w - 16f, 36f), msg, 20, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Slow for thick, quick for thin."), 140f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("Average {0}% (goal {1}%)", Mathf.RoundToInt(Average() * 100f), Mathf.RoundToInt(st.mark * 100f))}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("Great luck as spring begins! Paste it on the gate") : U("The strokes need a little more work"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
