using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Daljip Fire 3D: the web Daljip Fire (src/components/games/DaljipFire.tsx, src/lib/games/daljip-fire.ts) rebuilt
// in Unity on the web's own 360 × 560 px field (OiyoField). The cone is 9 × 12 cells of 36 × 34 px from (18, 82).
// Fire crosses a straw cell in 0.25 s, pine in its own time (about 1 s), damp pine in 3 s; ×0.8 climbing,
// ×1.4 going down, ×(1 − 0.4 × wind × dx) sideways. Each cell catches at its quickest arrival (Dijkstra) from the
// base. The top must catch before the moonrise. The 30 cones are the web's own (DaljipFireStages.cs).
public class DaljipFirePlayer : MonoBehaviour
{
    const string Slug = "daljip-fire";
    const int StageCount = 30, Cols = 9, Rows = 12, N = Cols * Rows;
    const float CW = 36f, CH = 34f, GX = 18f, GY = 82f, Straw = 0.25f, Damp = 3f;
    static readonly Rect LightRect = new Rect(110f, 508f, 140f, 40f);

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of daljip-fire.ts) ----------------
    DaljipFireStages.Level st;
    int stageIdx, starsWon, baseCell, topCell;
    readonly HashSet<int> straw = new HashSet<int>();
    bool lit, over, won;
    float t;
    float[] at = new float[N];

    static int Col(int i) => i % Cols;
    static int Row(int i) => i / Cols;
    static int Idx(int c, int r) => r * Cols + c;

    float Cross(int from, int to)
    {
        int kind = st.cells[to];
        if (kind == 0) return float.PositiveInfinity;
        float b = straw.Contains(to) ? Straw : kind == 2 ? Damp : st.pine[to];
        int dc = Col(to) - Col(from), dr = Row(to) - Row(from);
        if (dr < 0) b *= 0.8f; else if (dr > 0) b *= 1.4f;
        if (dc != 0) b *= 1f - 0.4f * st.wind * dc;
        return b;
    }

    void Arrival()
    {
        var done = new bool[N];
        for (int i = 0; i < N; i++) at[i] = float.PositiveInfinity;
        at[baseCell] = 0f;
        for (;;)
        {
            int u = -1;
            for (int i = 0; i < N; i++) if (!done[i] && !float.IsInfinity(at[i]) && (u < 0 || at[i] < at[u])) u = i;
            if (u < 0) break;
            done[u] = true;
            int c = Col(u), r = Row(u);
            foreach (var d in new[] { (1, 0), (-1, 0), (0, 1), (0, -1) })
            {
                int cc = c + d.Item1, rr = r + d.Item2;
                if (cc < 0 || cc >= Cols || rr < 0 || rr >= Rows) continue;
                int v = Idx(cc, rr);
                if (done[v]) continue;
                float tt = at[u] + Cross(u, v);
                if (tt < at[v]) at[v] = tt;
            }
        }
    }

    void NewYard()
    {
        baseCell = Idx((Cols - 1) / 2, Rows - 1);
        topCell = Idx((Cols - 1) / 2, 0);
        straw.Clear();
        lit = false; over = false; won = false; t = 0f;
        for (int i = 0; i < N; i++) at[i] = float.PositiveInfinity;
    }

    // "packed", "removed", "full" or null
    string Toggle(int cell)
    {
        if (lit || over || st.cells[cell] == 0 || cell == baseCell) return null;
        if (straw.Contains(cell)) { straw.Remove(cell); return "removed"; }
        if (straw.Count >= st.straws) return "full";
        straw.Add(cell);
        return "packed";
    }

    bool Light()
    {
        if (lit || over) return false;
        lit = true;
        Arrival();
        return true;
    }

    bool Step(float dt)
    {
        if (!lit || over) return false;
        t += dt;
        float top = at[topCell];
        if (top <= st.moonrise && t >= top) { over = true; won = true; }
        else if (t >= st.moonrise && top > st.moonrise) over = true;
        return over;
    }

    bool Burning(int i) => lit && at[i] <= t;

    int StarsFor()
    {
        if (!won) return 0;
        float top = at[topCell];
        if (top <= st.par + 0.15f) return 3;
        if (top <= (st.par + st.moonrise) / 2f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, moon;
    readonly Renderer[] cellR = new Renderer[N];
    readonly GameObject[] flames = new GameObject[N];
    readonly GameObject[] bundles = new GameObject[N];
    Material pineMat, dampMat, strawMat, flameMat, moonMat, hillMat, snowMat, lightMat, wishMat;
    Bursts embers;
    Synth synth;
    bool showStages;

    static Vector2 Center(int i) => new Vector2(GX + (Col(i) + 0.5f) * CW, GY + (Row(i) + 0.5f) * CH);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.05f, 0.09f, 0.2f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.35f, 0.38f, 0.5f), 0.6f, 30f, -20f);
        embers = new Bursts(transform, -0.6f);
        synth = new Synth(gameObject);
        pineMat = OiyoArcade.Lit(Color.white, 0.2f, OiyoArcade.Art("DF/pine", true));
        dampMat = OiyoArcade.Lit(new Color(0.75f, 0.85f, 0.8f), 0.2f, OiyoArcade.Art("DF/pine", true));
        strawMat = OiyoArcade.Lit(Color.white, 0.2f, OiyoArcade.Art("DF/straw", true));
        flameMat = OiyoArcade.Transparent(OiyoArcade.Art("DF/flame"), new Color(1f, 0.6f, 0.15f, 0.9f));
        moonMat = OiyoArcade.Glow(new Color(1f, 0.95f, 0.75f));
        hillMat = OiyoArcade.Lit(new Color(0.11f, 0.17f, 0.29f), 0.1f);
        snowMat = OiyoArcade.Lit(new Color(0.91f, 0.93f, 0.94f), 0.1f);
        lightMat = OiyoArcade.Lit(new Color(0.85f, 0.35f, 0.08f), 0.4f);
        wishMat = OiyoField.Sprite("DF/wish");
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = DaljipFireStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Daljip").transform;
        NewYard();
        starsWon = 0;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        var hill = OiyoArcade.Prim(PrimitiveType.Cube, "Ridge", hillMat, root);
        hill.transform.position = field.W(180f, 300f, 2f);
        hill.transform.localScale = new Vector3(OiyoField.U(520f), OiyoField.U(300f), 0.5f);
        var snow = OiyoArcade.Prim(PrimitiveType.Cube, "Snow", snowMat, root);
        snow.transform.position = field.W(180f, GY + Rows * CH + 40f, 0.4f);
        snow.transform.localScale = new Vector3(OiyoField.U(520f), OiyoField.U(90f), 1.5f);
        moon = OiyoArcade.Prim(PrimitiveType.Sphere, "Moon", moonMat, root).transform;
        moon.localScale = Vector3.one * OiyoField.U(44f);
        for (int i = 0; i < N; i++)
        {
            if (st.cells[i] == 0) continue;
            var c = Center(i);
            var cube = OiyoArcade.Prim(PrimitiveType.Cube, "Cell", st.cells[i] == 2 ? dampMat : pineMat, root);
            cube.transform.position = field.W(c.x, c.y, 0f);
            cube.transform.localScale = new Vector3(OiyoField.U(CW - 2f), OiyoField.U(CH - 2f), 0.5f);
            cellR[i] = cube.GetComponent<Renderer>();
            var b = OiyoArcade.Prim(PrimitiveType.Cylinder, "Straw", strawMat, root);
            b.transform.position = field.W(c.x, c.y, -0.35f);
            b.transform.localScale = new Vector3(OiyoField.U(20f), OiyoField.U(14f), OiyoField.U(20f));
            b.SetActive(false);
            bundles[i] = b;
            var f = OiyoField.Quad("Flame", flameMat, root, CW + 6f, CH + 10f);
            f.position = field.W(c.x, c.y - 4f, -0.5f);
            f.gameObject.SetActive(false);
            flames[i] = f.gameObject;
        }
        var wish = OiyoField.Quad("Wish", wishMat, root, 22f, 28f);
        wish.position = field.W(Center(topCell).x, GY - 14f, -0.4f);
        var lt = OiyoArcade.Prim(PrimitiveType.Cube, "Light", lightMat, root);
        lt.transform.position = field.W(LightRect.center.x, LightRect.center.y, -0.2f);
        lt.transform.localScale = new Vector3(OiyoField.U(LightRect.width), OiyoField.U(LightRect.height), 0.3f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("daljip-fire", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && lit)
        {
            bool end = Step(dt);
            for (int i = 0; i < N; i++)
                if (st.cells[i] != 0 && at[i] <= t && at[i] > t - dt)
                    embers.Emit(field.W(Center(i).x, Center(i).y, -0.6f), new Color(1f, 0.7f, 0.2f), 3, 1.2f, 0.06f, 0.6f, Vector3.up * 1.5f);
            if (end) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.8f; msgC = c; }

    int cursor = Idx(4, 8);
    bool cursorShown;

    void Tap(Vector2 f)
    {
        if (state == GameState.Ready) state = GameState.Playing;
        if (LightRect.Contains(f)) { DoLight(); return; }
        int col = Mathf.FloorToInt((f.x - GX) / CW), row = Mathf.FloorToInt((f.y - GY) / CH);
        if (col < 0 || col >= Cols || row < 0 || row >= Rows) return;
        cursor = Idx(col, row);
        DoToggle(cursor);
    }

    void DoToggle(int cell)
    {
        string r = Toggle(cell);
        if (r == "packed" || r == "removed") synth.Tone(r == "packed" ? 520f : 400f, 0.06f, Wave.Triangle, 0.12f, 0f, 12f);
        else if (r == "full") Toast(U("No straw left"), new Color(1f, 0.6f, 0.3f));
    }

    void DoLight()
    {
        if (Light()) synth.Tone(200f, 0.5f, Wave.Noise, 0.12f, 600f, 3f);
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
                    // taps are read once per frame: a cell packs or unpacks straw, the plate lights the base
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        Tap(f);
                    }
                    if (Input.GetKeyDown(KeyCode.LeftArrow)) { cursor = Idx(Mathf.Max(0, Col(cursor) - 1), Row(cursor)); cursorShown = true; }
                    if (Input.GetKeyDown(KeyCode.RightArrow)) { cursor = Idx(Mathf.Min(Cols - 1, Col(cursor) + 1), Row(cursor)); cursorShown = true; }
                    if (Input.GetKeyDown(KeyCode.UpArrow)) { cursor = Idx(Col(cursor), Mathf.Max(0, Row(cursor) - 1)); cursorShown = true; }
                    if (Input.GetKeyDown(KeyCode.DownArrow)) { cursor = Idx(Col(cursor), Mathf.Min(Rows - 1, Row(cursor) + 1)); cursorShown = true; }
                    if (Input.GetKeyDown(KeyCode.Space)) { if (state == GameState.Ready) state = GameState.Playing; DoToggle(cursor); }
                    if (confirm || Input.GetKeyDown(KeyCode.L)) { if (state == GameState.Ready) state = GameState.Playing; DoLight(); }
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
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, Mathf.RoundToInt((st.moonrise - at[topCell]) * 10f)), StageCount);
            embers.Emit(field.W(180f, GY, -0.8f), new Color(1f, 0.85f, 0.3f), 30, 4f, 0.12f, 1f, Vector3.up * 2f);
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
        field.Fit(80f, 20f, 0f);
        float rise = lit ? Mathf.Min(1f, t / st.moonrise) : 0f;
        moon.position = field.W(300f, 150f - rise * 110f, 1.5f);
        for (int i = 0; i < N; i++)
        {
            if (st.cells[i] == 0) continue;
            bundles[i].SetActive(straw.Contains(i));
            bool fire = Burning(i);
            flames[i].SetActive(fire);
            if (fire) flames[i].transform.localScale = new Vector3(OiyoField.U(CW + 6f), OiyoField.U((CH + 10f) * (0.85f + 0.2f * Mathf.Sin(Time.time * 12f + i))), 1f);
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: whether lit, the burn
    // time, straw left, the cone (0 air, 1 pine, 2 damp) with each cell's pine time and whether straw is packed,
    // the wind, the moonrise, each cell's screen point (px from the top-left) and the Light plate's.
    bool testLog; float testT;
    Vector2 Scr(Vector2 f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, -0.3f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.1f;
        var cells = new System.Text.StringBuilder();
        for (int i = 0; i < N; i++)
        {
            if (i > 0) cells.Append(',');
            var s = Scr(Center(i));
            cells.Append('[').Append(st.cells[i]).Append(',').Append(st.pine[i].ToString("F4")).Append(',').Append(straw.Contains(i) ? 1 : 0).Append(',').Append(s.x.ToString("F1")).Append(',').Append(s.y.ToString("F1")).Append(']');
        }
        var l = Scr(LightRect.center);
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"lit\":{(lit ? "true" : "false")},\"t\":{t:F3},\"straws\":{st.straws},\"packed\":{straw.Count},\"wind\":{st.wind:F4},\"moonrise\":{st.moonrise:F2},\"top\":{(lit ? at[topCell] : -1f):F3},\"cells\":[{cells}],\"light\":[{l.x:F1},{l.y:F1}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.9f, 0.45f, 0.1f, 0.97f);
    static readonly Color Dark = new Color(0.05f, 0.08f, 0.18f, 0.88f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Moonrise in {0}s", DaljipFireStages.All[i].moonrise.ToString("F1"));

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.95f, 0.75f), U("Daljip Fire"),
                U("Pack dry straw into the moon house, then light it. Get the fire to the wish paper at the top before the full moon has risen."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Straw {0}/{1}", st.straws - straw.Count, st.straws), 15, new Color(1f, 0.95f, 0.75f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("Moonrise in {0}s", Mathf.Max(0f, st.moonrise - (lit ? t : 0f)).ToString("F1")) + $"   {U("Wind")} {(st.wind > 0.05f ? ">" : st.wind < -0.05f ? "<" : "")}{Mathf.RoundToInt(Mathf.Abs(st.wind) * 100)}", 14, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if ((state == GameState.Playing || state == GameState.Ready) && !lit)
        {
            var lc = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(LightRect.center.x, LightRect.center.y, -0.4f)));
            OiyoArcade.Shadowed(new Rect(lc.x - 70f, lc.y - 11f, 140f, 22f), "<b>" + U("Light") + "</b>", 18, Color.white, TextAnchor.MiddleCenter);
            if (cursorShown)
            {
                var g = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(Center(cursor).x, Center(cursor).y, -0.5f)));
                OiyoArcade.Fill(new Rect(g.x - 14f, g.y - 2f, 28f, 4f), new Color(0.98f, 0.69f, 0.02f));
                OiyoArcade.Fill(new Rect(g.x - 2f, g.y - 14f, 4f, 28f), new Color(0.98f, 0.69f, 0.02f));
            }
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 20, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Burn to the top as the moon rises."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string top = float.IsInfinity(at[topCell]) ? "—" : at[topCell].ToString("F1");
            string body = $"<size=14>{F("Top in {0}s (moon at {1}s)", top, st.moonrise.ToString("F1"))}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("The daljip blazed as the moon rose!") : U("The moon rose first"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
