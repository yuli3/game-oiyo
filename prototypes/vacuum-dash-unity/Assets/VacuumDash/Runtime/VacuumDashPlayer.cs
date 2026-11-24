using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Vacuum Dash 3D: the web Vacuum Dash (src/components/games/VacuumDash.tsx, src/lib/games/vacuum-dash.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). Swipe (or press an arrow) and the robot vacuum zooms that way
// until it bumps into something, cleaning every square it passes. Clean the floor within the moves.
// The 30 rooms are the web's own (VacuumDashStages.cs).
public class VacuumDashPlayer : MonoBehaviour
{
    const string Slug = "vacuum-dash";
    const int StageCount = 30;
    const float Top = 70f;
    static readonly int[] DX = { 0, 1, 0, -1 };
    static readonly int[] DY = { -1, 0, 1, 0 };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of vacuum-dash.ts) ----------------
    VacuumDashStages.Level st;
    int cols, rows, stageIdx, starsWon, at, left, moves;
    bool[] clean;
    bool over, won;

    List<int> SlidePath(int from, int d)
    {
        var o = new List<int>();
        int x = from % cols, y = from / cols;
        for (;;)
        {
            int nx = x + DX[d], ny = y + DY[d];
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || st.floor[ny * cols + nx] == 0) break;
            x = nx; y = ny;
            o.Add(y * cols + x);
        }
        return o;
    }

    List<int> Slide(int d)
    {
        if (over) return new List<int>();
        var path = SlidePath(at, d);
        if (path.Count == 0) return path;
        moves++;
        foreach (int k in path) if (!clean[k]) { clean[k] = true; left--; }
        at = path[path.Count - 1];
        if (left == 0) { over = true; won = true; }
        else if (moves >= st.limit) over = true;
        return path;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (moves <= st.par) return 3;
        if (moves <= st.par + 3) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, robot, robotLight;
    Transform[] dust;
    Material boardA, boardB, rugMat;
    Material[] furnMat;
    Material dustMat;
    Bursts sparkle, puff;
    Synth synth;
    bool showStages;
    float cell, ox, oy;
    Vector2 robotPos; // in squares
    float bump;
    readonly Queue<int> queue = new Queue<int>();
    readonly Dictionary<int, Vector2> downAt = new Dictionary<int, Vector2>();

    Vector2 SquareCentre(float cx, float cy) => new Vector2(ox + (cx + 0.5f) * cell, oy + (cy + 0.5f) * cell);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.91f, 0.93f, 0.94f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.7f, 0.7f, 0.72f), 0.7f, 50f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        puff = new Bursts(transform, 0.3f);
        synth = new Synth(gameObject);
        boardA = OiyoArcade.Lit(new Color(0.85f, 0.63f, 0.4f), 0.35f);
        boardB = OiyoArcade.Lit(new Color(0.81f, 0.58f, 0.34f), 0.35f);
        rugMat = OiyoArcade.Lit(new Color(0.95f, 0.89f, 0.83f), 0.1f);
        furnMat = new Material[4];
        for (int k = 0; k < 4; k++) furnMat[k] = OiyoField.Sprite("VD/furniture" + k);
        dustMat = OiyoField.Sprite("VD/dust");
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = VacuumDashStages.All[stageIdx];
        cols = st.cols; rows = st.rows;
        clean = new bool[cols * rows];
        for (int k = 0; k < clean.Length; k++) clean[k] = st.floor[k] == 0;
        clean[st.start] = true;
        left = 0; foreach (bool c in clean) if (!c) left++;
        at = st.start; moves = 0; over = false; won = false; starsWon = 0; bump = 0f;
        queue.Clear(); downAt.Clear();
        robotPos = new Vector2(at % cols, at / cols);
        cell = Mathf.Floor(Mathf.Min(44f, 336f / cols, 470f / rows));
        ox = Mathf.Round((360f - cols * cell) / 2f);
        oy = Top + Mathf.Round((470f - rows * cell) / 2f);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Room").transform;
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
        Box("Walls", OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.2f), ox + cols * cell / 2f, oy + rows * cell / 2f, cols * cell + 12f, rows * cell + 12f, 0.3f, 0.2f);
        dust = new Transform[cols * rows];
        for (int i = 0; i < cols * rows; i++)
        {
            var c = SquareCentre(i % cols, i / cols);
            if (st.floor[i] == 0)
            {
                Box("Rug", rugMat, c.x, c.y, cell, cell, 0.1f, 0.1f);
                var f = OiyoField.Quad("Furniture", furnMat[(i * 7 + stageIdx) % 4], root, cell * 0.95f, cell * 0.95f);
                f.position = field.W(c.x, c.y, -0.3f);
                // a little height under the furniture, so it reads as standing in the room
                Box("Base", OiyoArcade.Lit(new Color(0.55f, 0.42f, 0.3f), 0.2f), c.x, c.y + cell * 0.38f, cell * 0.8f, cell * 0.12f, -0.12f, OiyoField.U(cell * 0.4f));
                continue;
            }
            Box("Board", ((i / cols) + (i % cols)) % 2 == 1 ? boardA : boardB, c.x, c.y, cell, cell, 0.08f, 0.12f);
            var d = OiyoField.Quad("Dust", dustMat, root, cell * 0.8f, cell * 0.8f);
            d.position = field.W(c.x, c.y, -0.05f);
            dust[i] = d;
        }
        robot = new GameObject("Robot").transform;
        robot.SetParent(root, false);
        var body = OiyoArcade.Prim(PrimitiveType.Cylinder, "Body", OiyoArcade.Lit(new Color(0.53f, 0.56f, 0.59f), 0.6f, null, 0.3f), robot).transform;
        body.localScale = new Vector3(OiyoField.U(cell * 0.8f), OiyoField.U(cell * 0.16f), OiyoField.U(cell * 0.8f));
        body.localRotation = Quaternion.Euler(-90f, 0f, 0f);
        var rim = OiyoArcade.Prim(PrimitiveType.Cylinder, "Rim", OiyoArcade.Lit(new Color(0.2f, 0.23f, 0.25f), 0.4f), robot).transform;
        rim.localScale = new Vector3(OiyoField.U(cell * 0.86f), OiyoField.U(cell * 0.1f), OiyoField.U(cell * 0.86f));
        rim.localRotation = Quaternion.Euler(-90f, 0f, 0f);
        rim.localPosition = new Vector3(0f, 0f, OiyoField.U(cell * 0.06f));
        var top = OiyoArcade.Prim(PrimitiveType.Cylinder, "Top", OiyoArcade.Lit(new Color(0.95f, 0.95f, 0.96f), 0.7f), robot).transform;
        top.localScale = new Vector3(OiyoField.U(cell * 0.5f), OiyoField.U(cell * 0.04f), OiyoField.U(cell * 0.5f));
        top.localRotation = Quaternion.Euler(-90f, 0f, 0f);
        top.localPosition = new Vector3(0f, 0f, -OiyoField.U(cell * 0.17f));
        robotLight = OiyoArcade.Prim(PrimitiveType.Sphere, "Light", OiyoArcade.Glow(new Color(0.3f, 0.67f, 0.97f)), robot).transform;
        robotLight.localScale = Vector3.one * OiyoField.U(cell * 0.14f);
        robotLight.localPosition = new Vector3(0f, OiyoField.U(cell * 0.12f), -OiyoField.U(cell * 0.2f));
    }

    // ---------------- Loop ----------------
    bool Moving => Vector2.Distance(robotPos, new Vector2(at % cols, at / cols)) > 0.01f;

    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("vacuum-dash", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && !Moving && queue.Count > 0 && !over) Go(queue.Dequeue());
        var target = new Vector2(at % cols, at / cols);
        float dist = Vector2.Distance(robotPos, target);
        if (dist > 0.001f)
        {
            robotPos = Vector2.MoveTowards(robotPos, target, dt * 16f);
            if (Random.value < 0.5f) { var c = SquareCentre(robotPos.x, robotPos.y); puff.Emit(field.W(c.x, c.y, -0.2f), new Color(0.8f, 0.72f, 0.6f), 1, 0.8f, 0.05f, 0.3f); }
            if (!Moving && over) End();
        }
        bump = Mathf.Max(0f, bump - dt);
        Animate(dt);
    }

    void Go(int d)
    {
        var path = Slide(d);
        if (path.Count == 0) { bump = 0.2f; synth.Tone(160f, 0.06f, Wave.Square, 0.06f); return; }
        synth.Tone(392f + path.Count * 30f, 0.1f, Wave.Triangle, 0.12f, 0f, 2f);
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
                    // input is read once per frame: a swipe (press, move, let go) sends the robot that way
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        downAt[b.id] = b.pos;
                    }
                    foreach (var e in OiyoArcade.Ended())
                    {
                        if (!downAt.TryGetValue(e.id, out Vector2 s)) continue;
                        downAt.Remove(e.id);
                        Vector2 d = e.pos - s; // screen y points up
                        if (d.magnitude < 18f * OiyoArcade.ComputeScale()) continue;
                        Queue(Mathf.Abs(d.x) > Mathf.Abs(d.y) ? (d.x > 0 ? 1 : 3) : (d.y > 0 ? 0 : 2));
                    }
                    int k = -1;
                    if (Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.W)) k = 0;
                    else if (Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.D)) k = 1;
                    else if (Input.GetKeyDown(KeyCode.DownArrow) || Input.GetKeyDown(KeyCode.S)) k = 2;
                    else if (Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.A)) k = 3;
                    if (k >= 0) { if (state == GameState.Ready) state = GameState.Playing; Queue(k); }
                    if ((Input.GetKeyDown(KeyCode.Space) || confirm) && state == GameState.Ready) state = GameState.Playing;
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

    void Queue(int d)
    {
        if (over || queue.Count >= 3) return;
        queue.Enqueue(d);
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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, (st.limit - moves) * 10), StageCount);
            sparkle.Emit(field.W(180f, 200f, -1f), new Color(0.45f, 0.75f, 0.99f), 40, 4f, 0.1f, 1f);
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
        field.Fit(56f, 10f, 0f, oy - 10f, oy + rows * cell + 10f);
        for (int i = 0; i < dust.Length; i++) if (dust[i] != null) dust[i].gameObject.SetActive(!clean[i]);
        var c = SquareCentre(robotPos.x, robotPos.y);
        float shake = bump > 0f ? Mathf.Sin(bump * 80f) * 3f : 0f;
        robot.position = field.W(c.x + shake, c.y, -0.25f);
        robot.rotation = Quaternion.Euler(0f, 0f, Time.time * (Moving ? 360f : 40f));
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the swipe (screen px from
    // the top-left, start and end) for the stage's own plan, once the robot has stopped.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog) return;
        if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        string nx = "null";
        if (state == GameState.Playing && !over && !Moving && queue.Count == 0 && moves < st.plan.Length)
        {
            int d = st.plan[moves];
            var a = cam.WorldToScreenPoint(field.W(180f, 300f, 0f));
            var b = cam.WorldToScreenPoint(field.W(180f + DX[d] * 90f, 300f + DY[d] * 90f, 0f));
            nx = $"[{a.x:F1},{Screen.height - a.y:F1},{b.x:F1},{Screen.height - b.y:F1}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"moves\":{moves},\"left\":{left},\"par\":{st.par},\"limit\":{st.limit},\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.3f, 0.67f, 0.97f, 0.97f);
    static readonly Color Dark = new Color(0.12f, 0.14f, 0.18f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} × {1} room", VacuumDashStages.All[i].cols, VacuumDashStages.All[i].rows);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.9f, 0.96f, 1f), U("Vacuum Dash"),
                U("Swipe and the robot vacuum zooms that way until it bumps into something, cleaning every square it passes. Clean the whole floor within the moves."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Moves {0}/{1}", moves, st.limit) + "   " + F("Dust left {0}", left), 15, new Color(0.9f, 0.96f, 1f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Swipe to send the vacuum off!"), 120f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = won ? $"<size=14>{F("Clean in {0} moves", moves)}</size>" : "";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("All clean!") : U("Out of moves"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
