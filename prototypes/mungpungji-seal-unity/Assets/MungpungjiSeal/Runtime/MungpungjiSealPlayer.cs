using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Mungpungji Seal 3D: the web Mungpungji Seal (src/components/games/MungpungjiSeal.tsx, src/lib/games/mungpungji-seal.ts)
// rebuilt in Unity on the web's own 360 × 560 px field (OiyoField). The door is 6 × 8 panes of 50 × 52 px from
// (30, 70). Each open draft frosts pane p by strength × exp(−d²/spread²) (d in panes); the eye sees
// floor(frost / 1.2 × shades) shades. A paste takes 0.6 s and stops a draft under it. Warmth (100) drains at
// Σ strength × drain per second while drafts are open; it reaching 0, or running out of paper with a draft
// still to stop, loses. The 30 rooms are the web's own (MungpungjiSealStages.cs).
public class MungpungjiSealPlayer : MonoBehaviour
{
    const string Slug = "mungpungji-seal";
    const int StageCount = 30, Cols = 6, Rows = 8, N = Cols * Rows;
    const float GX = 30f, GY = 70f, CW = 50f, CH = 52f, Paste = 0.6f, Warmth0 = 100f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of mungpungji-seal.ts) ----------------
    MungpungjiSealStages.Level st;
    int stageIdx, paperLeft, wasted, starsWon, drafts;
    float t, warmth, busyUntil;
    bool[] sealedD;
    readonly bool[] patched = new bool[N];
    bool over, won;
    string fail = "";

    int DCell(int k) => Mathf.RoundToInt(st.drafts[k * 3]);
    float DStrength(int k) => st.drafts[k * 3 + 1];
    float DAt(int k) => st.drafts[k * 3 + 2];
    bool Open(int k) => !sealedD[k] && DAt(k) <= t;

    float Frost(int cell)
    {
        int c = cell % Cols, r = cell / Cols;
        float f = 0f;
        for (int k = 0; k < drafts; k++)
        {
            if (!Open(k)) continue;
            int dc = DCell(k) % Cols - c, dr = DCell(k) / Cols - r;
            f += DStrength(k) * Mathf.Exp(-(dc * dc + dr * dr) / (st.spread * st.spread));
        }
        return f;
    }
    int Shade(int cell) => Mathf.Min(st.shades, Mathf.FloorToInt(Frost(cell) / 1.2f * st.shades));

    void NewRoom()
    {
        drafts = st.drafts.Length / 3;
        sealedD = new bool[drafts];
        System.Array.Clear(patched, 0, N);
        t = 0f; warmth = Warmth0; busyUntil = 0f; paperLeft = st.paper; wasted = 0; over = false; won = false; fail = "";
    }

    // "sealed", "wasted", "busy" or null
    string DoPaste(int cell)
    {
        if (over || patched[cell]) return null;
        if (t < busyUntil) return "busy";
        if (paperLeft <= 0) return null;
        paperLeft--; patched[cell] = true; busyUntil = t + Paste;
        bool hit = false;
        for (int k = 0; k < drafts; k++) if (!sealedD[k] && DCell(k) == cell && DAt(k) <= t) { sealedD[k] = true; hit = true; }
        if (!hit) wasted++;
        Check();
        return hit ? "sealed" : "wasted";
    }

    void Check()
    {
        if (over) return;
        bool allOpened = true, allSealed = true, anyLeft = false;
        for (int k = 0; k < drafts; k++) { if (DAt(k) > t) allOpened = false; if (!sealedD[k]) { allSealed = false; anyLeft = true; } }
        if (allOpened && allSealed) { over = true; won = true; }
        else if (paperLeft <= 0 && anyLeft) { over = true; fail = "paper"; }
    }

    readonly List<int> openedNow = new List<int>();
    bool Step(float dt)
    {
        openedNow.Clear();
        if (over) return false;
        float before = t;
        t += dt;
        for (int k = 0; k < drafts; k++)
            if (DAt(k) > before && DAt(k) <= t)
            {
                if (patched[DCell(k)]) sealedD[k] = true; else openedNow.Add(DCell(k));
            }
        float drain = 0f;
        for (int k = 0; k < drafts; k++) if (Open(k)) drain += DStrength(k);
        warmth -= drain * st.drain * dt;
        if (warmth <= 0f) { warmth = 0f; over = true; fail = "cold"; }
        else Check();
        return over;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (wasted == 0 && warmth >= 60f) return 3;
        if (wasted <= 1 && warmth >= 35f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, candle, flame;
    readonly Renderer[] frostR = new Renderer[N];
    readonly Material[] frostM = new Material[N];
    readonly GameObject[] strips = new GameObject[N];
    Material paperMat, latticeMat, wallMat, stripMat, waxMat, flameMat;
    Bursts bursts;
    Synth synth;
    bool showStages;

    static Vector2 Center(int i) => new Vector2(GX + (i % Cols + 0.5f) * CW, GY + (i / Cols + 0.5f) * CH);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.36f, 0.24f, 0.18f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.62f, 0.56f, 0.5f), 0.7f, 30f, -20f);
        bursts = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        paperMat = OiyoArcade.Lit(Color.white, 0.05f, OiyoArcade.Art("MS/hanji", true));
        latticeMat = OiyoArcade.Lit(new Color(0.42f, 0.27f, 0.14f), 0.3f);
        wallMat = OiyoArcade.Lit(new Color(0.36f, 0.24f, 0.18f), 0.1f);
        stripMat = OiyoArcade.Lit(new Color(0.91f, 0.77f, 0.42f), 0.1f, OiyoArcade.Art("MS/hanji", true));
        waxMat = OiyoArcade.Lit(new Color(0.97f, 0.97f, 0.95f), 0.4f);
        flameMat = OiyoArcade.Glow(new Color(1f, 0.75f, 0.25f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = MungpungjiSealStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Room").transform;
        NewRoom();
        starsWon = 0;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        var wall = OiyoArcade.Prim(PrimitiveType.Cube, "Wall", wallMat, root);
        wall.transform.position = field.W(180f, 280f, 0.4f);
        wall.transform.localScale = new Vector3(OiyoField.U(460f), OiyoField.U(660f), 0.2f);
        var frame = OiyoArcade.Prim(PrimitiveType.Cube, "Frame", latticeMat, root);
        frame.transform.position = field.W(GX + Cols * CW * 0.5f, GY + Rows * CH * 0.5f, 0.2f);
        frame.transform.localScale = new Vector3(OiyoField.U(Cols * CW + 24f), OiyoField.U(Rows * CH + 24f), 0.2f);
        for (int i = 0; i < N; i++)
        {
            var c = Center(i);
            var pane = OiyoField.Quad("Pane", paperMat, root, CW - 6f, CH - 6f);
            pane.position = field.W(c.x, c.y, 0f);
            frostM[i] = OiyoArcade.Transparent(OiyoArcade.Art("MS/frost"), new Color(0.65f, 0.85f, 1f, 0f));
            var fr = OiyoField.Quad("Frost", frostM[i], root, CW - 6f, CH - 6f);
            fr.position = field.W(c.x, c.y, -0.02f);
            frostR[i] = fr.GetComponent<Renderer>();
            var strip = OiyoArcade.Prim(PrimitiveType.Cube, "Strip", stripMat, root);
            strip.transform.position = field.W(c.x, c.y, -0.06f);
            strip.transform.localScale = new Vector3(OiyoField.U(CW - 12f), OiyoField.U(16f), 0.02f);
            strip.SetActive(false);
            strips[i] = strip;
        }
        for (int col = 0; col <= Cols; col++)
        {
            var bar = OiyoArcade.Prim(PrimitiveType.Cube, "Mullion", latticeMat, root);
            bar.transform.position = field.W(GX + col * CW, GY + Rows * CH * 0.5f, -0.1f);
            bar.transform.localScale = new Vector3(OiyoField.U(6f), OiyoField.U(Rows * CH), 0.12f);
        }
        for (int row = 0; row <= Rows; row++)
        {
            var bar = OiyoArcade.Prim(PrimitiveType.Cube, "Rail", latticeMat, root);
            bar.transform.position = field.W(GX + Cols * CW * 0.5f, GY + row * CH, -0.1f);
            bar.transform.localScale = new Vector3(OiyoField.U(Cols * CW), OiyoField.U(6f), 0.12f);
        }
        candle = OiyoArcade.Prim(PrimitiveType.Cylinder, "Candle", waxMat, root).transform;
        candle.position = field.W(40f, 535f, -0.8f);
        candle.localScale = new Vector3(OiyoField.U(14f), OiyoField.U(16f), OiyoField.U(14f));
        flame = OiyoArcade.Prim(PrimitiveType.Sphere, "Flame", flameMat, root).transform;
        flame.localScale = new Vector3(OiyoField.U(10f), OiyoField.U(16f), OiyoField.U(10f));
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("mungpungji-seal", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            bool end = Step(dt);
            if (openedNow.Count > 0) { Toast(U("Whoosh! A new draft"), new Color(0.6f, 0.8f, 1f)); synth.Tone(300f, 0.4f, Wave.Noise, 0.08f, 900f, 3f); }
            if (end || over) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.9f; msgC = c; }

    int cursor = 21;
    bool cursorShown;

    void Tap(int cell)
    {
        if (state == GameState.Ready) { state = GameState.Playing; return; }
        string r = DoPaste(cell);
        var c = Center(cell);
        if (r == "sealed")
        {
            Toast(U("Draft stopped!"), new Color(0.55f, 1f, 0.6f));
            bursts.Emit(field.W(c.x, c.y, -0.3f), new Color(1f, 0.95f, 0.75f), 10, 1.5f, 0.1f, 0.5f);
            synth.Tone(784f, 0.12f, Wave.Triangle, 0.16f, 1047f, 8f);
        }
        else if (r == "wasted") { Toast(U("Not here"), new Color(0.8f, 0.8f, 0.8f)); synth.Tone(240f, 0.15f, Wave.Square, 0.07f, 160f, 10f); }
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
                    // taps are read once per frame: a tap on a pane pastes a strip there
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos)) continue;
                        if (!field.ToField(b.pos, out Vector2 f)) continue;
                        int col = Mathf.FloorToInt((f.x - GX) / CW), row = Mathf.FloorToInt((f.y - GY) / CH);
                        if (col >= 0 && col < Cols && row >= 0 && row < Rows) { cursor = row * Cols + col; cursorShown = false; Tap(cursor); }
                        else if (state == GameState.Ready) state = GameState.Playing;
                    }
                    if (Input.GetKeyDown(KeyCode.LeftArrow)) { cursor = cursor / Cols * Cols + Mathf.Max(0, cursor % Cols - 1); cursorShown = true; }
                    if (Input.GetKeyDown(KeyCode.RightArrow)) { cursor = cursor / Cols * Cols + Mathf.Min(Cols - 1, cursor % Cols + 1); cursorShown = true; }
                    if (Input.GetKeyDown(KeyCode.UpArrow)) { cursor = Mathf.Max(0, cursor / Cols - 1) * Cols + cursor % Cols; cursorShown = true; }
                    if (Input.GetKeyDown(KeyCode.DownArrow)) { cursor = Mathf.Min(Rows - 1, cursor / Cols + 1) * Cols + cursor % Cols; cursorShown = true; }
                    if (Input.GetKeyDown(KeyCode.Space)) { cursorShown = true; Tap(cursor); }
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.RoundToInt(warmth), StageCount);
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
        field.Fit(80f, 30f, 0f);
        for (int i = 0; i < N; i++)
        {
            int s = Shade(i);
            frostM[i].color = new Color(0.45f, 0.72f, 1f, s == 0 ? 0f : 0.25f + 0.75f * s / st.shades);
            strips[i].SetActive(patched[i]);
        }
        float lean = Mathf.Sin(Time.time * 7f) * (warmth < 40f ? 3f : 1f);
        flame.position = field.W(40f + lean, 512f, -0.8f);
        float glow = Mathf.Lerp(0.4f, 1f, warmth / Warmth0);
        flame.localScale = new Vector3(OiyoField.U(10f * glow), OiyoField.U(16f * glow), OiyoField.U(10f * glow));
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: time, warmth, paper,
    // whether a paste is under way, every pane's shade (as the eye sees it) and whether it is papered, and
    // each pane's screen point (px from the top-left).
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.05f;
        var sh = new System.Text.StringBuilder();
        var pos = new System.Text.StringBuilder();
        for (int i = 0; i < N; i++)
        {
            if (i > 0) { sh.Append(','); pos.Append(','); }
            sh.Append(patched[i] ? -1 : Shade(i));
            var c = Center(i);
            var sp = cam.WorldToScreenPoint(field.W(c.x, c.y, 0f));
            pos.Append('[').Append(sp.x.ToString("F1")).Append(',').Append((Screen.height - sp.y).ToString("F1")).Append(']');
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F3},\"warmth\":{warmth:F2},\"paper\":{paperLeft},\"busy\":{(t < busyUntil ? "true" : "false")},\"shades\":[{sh}],\"cells\":[{pos}],\"wasted\":{wasted},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.9f, 0.6f, 0.2f, 0.97f);
    static readonly Color Dark = new Color(0.2f, 0.13f, 0.09f, 0.88f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} drafts", MungpungjiSealStages.All[i].drafts.Length / 3);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.95f, 0.85f), U("Mungpungji Seal"),
                U("Frost gathers on the paper around each hidden draft. Tap the frostiest pane to paste a strip and stop the drafts before the room goes cold."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("{0} paper strips", paperLeft), 15, new Color(1f, 0.92f, 0.8f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("Warmth {0}%", Mathf.RoundToInt(warmth)), 16, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Playing || state == GameState.Ready)
        {
            OiyoArcade.Bar(new Rect(70f, h - 34f, w - 90f, 12f), warmth / Warmth0, new Color(0f, 0f, 0f, 0.4f), warmth > 50f ? new Color(1f, 0.57f, 0.17f) : warmth > 25f ? new Color(0.98f, 0.69f, 0.02f) : new Color(0.3f, 0.67f, 0.97f));
            if (cursorShown)
            {
                var c = Center(cursor);
                var g = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(c.x, c.y, -0.2f)));
                OiyoArcade.Fill(new Rect(g.x - 18f, g.y - 2f, 36f, 4f), new Color(0.98f, 0.69f, 0.02f));
                OiyoArcade.Fill(new Rect(g.x - 2f, g.y - 18f, 4f, 36f), new Color(0.98f, 0.69f, 0.02f));
            }
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 20, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Read the frost, stop the draft."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("Warmth {0}% · {1} strips wasted", Mathf.RoundToInt(warmth), wasted)}</size>";
            string head = w0 ? U("The room is warm again!") : fail == "paper" ? U("Out of paper") : U("The room went cold");
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, head, detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
