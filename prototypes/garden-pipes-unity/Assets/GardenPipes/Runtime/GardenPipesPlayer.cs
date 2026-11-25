using System.Collections;
using UnityEngine;

// Garden Pipes 3D: the web Garden Pipes (src/components/games/GardenPipes.tsx, src/lib/games/garden-pipes.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). Tap a tile to turn it a quarter turn clockwise; join every
// pipe to the tap so the flowers bloom. The 30 gardens are the web's own (GardenPipesStages.cs).
public class GardenPipesPlayer : MonoBehaviour
{
    const string Slug = "garden-pipes";
    const int StageCount = 30;
    const int N = 1, E = 2, S = 4, W = 8;
    const float Top = 110f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of garden-pipes.ts) ----------------
    GardenPipesStages.Level st;
    int cols, rows, stageIdx, starsWon, taps;
    int[] tiles;
    bool over, won;

    static int Turn(int m) => ((m << 1) | (m >> 3)) & 15;
    static int TurnBy(int m, int k) { for (int i = 0; i < ((k % 4) + 4) % 4; i++) m = Turn(m); return m; }
    static int TurnsTo(int from, int to) { for (int k = 0; k < 4; k++) if (TurnBy(from, k) == to) return k; return -1; }

    bool[] Wet()
    {
        var w = new bool[tiles.Length];
        var stack = new System.Collections.Generic.Stack<int>();
        stack.Push(st.source); w[st.source] = true;
        while (stack.Count > 0)
        {
            int i = stack.Pop(), x = i % cols, y = i / cols, m = tiles[i];
            void Go(bool ok, int j, int mine, int theirs) { if (ok && (m & mine) != 0 && (tiles[j] & theirs) != 0 && !w[j]) { w[j] = true; stack.Push(j); } }
            Go(y > 0, i - cols, N, S);
            Go(x < cols - 1, i + 1, E, W);
            Go(y < rows - 1, i + cols, S, N);
            Go(x > 0, i - 1, W, E);
        }
        return w;
    }

    bool Joined()
    {
        for (int i = 0; i < tiles.Length; i++)
        {
            int x = i % cols, y = i / cols, m = tiles[i];
            if ((m & N) != 0 && (y == 0 || (tiles[i - cols] & S) == 0)) return false;
            if ((m & E) != 0 && (x == cols - 1 || (tiles[i + 1] & W) == 0)) return false;
            if ((m & S) != 0 && (y == rows - 1 || (tiles[i + cols] & N) == 0)) return false;
            if ((m & W) != 0 && (x == 0 || (tiles[i - 1] & E) == 0)) return false;
        }
        foreach (bool b in Wet()) if (!b) return false;
        return true;
    }

    void Tap(int i)
    {
        if (over || i < 0 || i >= tiles.Length) return;
        tiles[i] = Turn(tiles[i]);
        taps++;
        if (Joined()) { over = true; won = true; }
        else if (taps >= st.limit) over = true;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (taps <= st.par) return 3;
        if (taps <= st.par + 4) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, cursorObj;
    Transform[] tileObj;
    Renderer[][] pipeParts;
    Transform[] flower;
    Renderer[] flowerRen;
    float[] spinFrom, spinT;
    Material dryMat, wetMat, budMat, bloomMat;
    Bursts sparkle;
    Synth synth;
    bool showStages, keyed;
    int cursor;
    float cell, ox, oy;

    Vector2 Centre(int i) => new Vector2(ox + (i % cols + 0.5f) * cell, oy + (i / cols + 0.5f) * cell);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.83f, 0.98f, 0.85f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.72f, 0.74f, 0.72f), 0.75f, 50f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        dryMat = OiyoArcade.Lit(new Color(0.68f, 0.71f, 0.74f), 0.6f, null, 0.5f);
        wetMat = OiyoArcade.LitGlow(new Color(0.2f, 0.6f, 0.94f), new Color(0.05f, 0.25f, 0.5f), 0.7f);
        budMat = OiyoArcade.Lit(new Color(0.41f, 0.86f, 0.49f), 0.3f);
        bloomMat = OiyoArcade.Lit(new Color(1f, 0.56f, 0.67f), 0.4f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = GardenPipesStages.All[stageIdx];
        cols = st.cols; rows = st.rows;
        tiles = new int[st.solved.Length];
        for (int k = 0; k < tiles.Length; k++) tiles[k] = TurnBy(st.solved[k], 4 - st.start[k]);
        taps = 0; over = false; won = false; starsWon = 0; cursor = st.source; keyed = false;
        spinFrom = new float[tiles.Length]; spinT = new float[tiles.Length];
        cell = Mathf.Floor(Mathf.Min(64f, 320f / cols, 400f / rows));
        ox = Mathf.Round((360f - cols * cell) / 2f);
        oy = Top + Mathf.Round((400f - rows * cell) / 2f);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Garden").transform;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Box(Transform parent, string name, Material m, float x, float y, float w, float h, float z, float d)
    {
        var o = OiyoArcade.Prim(PrimitiveType.Cube, name, m, parent).transform;
        o.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), d);
        o.position = field.W(x, y, z);
        return o;
    }

    void BuildScene()
    {
        Box(root, "Lawn", OiyoArcade.Lit(new Color(0.7f, 0.95f, 0.73f), 0.05f), 180f, 280f, 1200f, 1600f, 0.6f, 0.2f);
        Box(root, "Frame", OiyoArcade.Lit(new Color(0.54f, 0.35f, 0.17f), 0.3f), ox + cols * cell / 2f, oy + rows * cell / 2f, cols * cell + 12f, rows * cell + 12f, 0.25f, 0.4f);
        var grassA = OiyoArcade.Lit(new Color(0.66f, 0.89f, 0.29f), 0.1f);
        var grassB = OiyoArcade.Lit(new Color(0.58f, 0.85f, 0.18f), 0.1f);
        // the tap
        var sc = Centre(st.source);
        var metal = OiyoArcade.Lit(new Color(0.53f, 0.56f, 0.59f), 0.7f, null, 0.6f);
        Box(root, "TapPipe", metal, sc.x, oy - 18f, 12f, 30f, -0.1f, OiyoField.U(12f));
        Box(root, "TapTop", metal, sc.x, oy - 36f, 34f, 10f, -0.1f, OiyoField.U(14f));
        Box(root, "TapWheel", OiyoArcade.Lit(new Color(0.88f, 0.19f, 0.19f), 0.4f), sc.x, oy - 46f, 14f, 8f, -0.1f, OiyoField.U(14f));
        tileObj = new Transform[tiles.Length];
        pipeParts = new Renderer[tiles.Length][];
        flower = new Transform[tiles.Length];
        flowerRen = new Renderer[tiles.Length];
        float pw = Mathf.Max(6f, Mathf.Round(cell / 5f));
        for (int i = 0; i < tiles.Length; i++)
        {
            var c = Centre(i);
            Box(root, "Grass", ((i % cols) + (i / cols)) % 2 == 0 ? grassA : grassB, c.x, c.y, cell, cell, 0.05f, 0.1f);
            var t = new GameObject("Tile").transform;
            t.SetParent(root, false);
            t.position = field.W(c.x, c.y, -0.1f);
            tileObj[i] = t;
            // pipe parts built for the answer's openings, so turning the tile turns them with it
            int m = st.solved[i];
            var parts = new System.Collections.Generic.List<Renderer>();
            var hub = OiyoArcade.Prim(PrimitiveType.Cube, "Hub", dryMat, t).transform;
            hub.localScale = new Vector3(OiyoField.U(pw + 2f), OiyoField.U(pw + 2f), OiyoField.U(pw));
            parts.Add(hub.GetComponent<Renderer>());
            int[] bits = { N, E, S, W };
            for (int b = 0; b < 4; b++)
            {
                if ((m & bits[b]) == 0) continue;
                var arm = OiyoArcade.Prim(PrimitiveType.Cube, "Arm", dryMat, t).transform;
                bool vert = b % 2 == 0;
                arm.localScale = new Vector3(OiyoField.U(vert ? pw : cell / 2f), OiyoField.U(vert ? cell / 2f : pw), OiyoField.U(pw));
                float dx = b == 1 ? cell / 4f : b == 3 ? -cell / 4f : 0f, dy = b == 0 ? cell / 4f : b == 2 ? -cell / 4f : 0f;
                arm.localPosition = new Vector3(OiyoField.U(dx), OiyoField.U(dy), 0f);
                parts.Add(arm.GetComponent<Renderer>());
            }
            pipeParts[i] = parts.ToArray();
            int ends = 0; foreach (int b in bits) if ((m & b) != 0) ends++;
            if (ends == 1 && i != st.source)
            {
                var f = OiyoArcade.Prim(PrimitiveType.Sphere, "Flower", budMat, t).transform;
                f.localScale = Vector3.one * OiyoField.U(cell * 0.32f);
                f.localPosition = new Vector3(0f, 0f, -OiyoField.U(cell * 0.12f));
                flower[i] = f;
                flowerRen[i] = f.GetComponent<Renderer>();
            }
        }
        cursorObj = Box(root, "Cursor", OiyoArcade.Glow(new Color(0.13f, 0.15f, 0.16f)), 0f, 0f, cell - 4f, 4f, -0.6f, 0.02f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("garden-pipes", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        Animate(dt);
    }

    void Press(int i)
    {
        if (state != GameState.Playing || over) return;
        int before = 0; foreach (bool b in Wet()) if (b) before++;
        spinFrom[i] = 90f; spinT[i] = 1f;
        Tap(i);
        int after = 0; foreach (bool b in Wet()) if (b) after++;
        synth.Tone(after > before ? 659f : 440f, 0.06f, Wave.Triangle, 0.1f);
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
                    // input is read once per frame: a tap on a tile turns it
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (!field.ToField(b.pos, out Vector2 f)) continue;
                        int c = Mathf.FloorToInt((f.x - ox) / cell), r = Mathf.FloorToInt((f.y - oy) / cell);
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
            sparkle.Emit(field.W(180f, 300f, -1f), new Color(1f, 0.56f, 0.67f), 40, 4f, 0.1f, 1f);
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
        field.Fit(56f, 10f, 0f, oy - 60f, oy + rows * cell + 20f);
        var w = Wet();
        for (int i = 0; i < tiles.Length; i++)
        {
            spinT[i] = Mathf.Max(0f, spinT[i] - dt * 8f);
            // how many quarter turns clockwise the tile sits from the answer's layout
            int k = TurnsTo(st.solved[i], tiles[i]);
            float angle = -90f * k + spinFrom[i] * spinT[i];
            tileObj[i].rotation = Quaternion.Euler(0f, 0f, angle);
            foreach (var r in pipeParts[i]) r.sharedMaterial = w[i] ? wetMat : dryMat;
            if (flower[i] != null)
            {
                flowerRen[i].sharedMaterial = w[i] ? bloomMat : budMat;
                flower[i].localScale = Vector3.one * OiyoField.U(cell * (w[i] ? 0.42f : 0.28f));
            }
        }
        cursorObj.gameObject.SetActive(keyed);
        var cc = Centre(cursor);
        cursorObj.position = field.W(cc.x, cc.y + cell / 2f - 4f, -0.6f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the screen point of the
    // next tile the answer turns (reading order, as the web's planFor).
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog) return;
        if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        string nx = "null";
        if (state == GameState.Playing && !over)
        {
            for (int i = 0; i < tiles.Length; i++)
            {
                if (TurnsTo(tiles[i], st.solved[i]) <= 0) continue;
                var c = Centre(i);
                var sp = cam.WorldToScreenPoint(field.W(c.x, c.y, 0f));
                nx = $"[{sp.x:F1},{Screen.height - sp.y:F1}]";
                break;
            }
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"taps\":{taps},\"par\":{st.par},\"limit\":{st.limit},\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.25f, 0.75f, 0.34f, 0.97f);
    static readonly Color Dark = new Color(0.06f, 0.16f, 0.08f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} × {1} garden", GardenPipesStages.All[i].cols, GardenPipesStages.All[i].rows);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.9f, 1f, 0.9f), U("Garden Pipes"),
                U("Tap a tile to turn its pipe a quarter turn. Join every pipe up to the tap, with no open ends, and every flower blooms. Finish within the turns."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Turns {0}/{1}", taps, st.limit), 15, new Color(0.9f, 1f, 0.9f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Tap a tile to turn its pipe!"), 120f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = won ? $"<size=14>{F("Joined up in {0} turns", taps)}</size>" : "";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("Every flower is watered!") : U("Out of turns"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
