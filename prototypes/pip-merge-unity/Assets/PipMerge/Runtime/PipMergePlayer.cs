using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Pip Merge 3D: the web Pip Merge (src/components/games/PipMerge.tsx, src/lib/games/pip-merge.ts) rebuilt in Unity on
// the web's own 360 × 560 px field (OiyoField). Dice come one at a time; put each on an empty square of a 5 × 5 tray.
// Three or more touching dice with the same face merge into one a pip higher, and can chain; three sixes burst.
// The 30 stages are the web's own (PipMergeStages.cs). All rule arithmetic is integer, as on the web.
public class PipMergePlayer : MonoBehaviour
{
    const string Slug = "pip-merge";
    const int StageCount = 30;
    const int Size = 5, Cells = 25, Rock = -1, BurstBonus = 60;
    const float Cell = 58f, Gap = 6f, BY = 170f;
    static readonly float BX = (360f - (5 * Cell + 4 * Gap)) / 2f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of pip-merge.ts) ----------------
    PipMergeStages.Level st;
    int stageIdx, starsWon, next, score, best;
    int[] cells;
    bool over, won;

    struct PlaceEvent { public List<int> cleared; public int chain, gained, face; public bool burst; }

    static List<int> Neighbours(int i)
    {
        int r = i / Size, c = i % Size;
        var o = new List<int>(4);
        if (r > 0) o.Add(i - Size);
        if (r < Size - 1) o.Add(i + Size);
        if (c > 0) o.Add(i - 1);
        if (c < Size - 1) o.Add(i + 1);
        return o;
    }

    static List<int> Group(int[] cs, int i, int v)
    {
        var seen = new HashSet<int> { i };
        var stack = new Stack<int>(); stack.Push(i);
        while (stack.Count > 0)
        {
            int k = stack.Pop();
            foreach (int n in Neighbours(k)) if (!seen.Contains(n) && cs[n] == v) { seen.Add(n); stack.Push(n); }
        }
        var g = new List<int>(seen); g.Sort();
        return g;
    }

    static PlaceEvent Settle(int[] cs, int i, int v)
    {
        var ev = new PlaceEvent { cleared = new List<int>(), face = v };
        cs[i] = v;
        for (;;)
        {
            var g = Group(cs, i, v);
            if (g.Count < 3) break;
            ev.chain++;
            ev.gained += v * v * g.Count * (1 << (ev.chain - 1));
            foreach (int k in g) if (k != i) { cs[k] = 0; ev.cleared.Add(k); }
            if (v == 6)
            {
                ev.burst = true;
                cs[i] = 0; ev.cleared.Add(i);
                int r = i / Size, c = i % Size;
                for (int dr = -1; dr <= 1; dr++)
                    for (int dc = -1; dc <= 1; dc++)
                    {
                        int rr = r + dr, cc = c + dc;
                        if (rr < 0 || rr >= Size || cc < 0 || cc >= Size) continue;
                        int k = rr * Size + cc;
                        if (cs[k] > 0) { ev.gained += cs[k] * 2; cs[k] = 0; ev.cleared.Add(k); }
                    }
                ev.gained += BurstBonus;
                ev.face = 0;
                break;
            }
            v++;
            cs[i] = v;
            ev.face = v;
        }
        return ev;
    }

    static List<int> Empties(int[] cs)
    {
        var e = new List<int>();
        for (int i = 0; i < Cells; i++) if (cs[i] == 0) e.Add(i);
        return e;
    }

    PlaceEvent? Place(int i)
    {
        if (over || cells[i] != 0) return null;
        int v = st.dice[next++];
        var ev = Settle(cells, i, v);
        score += ev.gained;
        best = Mathf.Max(best, ev.chain);
        if (next >= st.dice.Length || Empties(cells).Count == 0) { over = true; won = score >= st.need; }
        return ev;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (score >= st.par) return 3;
        if (score >= Mathf.CeilToInt((st.need + st.par) / 2f)) return 2;
        return 1;
    }

    static int ShapeValue(int[] cs)
    {
        int v = 0;
        for (int i = 0; i < Cells; i++)
        {
            int a = cs[i];
            if (a == 0) v += 3;
            if (a <= 0) continue;
            int r = i / Size, c = i % Size;
            if (c < Size - 1 && cs[i + 1] == a) v += a * 2;
            if (r < Size - 1 && cs[i + Size] == a) v += a * 2;
        }
        return v;
    }

    /** The square the careful player (one die ahead) picks: the web's rankMoves(t, true)[0]. */
    int BestMove()
    {
        int v = st.dice[next];
        bool hasAfter = next + 1 < st.dice.Length;
        int after = hasAfter ? st.dice[next + 1] : 0;
        int bestI = -1, bestV = int.MinValue;
        foreach (int i in Empties(cells))
        {
            var a = (int[])cells.Clone();
            var ea = Settle(a, i, v);
            int value = ea.gained * 10 + ShapeValue(a);
            if (hasAfter)
            {
                int bestB = -1;
                foreach (int j in Empties(a))
                {
                    var b = (int[])a.Clone();
                    var eb = Settle(b, j, after);
                    int vb = eb.gained * 9 + ShapeValue(b);
                    if (vb > bestB) bestB = vb;
                }
                if (bestB < 0) bestB = -500;
                value = ea.gained * 10 + bestB;
            }
            if (value > bestV) { bestV = value; bestI = i; }
        }
        return bestI;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, cursorObj;
    Transform[] die;
    Transform[][] pip;
    Renderer[] dieFace;
    Transform previewDie, previewDie2;
    Transform[] previewPip, previewPip2;
    Renderer previewFace, previewFace2;
    float[] flash;
    Material[] faceMat;
    Material pipMat, redPipMat, feltMat, woodMat, rockMat, glowMat;
    Bursts sparkle;
    Synth synth;
    bool showStages, keyed;
    int cursor = 12;
    float popT; string popText; int popAt;

    static readonly Color[] FaceColors = { Color.white, new Color(1f, 0.96f, 0.96f), new Color(1f, 0.98f, 0.86f), new Color(0.92f, 0.98f, 0.93f), new Color(0.91f, 0.96f, 1f), new Color(0.95f, 0.94f, 1f), new Color(1f, 0.91f, 0.8f) };
    static readonly int[][] PipSpots =
    {
        new int[0],
        new[] { 4 },
        new[] { 0, 8 },
        new[] { 0, 4, 8 },
        new[] { 0, 2, 6, 8 },
        new[] { 0, 2, 4, 6, 8 },
        new[] { 0, 2, 3, 5, 6, 8 },
    };

    Vector2 CellCentre(int i) => new Vector2(BX + (i % 5) * (Cell + Gap) + Cell / 2f, BY + (i / 5) * (Cell + Gap) + Cell / 2f);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.17f, 0.54f, 0.24f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.62f, 0.64f, 0.62f), 0.75f, 45f, -30f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        faceMat = new Material[7];
        for (int k = 0; k < 7; k++) faceMat[k] = OiyoArcade.Lit(FaceColors[k], 0.5f);
        pipMat = OiyoArcade.Lit(new Color(0.13f, 0.15f, 0.16f), 0.3f);
        redPipMat = OiyoArcade.Lit(new Color(0.88f, 0.19f, 0.19f), 0.3f);
        feltMat = OiyoArcade.Lit(new Color(0.12f, 0.44f, 0.19f), 0.05f);
        woodMat = OiyoArcade.Lit(new Color(0.54f, 0.35f, 0.17f), 0.25f);
        rockMat = OiyoArcade.Lit(new Color(0.53f, 0.56f, 0.59f), 0.15f);
        glowMat = OiyoArcade.Glow(new Color(1f, 0.83f, 0.23f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = PipMergeStages.All[stageIdx];
        cells = new int[Cells];
        foreach (int r in st.rocks) cells[r] = Rock;
        next = 0; score = 0; best = 0; over = false; won = false; starsWon = 0; cursor = 12; keyed = false; popT = 0f;
        flash = new float[Cells];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Tray").transform;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Box(string name, Material m, float x, float y, float w, float h, float z, float d, Transform parent = null)
    {
        var o = OiyoArcade.Prim(PrimitiveType.Cube, name, m, parent ?? root).transform;
        o.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), d);
        o.position = field.W(x, y, z);
        return o;
    }

    Transform MakeDie(float size, out Renderer face, out Transform[] pips)
    {
        var d = new GameObject("Die").transform;
        d.SetParent(root, false);
        var body = OiyoArcade.Prim(PrimitiveType.Cube, "Body", faceMat[1], d).transform;
        body.localScale = new Vector3(OiyoField.U(size), OiyoField.U(size), OiyoField.U(size));
        face = body.GetComponent<Renderer>();
        pips = new Transform[6];
        for (int k = 0; k < 6; k++)
        {
            pips[k] = OiyoArcade.Prim(PrimitiveType.Cube, "Pip", pipMat, d).transform;
            pips[k].localScale = new Vector3(OiyoField.U(size / 6.5f), OiyoField.U(size / 6.5f), OiyoField.U(2f));
        }
        return d;
    }

    void ShowFace(Transform d, Renderer face, Transform[] pips, int v, float size)
    {
        d.gameObject.SetActive(v > 0);
        if (v <= 0) return;
        face.sharedMaterial = faceMat[v];
        var spots = PipSpots[v];
        for (int k = 0; k < 6; k++)
        {
            bool on = k < spots.Length;
            pips[k].gameObject.SetActive(on);
            if (!on) continue;
            int s = spots[k];
            float px = ((s % 3) - 1) * size * 0.28f, py = ((s / 3) - 1) * size * 0.28f;
            pips[k].localPosition = new Vector3(OiyoField.U(px), -OiyoField.U(py), -OiyoField.U(size / 2f + 0.6f));
            pips[k].GetComponent<Renderer>().sharedMaterial = v == 6 ? redPipMat : pipMat;
        }
    }

    void BuildScene()
    {
        float span = 5 * Cell + 4 * Gap;
        Box("Felt", feltMat, 180f, 280f, 1000f, 1600f, 0.6f, 0.2f);
        Box("TrayRim", woodMat, BX + span / 2f, BY + span / 2f, span + 24f, span + 24f, 0.35f, 0.3f);
        Box("TrayBed", OiyoArcade.Lit(new Color(0.36f, 0.23f, 0.12f), 0.2f), BX + span / 2f, BY + span / 2f, span + 12f, span + 12f, 0.25f, 0.3f);
        Box("Preview", OiyoArcade.Lit(new Color(0.1f, 0.35f, 0.15f), 0.1f), 180f, 90f, span, 100f, 0.3f, 0.1f);
        die = new Transform[Cells];
        dieFace = new Renderer[Cells];
        pip = new Transform[Cells][];
        for (int i = 0; i < Cells; i++)
        {
            var c = CellCentre(i);
            Box("Square", OiyoArcade.Lit(new Color(0.12f, 0.43f, 0.19f), 0.05f), c.x, c.y, Cell, Cell, 0.1f, 0.1f);
            if (cells[i] == Rock)
            {
                Box("Stone", rockMat, c.x, c.y + 4f, Cell - 16f, Cell - 22f, -0.1f, OiyoField.U(24f));
                Box("StoneTop", OiyoArcade.Lit(new Color(0.68f, 0.71f, 0.74f), 0.15f), c.x, c.y - 10f, Cell - 30f, 12f, -0.15f, OiyoField.U(20f));
            }
            die[i] = MakeDie(Cell - 10f, out dieFace[i], out pip[i]);
            die[i].position = field.W(c.x, c.y, -OiyoField.U(Cell / 2f) + 0.05f);
        }
        previewDie = MakeDie(60f, out previewFace, out previewPip);
        previewDie.position = field.W(150f, 90f, -0.5f);
        previewDie2 = MakeDie(36f, out previewFace2, out previewPip2);
        previewDie2.position = field.W(240f, 98f, -0.3f);
        cursorObj = Box("Cursor", glowMat, 0f, 0f, Cell + 4f, 4f, -0.9f, 0.02f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("pip-merge", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        for (int k = 0; k < Cells; k++) flash[k] = Mathf.Max(0f, flash[k] - dt * 2.5f);
        popT = Mathf.Max(0f, popT - dt);
        Animate(dt);
    }

    void Press(int i)
    {
        if (state != GameState.Playing || over) return;
        var r = Place(i);
        if (r == null) { synth.Tone(196f, 0.05f, Wave.Square, 0.05f); return; }
        var ev = r.Value;
        foreach (int k in ev.cleared) flash[k] = 1f;
        if (ev.chain > 0)
        {
            var c = CellCentre(i);
            sparkle.Emit(field.W(c.x, c.y, -1f), ev.burst ? new Color(1f, 0.42f, 0.42f) : new Color(0.45f, 0.75f, 0.99f), ev.burst ? 30 : 10 + ev.chain * 4, ev.burst ? 4f : 2.5f, 0.08f, 0.6f);
            popT = 0.9f; popAt = i;
            popText = "+" + ev.gained + (ev.chain > 1 ? "  ×" + ev.chain : "");
            synth.Tone(ev.burst ? 988f : 523f + ev.chain * 120f, 0.12f, Wave.Triangle, 0.16f);
        }
        else synth.Tone(330f, 0.06f, Wave.Triangle, 0.1f);
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
                    // input is read once per frame: a tap on an empty square places the die
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        int c = Mathf.FloorToInt((f.x - BX + Gap / 2f) / (Cell + Gap)), r = Mathf.FloorToInt((f.y - BY + Gap / 2f) / (Cell + Gap));
                        if (c >= 0 && c < 5 && r >= 0 && r < 5) { cursor = r * 5 + c; Press(cursor); }
                    }
                    int r0 = cursor / 5, c0 = cursor % 5;
                    bool moved = true;
                    if (Input.GetKeyDown(KeyCode.UpArrow)) cursor = Mathf.Max(0, r0 - 1) * 5 + c0;
                    else if (Input.GetKeyDown(KeyCode.DownArrow)) cursor = Mathf.Min(4, r0 + 1) * 5 + c0;
                    else if (Input.GetKeyDown(KeyCode.LeftArrow)) cursor = r0 * 5 + Mathf.Max(0, c0 - 1);
                    else if (Input.GetKeyDown(KeyCode.RightArrow)) cursor = r0 * 5 + Mathf.Min(4, c0 + 1);
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, score, StageCount);
            sparkle.Emit(field.W(180f, 110f, -1.5f), new Color(1f, 0.85f, 0.25f), 40, 4f, 0.1f, 1f);
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

    void Animate(float dt)
    {
        if (root == null) return;
        field.Fit(56f, 10f, 0f, 30f, 520f);
        for (int i = 0; i < Cells; i++)
        {
            ShowFace(die[i], dieFace[i], pip[i], cells[i], Cell - 10f);
            var c = CellCentre(i);
            die[i].position = field.W(c.x, c.y, -OiyoField.U(Cell / 2f) + 0.05f - flash[i] * 0.3f);
        }
        ShowFace(previewDie, previewFace, previewPip, next < st.dice.Length && !over ? st.dice[next] : 0, 60f);
        ShowFace(previewDie2, previewFace2, previewPip2, next + 1 < st.dice.Length && !over ? st.dice[next + 1] : 0, 36f);
        previewDie.rotation = Quaternion.Euler(10f * Mathf.Sin(Time.time * 2f), 12f * Mathf.Sin(Time.time * 1.3f), 0f);
        cursorObj.gameObject.SetActive(keyed);
        var cc = CellCentre(cursor);
        cursorObj.position = field.W(cc.x, cc.y + Cell / 2f + 4f, -0.9f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the screen point of the
    // square the careful player (looking one die ahead, the stage's three-star yardstick) would use next.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog) return;
        if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        string nx = "null";
        if (state == GameState.Playing && !over)
        {
            int m = BestMove();
            if (m >= 0)
            {
                var c = CellCentre(m);
                var sp = cam.WorldToScreenPoint(field.W(c.x, c.y, 0f));
                nx = $"[{sp.x:F1},{Screen.height - sp.y:F1}]";
            }
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"placed\":{next},\"score\":{score},\"need\":{st.need},\"par\":{st.par},\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(1f, 0.83f, 0.23f, 0.97f);
    static readonly Color Dark = new Color(0.06f, 0.16f, 0.09f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Goal {0}", PipMergeStages.All[i].need);

    Vector2 Gui(Vector2 f, float z = -1f) => OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(f.x, f.y, z)));

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.95f, 0.75f), U("Pip Merge"),
                U("Put each die on an empty square. Three or more touching dice with the same face merge into one a pip higher, and chains double the points. Three sixes burst. Pass the goal before the dice run out."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        if (popT > 0f)
        {
            var p = Gui(CellCentre(popAt) + new Vector2(0f, -34f - (0.9f - popT) * 30f));
            OiyoArcade.Shadowed(new Rect(p.x - 70f, p.y - 16f, 140f, 32f), popText, 20, new Color(1f, 0.95f, 0.75f), TextAnchor.MiddleCenter);
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Score {0}/{1}", score, st.need) + "   " + F("Dice left {0}", st.dice.Length - next), 15, new Color(1f, 0.95f, 0.75f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap an empty square to place the die!"), 120f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{0} points · best chain {1}", score, best)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("Goal reached!") : U("Not enough points"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
