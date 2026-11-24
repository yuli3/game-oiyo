using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Scarf Knit 3D: the web Scarf Knit (src/components/games/ScarfKnit.tsx, src/lib/games/scarf-knit.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). The needle knits a row one stitch at a time at the
// stage's speed, left to right on even rows and right to left on odd ones, starting 1 s after the stage begins
// and 0.7 s after each turn. A stitch takes red while held, cream when not, at the moment the needle passes its
// middle. Knit the mark's worth of stitches true to the chart. The 30 charts are the web's own (ScarfKnitStages.cs).
public class ScarfKnitPlayer : MonoBehaviour
{
    const string Slug = "scarf-knit";
    const int StageCount = 30;
    const float Lead = 1f, Turn = 0.7f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of scarf-knit.ts) ----------------
    ScarfKnitStages.Level st;
    int stageIdx, row, rows, width, good, starsWon, knitted;
    float t;
    int[] made;
    bool over, won;

    int Chart(int r, int col) => st.chart[r * width + col];
    static bool Forward(int r) => r % 2 == 0;
    int ChartIndex(int r, int k) => Forward(r) ? k : width - 1 - k;
    float StitchTime(int k) => (k + 0.5f) / st.speed;

    void NewKnitting()
    {
        width = st.width;
        rows = st.chart.Length / width;
        made = new int[st.chart.Length];
        for (int i = 0; i < made.Length; i++) made[i] = -1;
        row = 0; t = -Lead; good = 0; knitted = 0; over = false; won = false;
    }

    readonly List<int> missNow = new List<int>();
    bool rowDoneNow;
    bool Step(bool red, float dt)
    {
        missNow.Clear(); rowDoneNow = false;
        if (over) return false;
        float before = t;
        t += dt;
        while (knitted < width)
        {
            float at = StitchTime(knitted);
            if (!(at > before - 1e-6f && at <= t)) break;
            int col = ChartIndex(row, knitted);
            int colour = red ? 1 : 0;
            made[row * width + col] = colour;
            if (colour == Chart(row, col)) good++; else missNow.Add(col);
            knitted++;
        }
        if (knitted >= width)
        {
            rowDoneNow = true;
            row++; knitted = 0; t = -Turn;
            if (row >= rows) { over = true; won = good >= st.need; return true; }
        }
        return false;
    }

    int StarsFor()
    {
        if (!won) return 0;
        int miss = st.chart.Length - good;
        if (miss == 0) return 3;
        if (miss <= Mathf.CeilToInt(st.chart.Length * 0.04f)) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, needle, ball;
    Renderer ballR;
    Renderer[] chartR, madeR, rowR;
    GameObject frame;
    Material redMat, creamMat, emptyMat, wallMat, needleMat, missMat;
    Bursts lint;
    Synth synth;
    bool showStages;

    float ChartCell => Mathf.Min(14f, Mathf.Floor(300f / width));
    float RowCell => Mathf.Min(18f, Mathf.Floor(340f / width));
    const float ChartY = 64f, RowY = 380f;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.36f, 0.24f, 0.18f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.62f, 0.56f, 0.52f), 0.7f, 30f, -20f);
        lint = new Bursts(transform, 0.8f);
        synth = new Synth(gameObject);
        var knitTex = OiyoArcade.Art("SK/knit", true);
        redMat = OiyoArcade.Lit(new Color(0.79f, 0.16f, 0.16f), 0.1f, knitTex);
        creamMat = OiyoArcade.Lit(new Color(0.97f, 0.95f, 0.88f), 0.1f, knitTex);
        emptyMat = OiyoArcade.Lit(new Color(0.45f, 0.33f, 0.26f), 0.1f);
        wallMat = OiyoArcade.Lit(new Color(0.36f, 0.24f, 0.18f), 0.1f);
        needleMat = OiyoArcade.Lit(new Color(0.75f, 0.77f, 0.8f), 0.9f, null, 0.6f);
        missMat = OiyoArcade.Lit(new Color(0.13f, 0.14f, 0.16f), 0.2f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = ScarfKnitStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Knitting").transform;
        NewKnitting();
        starsWon = 0;
        showStages = false;
        pressId = int.MinValue;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Tile(Material m, float x, float y, float w, float h, float z)
    {
        var q = OiyoArcade.Prim(PrimitiveType.Cube, "Stitch", m, root).transform;
        q.position = field.W(x, y, z);
        q.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), 0.15f);
        return q;
    }

    void BuildScene()
    {
        var wall = OiyoArcade.Prim(PrimitiveType.Cube, "Wall", wallMat, root);
        wall.transform.position = field.W(180f, 280f, 0.5f);
        wall.transform.localScale = new Vector3(OiyoField.U(460f), OiyoField.U(660f), 0.2f);
        float cc = ChartCell, cx = (360f - cc * width) / 2f;
        var board = Tile(creamMat, 180f, ChartY + cc * rows / 2f, cc * width + 16f, cc * rows + 16f, 0.25f);
        board.GetComponent<Renderer>().sharedMaterial = OiyoArcade.Lit(new Color(0.96f, 0.89f, 0.76f), 0.1f);
        chartR = new Renderer[st.chart.Length];
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < width; c++)
                chartR[r * width + c] = Tile(Chart(r, c) == 1 ? redMat : creamMat, cx + (c + 0.5f) * cc, ChartY + (r + 0.5f) * cc, cc - 2f, cc - 2f, 0f).GetComponent<Renderer>();
        float rc = RowCell, rx = (360f - rc * width) / 2f;
        rowR = new Renderer[width];
        madeR = new Renderer[width];
        for (int c = 0; c < width; c++)
        {
            rowR[c] = Tile(creamMat, rx + (c + 0.5f) * rc, RowY - rc / 2f - 8f, rc - 2f, rc - 2f, 0f).GetComponent<Renderer>();
            madeR[c] = Tile(emptyMat, rx + (c + 0.5f) * rc, RowY + rc * 0.7f, rc - 2f, rc * 1.4f, 0f).GetComponent<Renderer>();
        }
        frame = OiyoArcade.Prim(PrimitiveType.Cube, "Row frame", OiyoArcade.Lit(new Color(0.98f, 0.69f, 0.02f), 0.3f), root);
        needle = OiyoArcade.Prim(PrimitiveType.Cylinder, "Needle", needleMat, root).transform;
        needle.localScale = new Vector3(OiyoField.U(5f), OiyoField.U(30f), OiyoField.U(5f));
        ball = OiyoArcade.Prim(PrimitiveType.Sphere, "Yarn", creamMat, root).transform;
        ball.position = field.W(180f, 510f, -0.4f);
        ball.localScale = Vector3.one * OiyoField.U(46f);
        ballR = ball.GetComponent<Renderer>();
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("scarf-knit", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        bool red = ReadInput();
        if (state == GameState.Playing)
        {
            int rowBefore = row;
            bool end = Step(red, dt);
            float rc = RowCell, rx = (360f - rc * width) / 2f;
            foreach (int col in missNow) lint.Emit(field.W(rx + (col + 0.5f) * rc, RowY + rc * 0.7f, -0.3f), new Color(0.5f, 0.5f, 0.5f), 4, 1f, 0.06f, 0.4f);
            if (rowDoneNow && !end) synth.Tone(520f, 0.08f, Wave.Triangle, 0.12f, 700f, 10f);
            if (rowBefore != row && !end) Toast(F("Row {0}/{1}", row + 1, rows), new Color(1f, 0.95f, 0.85f));
            if (end) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
        lastRed = red;
    }

    bool lastRed;
    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.8f; msgC = c; }

    int pressId = int.MinValue;

    // returns whether the red yarn is held this frame
    bool ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; pressId = int.MinValue; return false; }
                    // the finger is read once per frame: held down is the red yarn
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos)) continue;
                        if (state == GameState.Ready) state = GameState.Playing;
                        pressId = b.id;
                    }
                    foreach (var e in OiyoArcade.Ended()) if (e.id == pressId) pressId = int.MinValue;
                    bool held = false;
                    foreach (var hp in OiyoArcade.Held()) if (hp.id == pressId) held = true;
                    if (!held) pressId = int.MinValue;
                    bool key = Input.GetKey(KeyCode.Space);
                    if (key && state == GameState.Ready) state = GameState.Playing;
                    return held || key;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return false;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm && ResultLive) LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                return false;
            case GameState.Menu:
                if (!showStages && confirm) LoadStage(stageIdx);
                return false;
        }
        return false;
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, good, StageCount);
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
        field.Fit(70f, 10f, 0f);
        float cc = ChartCell, cx = (360f - cc * width) / 2f;
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < width; c++)
            {
                int m = made[r * width + c];
                var tr = chartR[r * width + c].transform;
                // knitted stitches stand out of the chart; wrong ones are dark
                tr.localScale = new Vector3(OiyoField.U(cc - 2f), OiyoField.U(cc - 2f), m >= 0 ? 0.35f : 0.15f);
                chartR[r * width + c].sharedMaterial = m < 0 ? (Chart(r, c) == 1 ? redMat : creamMat) : m != Chart(r, c) ? missMat : m == 1 ? redMat : creamMat;
            }
        int shown = Mathf.Min(row, rows - 1);
        frame.SetActive(!over);
        frame.transform.position = field.W(180f, ChartY + (shown + 0.5f) * cc, 0.1f);
        frame.transform.localScale = new Vector3(OiyoField.U(cc * width + 8f), OiyoField.U(cc + 4f), 0.1f);
        float rc = RowCell, rx = (360f - rc * width) / 2f;
        for (int c = 0; c < width; c++)
        {
            rowR[c].sharedMaterial = Chart(shown, c) == 1 ? redMat : creamMat;
            int m = over ? -1 : made[shown * width + c];
            madeR[c].sharedMaterial = m < 0 ? emptyMat : m != Chart(shown, c) ? missMat : m == 1 ? redMat : creamMat;
        }
        float pos = Mathf.Clamp(t * st.speed, 0f, width);
        float nx = Forward(shown) ? rx + pos * rc : rx + (width - pos) * rc;
        needle.gameObject.SetActive(!over);
        needle.position = field.W(nx, RowY + rc * 0.7f, -0.5f);
        needle.rotation = Quaternion.Euler(0f, 0f, Forward(shown) ? -20f : 20f);
        bool red = lastRed;
        ballR.sharedMaterial = red ? redMat : creamMat;
        ball.Rotate(Vector3.up, dt * 40f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the row, its direction,
    // the time in the row (negative while turning), the speed, the row's chart left to right, and the counts.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.005f;
        var rc = new System.Text.StringBuilder();
        int shown = Mathf.Min(row, rows - 1);
        for (int c = 0; c < width; c++) { if (c > 0) rc.Append(','); rc.Append(Chart(shown, c)); }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"row\":{row},\"rows\":{rows},\"fwd\":{(Forward(shown) ? "true" : "false")},\"t\":{t:F4},\"speed\":{st.speed:F4},\"chart\":[{rc}],\"good\":{good},\"need\":{st.need},\"total\":{st.chart.Length},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.79f, 0.16f, 0.16f, 0.97f);
    static readonly Color Dark = new Color(0.2f, 0.13f, 0.09f, 0.88f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Goal {0}", ScarfKnitStages.All[i].need);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.9f, 0.85f), U("Scarf Knit"),
                U("Hold for red yarn, let go for cream. Change yarn exactly where Grandma's chart changes colour."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, h - 72f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, h - 68f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Row {0}/{1}", Mathf.Min(row + 1, rows), rows), 15, new Color(1f, 0.9f, 0.85f));
        OiyoArcade.Text(new Rect(20f, h - 44f, w - 90f, 24f), F("True stitches {0}/{1}", good, st.need) + "   " + (lastRed ? U("Red") : U("Cream")), 15, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, h - 66f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; pressId = int.MinValue; }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, h * 0.52f, w - 16f, 30f), msg, 18, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Change yarn where the chart changes."), 220f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("True stitches {0}/{1}", good, st.chart.Length)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("The scarf is done — perfect for Seollal!") : U("Too many stitches off the chart"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
