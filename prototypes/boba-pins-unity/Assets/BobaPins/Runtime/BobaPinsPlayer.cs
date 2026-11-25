using System.Collections;
using UnityEngine;

// Boba Pins 3D: the web Boba Pins (src/components/games/BobaPins.tsx, src/lib/games/boba-pins.ts) rebuilt in Unity on
// the web's own 360 × 560 px field (OiyoField). Tap a golden pin to pull it and whatever it held falls. Fill the cup
// with every pearl, all brown: white pearls turn brown when a brown one touches them, white ones or chili in the cup
// spoil it, and pearls in a side bin are wasted. The grid runs the web's own fall-slide-roll steps; the 30 machines
// are the web's own (BobaPinsStages.cs).
public class BobaPinsPlayer : MonoBehaviour
{
    const string Slug = "boba-pins";
    const int StageCount = 30;
    const int Cols = 18, Rows = 28, CupTop = 15, Roll = 7;
    const float Cell = 20f, StepS = 1f / 30f;
    const int Empty = 0, Wall = 1, Pin = 2, Plain = 3, Brown = 4, Chili = 5;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of boba-pins.ts) ----------------
    BobaPinsStages.Level st;
    int stageIdx, starsWon, pulls, steps, nPins;
    int[] g;
    int[][] pinCells;
    bool[] pulled;
    bool settled, over, won;
    string why = "";

    static int At(int r, int c) => r * Cols + c;
    static bool IsCup(int r, int c) => r >= CupTop && r < Rows - 1 && c >= 4 && c <= 13;
    static bool IsBin(int c) => c == 1 || c == 2 || c == 15 || c == 16;
    static bool IsGrain(int v) => v == Plain || v == Brown || v == Chili;

    bool Pull(int k)
    {
        if (over || k < 0 || k >= nPins || pulled[k]) return false;
        pulled[k] = true;
        pulls++;
        foreach (int i in pinCells[k]) if (g[i] == Pin) g[i] = Empty;
        settled = false;
        return true;
    }

    bool Step()
    {
        if (over) return false;
        var moved = new bool[g.Length];
        bool changed = false;
        bool lr = steps % 2 == 0;
        int[] dirs = lr ? new[] { -1, 1 } : new[] { 1, -1 };
        for (int r = Rows - 2; r >= 0; r--)
        {
            for (int j = 0; j < Cols; j++)
            {
                int c = lr ? j : Cols - 1 - j;
                int i = At(r, c), v = g[i];
                if (!IsGrain(v) || moved[i]) continue;
                int to = -1;
                if (g[At(r + 1, c)] == Empty) to = At(r + 1, c);
                else
                {
                    foreach (int d in dirs)
                    {
                        int cc = c + d;
                        if (cc < 0 || cc >= Cols) continue;
                        if (g[At(r, cc)] == Empty && g[At(r + 1, cc)] == Empty) { to = At(r + 1, cc); break; }
                    }
                    if (to < 0)
                    {
                        // roll along the floor toward the nearest drop
                        int best = 0, bestK = Roll + 1;
                        foreach (int d in dirs)
                        {
                            for (int k = 1; k <= Roll; k++)
                            {
                                int cc = c + d * k;
                                if (cc < 0 || cc >= Cols || g[At(r, cc)] != Empty) break;
                                if (g[At(r + 1, cc)] == Empty) { if (k < bestK) { bestK = k; best = d; } break; }
                            }
                        }
                        if (best != 0) to = At(r, c + best);
                    }
                }
                if (to < 0) continue;
                g[to] = v; g[i] = Empty; moved[to] = true; changed = true;
            }
        }
        // brown spreads to the white pearls it touches
        var turn = new System.Collections.Generic.List<int>();
        for (int i = 0; i < g.Length; i++)
        {
            if (g[i] != Plain) continue;
            int r = i / Cols, c = i % Cols;
            if ((r > 0 && g[i - Cols] == Brown) || (r < Rows - 1 && g[i + Cols] == Brown) || (c > 0 && g[i - 1] == Brown) || (c < Cols - 1 && g[i + 1] == Brown)) turn.Add(i);
        }
        foreach (int i in turn) g[i] = Brown;
        if (turn.Count > 0) changed = true;
        steps++;
        settled = !changed;
        Judge();
        return changed;
    }

    void Judge()
    {
        int pearls = 0, served = 0;
        for (int i = 0; i < g.Length; i++)
        {
            int v = g[i];
            if (!IsGrain(v)) continue;
            int r = i / Cols, c = i % Cols;
            if (v != Chili) pearls++;
            if (IsCup(r, c))
            {
                if (v == Chili) { Lose("chili"); return; }
                if (v == Plain) { Lose("plain"); return; }
                served++;
            }
            if (v != Chili && IsBin(c)) { Lose("spill"); return; }
        }
        if (settled && served == pearls) { over = true; won = true; }
    }

    void Lose(string w) { over = true; why = w; }

    int StarsFor()
    {
        if (!won) return 0;
        if (pulls <= st.par) return 3;
        if (pulls <= st.par + 1) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, pickObj;
    Transform[] grainObj;
    Renderer[] grainRen;
    Transform[][] pinObj;
    Transform[] knobObj;
    Material brownMat, whiteMat, chiliMat;
    Bursts burst;
    Synth synth;
    bool showStages, keyed;
    int pick;
    float acc;

    Vector2 CellCentre(int i) => new Vector2((i % Cols) * Cell + Cell / 2f, (i / Cols) * Cell + Cell / 2f);

    Vector2 KnobOf(int k)
    {
        var cells = pinCells[k];
        int r0 = cells[0] / Cols;
        bool flat = true;
        foreach (int i in cells) if (i / Cols != r0) flat = false;
        if (flat)
        {
            int cMax = 0;
            foreach (int i in cells) cMax = Mathf.Max(cMax, i % Cols);
            return new Vector2(cMax * Cell + Cell / 2f, r0 * Cell + Cell / 2f);
        }
        int rMin = Rows;
        foreach (int i in cells) rMin = Mathf.Min(rMin, i / Cols);
        return new Vector2((cells[0] % Cols) * Cell + Cell / 2f, rMin * Cell + Cell / 2f);
    }

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(1f, 0.94f, 0.96f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.78f, 0.76f, 0.78f), 0.7f, 50f, -25f);
        burst = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        brownMat = OiyoField.Sprite("BP/brown");
        whiteMat = OiyoField.Sprite("BP/white");
        chiliMat = OiyoField.Sprite("BP/chili");
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        st = BobaPinsStages.All[stageIdx];
        g = (int[])st.grid.Clone();
        nPins = st.pinLen.Length;
        pinCells = new int[nPins][];
        int at = 0;
        for (int k = 0; k < nPins; k++)
        {
            pinCells[k] = new int[st.pinLen[k]];
            for (int j = 0; j < st.pinLen[k]; j++) pinCells[k][j] = st.pinCells[at++];
        }
        pulled = new bool[nPins];
        pulls = 0; steps = 0; settled = true; over = false; won = false; why = ""; starsWon = 0; acc = 0f; keyed = false; pick = 0;
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Machine").transform;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate();
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
        Box("Back", OiyoArcade.Glow(new Color(1f, 0.94f, 0.96f)), 180f, 280f, 1200f, 1600f, 0.8f, 0.2f);
        // the cup of milk tea, the bins either side
        Box("Tea", OiyoArcade.Glow(new Color(0.95f, 0.88f, 0.78f)), 4 * Cell + 5 * Cell, CupTop * Cell + (Rows - 1 - CupTop) * Cell / 2f, 10 * Cell, (Rows - 1 - CupTop) * Cell, 0.6f, 0.05f);
        var stripe = OiyoArcade.Glow(new Color(0.91f, 0.81f, 0.66f));
        for (float yy = CupTop * Cell + 8f; yy < (Rows - 1) * Cell; yy += 16f) Box("Stripe", stripe, 9 * Cell, yy, 10 * Cell, 2f, 0.55f, 0.02f);
        Box("Rim", OiyoArcade.Lit(new Color(0.68f, 0.71f, 0.74f), 0.6f), 9 * Cell, CupTop * Cell - 1.5f, 10 * Cell, 3f, -0.1f, OiyoField.U(6f));
        var binMat = OiyoArcade.Glow(new Color(0.91f, 0.93f, 0.94f));
        Box("BinL", binMat, 2 * Cell, Rows * Cell / 2f, 2 * Cell, (Rows - 2) * Cell, 0.6f, 0.05f);
        Box("BinR", binMat, 16 * Cell, Rows * Cell / 2f, 2 * Cell, (Rows - 2) * Cell, 0.6f, 0.05f);
        var wall = OiyoArcade.Lit(new Color(0.44f, 0.28f, 0.91f), 0.35f);
        for (int i = 0; i < g.Length; i++)
        {
            if (st.grid[i] != Wall) continue;
            var c = CellCentre(i);
            Box("Wall", wall, c.x, c.y, Cell - 1f, Cell - 1f, 0f, OiyoField.U(Cell));
        }
        var gold = OiyoArcade.LitGlow(new Color(0.98f, 0.69f, 0.02f), new Color(0.35f, 0.22f, 0f), 0.6f);
        var knobMat = OiyoField.Sprite("BP/knob");
        pinObj = new Transform[nPins][];
        knobObj = new Transform[nPins];
        for (int k = 0; k < nPins; k++)
        {
            int r0 = pinCells[k][0] / Cols;
            bool flat = true;
            foreach (int i in pinCells[k]) if (i / Cols != r0) flat = false;
            pinObj[k] = new Transform[pinCells[k].Length];
            for (int j = 0; j < pinCells[k].Length; j++)
            {
                var c = CellCentre(pinCells[k][j]);
                pinObj[k][j] = flat ? Box("Pin", gold, c.x, c.y, Cell, 8f, -0.05f, OiyoField.U(8f)) : Box("Pin", gold, c.x, c.y, 8f, Cell, -0.05f, OiyoField.U(8f));
            }
            var kp = KnobOf(k);
            knobObj[k] = OiyoField.Quad("Knob", knobMat, root, 22f, 22f);
            knobObj[k].position = field.W(kp.x, kp.y, -0.3f);
        }
        grainObj = new Transform[g.Length];
        grainRen = new Renderer[g.Length];
        for (int i = 0; i < g.Length; i++)
        {
            if (st.grid[i] == Wall) continue;
            var c = CellCentre(i);
            grainObj[i] = OiyoField.Quad("Pearl", brownMat, root, Cell, Cell);
            grainObj[i].position = field.W(c.x, c.y, -0.2f);
            grainRen[i] = grainObj[i].GetComponent<Renderer>();
        }
        pickObj = Box("Pick", OiyoArcade.Glow(new Color(0.11f, 0.49f, 0.84f)), 0f, 0f, 26f, 3f, -0.6f, 0.02f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("boba-pins", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick();
        ReadInput();
        if (state == GameState.Playing && !over)
        {
            acc += dt;
            while (acc >= StepS && !over)
            {
                acc -= StepS;
                Step();
            }
            if (over) End();
        }
        Animate();
    }

    void PullPin(int k)
    {
        if (state != GameState.Playing || !Pull(k)) return;
        var kp = KnobOf(k);
        burst.Emit(field.W(kp.x, kp.y, -0.6f), new Color(0.98f, 0.69f, 0.02f), 10, 2f, 0.05f, 0.4f);
        synth.Tone(880f, 0.06f, Wave.Square, 0.06f, 1320f);
    }

    int NearestPin(Vector2 f)
    {
        int best = -1;
        float bestD = Cell * 1.2f;
        for (int k = 0; k < nPins; k++)
        {
            if (pulled[k]) continue;
            foreach (int i in pinCells[k])
            {
                float d = Vector2.Distance(CellCentre(i), f);
                if (d < bestD) { bestD = d; best = k; }
            }
        }
        return best;
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
                    // input is read once per frame: a tap near a pin pulls it
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        keyed = false;
                        if (field.ToField(b.pos, out Vector2 f)) { int k = NearestPin(f); if (k >= 0) PullPin(k); }
                    }
                    int dir = Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.UpArrow) ? -1 : Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.DownArrow) ? 1 : 0;
                    if (dir != 0)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        if (!keyed) keyed = true;
                        else for (int n = 0; n < nPins; n++) { pick = (pick + dir + nPins) % nPins; if (!pulled[pick]) break; }
                    }
                    if (keyed && pulled[pick]) for (int n = 0; n < nPins && pulled[pick]; n++) pick = (pick + 1) % nPins;
                    if (Input.GetKeyDown(KeyCode.Space) || confirm)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else if (!keyed) keyed = true;
                        else PullPin(pick);
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, (st.par + 3 - pulls) * 10), StageCount);
            burst.Emit(field.W(180f, 420f, -1f), new Color(0.9f, 0.77f, 0.6f), 40, 4f, 0.1f, 1f);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f }, 0.1f));
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

    void Animate()
    {
        if (root == null) return;
        field.Fit(56f, 10f, 0f, 0f, 560f);
        for (int i = 0; i < g.Length; i++)
        {
            if (grainObj[i] == null) continue;
            int v = g[i];
            bool on = IsGrain(v);
            grainObj[i].gameObject.SetActive(on);
            if (on) grainRen[i].sharedMaterial = v == Brown ? brownMat : v == Plain ? whiteMat : chiliMat;
        }
        for (int k = 0; k < nPins; k++)
        {
            foreach (var p in pinObj[k]) p.gameObject.SetActive(!pulled[k]);
            knobObj[k].gameObject.SetActive(!pulled[k]);
        }
        pickObj.gameObject.SetActive(keyed && !pulled[pick] && !over);
        if (keyed) { var kp = KnobOf(pick); pickObj.position = field.W(kp.x, kp.y + 14f, -0.6f); }
    }

    // ?oiyotest=1 prints the state to the browser console every frame for the automated play check. Once everything has
    // settled it gives the screen point of the next pin in the machine's own plan.
    bool testLog;
    void TestTick()
    {
        if (!testLog) return;
        string nx = "null";
        if (state == GameState.Playing && !over && settled && pulls < st.plan.Length)
        {
            var kp = KnobOf(st.plan[pulls]);
            var sp = cam.WorldToScreenPoint(field.W(kp.x, kp.y, 0f));
            nx = $"[{sp.x:F1},{Screen.height - sp.y:F1}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"taps\":{pulls},\"par\":{st.par},\"why\":\"{why}\",\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.53f, 0.37f, 0.97f, 0.97f);
    static readonly Color Dark = new Color(0.17f, 0.09f, 0.27f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} pins", BobaPinsStages.All[i].pinLen.Length);

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu)
        {
            if (showStages)
            {
                int pickS = OiyoScreens.Stages(w, h, Dark, Accent, Slug, StageCount, U("Choose a stage"), U("Back"), U("Stage"));
                if (pickS == -2) showStages = false; else if (pickS >= 0) LoadStage(pickS);
                return;
            }
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.92f, 0.96f), U("Boba Pins"),
                U("Tap a golden pin to pull it, and what it held falls. White pearls turn brown when a brown one touches them. Fill the cup with every pearl, all brown: no white pearls or chili in the cup, no pearls in the bins."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Pins {0}", pulls), 15, new Color(1f, 0.92f, 0.96f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap a pin to pull it!"), 120f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = won ? $"<size=14>{F("Made with {0} pins", pulls)}</size>" : "";
            string head = won ? U("Bubble tea's ready!") : why == "chili" ? U("Chili got in the cup") : why == "spill" ? U("Pearls rolled into a bin") : U("A white pearl got in the cup");
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, head, detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
