using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Roller Claim 3D: the web Roller Claim (src/components/games/RollerClaim.tsx, src/lib/games/roller-claim.ts) rebuilt
// in Unity on the web's own 360 × 560 px field (OiyoField). A paint roller on a 24 × 30 playground: outside your
// painted patch it leaves a wet stripe; roll back home and the stripe and all it fences in turn your colour. A ball on
// the wet stripe wipes it and sends the roller home; running over your own stripe costs a life. The 30 playgrounds
// are the web's own (RollerClaimStages.cs).
public class RollerClaimPlayer : MonoBehaviour
{
    const string Slug = "roller-claim";
    const int StageCount = 30;
    const int Cols = 24, Rows = 30, Lives = 3;
    const float Cell = 15f, Top = 100f, StepT = 0.12f;
    static readonly int[] DX = { 0, 1, 0, -1 };
    static readonly int[] DY = { -1, 0, 1, 0 };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of roller-claim.ts) ----------------
    RollerClaimStages.Level st;
    int stageIdx, starsWon, x, y, dir, want, lives, painted;
    byte[] owned, trail;
    readonly List<int> trailCells = new List<int>();
    int[] balls; // x, y, dx, dy
    float t, moveT, ballT;
    bool over, won;

    static int Idx(int cx, int cy) => cy * Cols + cx;
    static bool Inside(int cx, int cy) => cx >= 0 && cy >= 0 && cx < Cols && cy < Rows;
    float Share => painted / (float)(Cols * Rows);

    void Steer(int d)
    {
        if (over || d < 0 || d > 3) return;
        if (trailCells.Count > 0 && dir >= 0 && (d + 2) % 4 == dir) return;
        want = d;
    }

    int Claim()
    {
        foreach (int c in trailCells) { owned[c] = 1; trail[c] = 0; }
        trailCells.Clear();
        var seen = new byte[Cols * Rows];
        var stack = new Stack<int>();
        for (int cx = 0; cx < Cols; cx++) { if (owned[Idx(cx, 0)] == 0) stack.Push(Idx(cx, 0)); if (owned[Idx(cx, Rows - 1)] == 0) stack.Push(Idx(cx, Rows - 1)); }
        for (int cy = 0; cy < Rows; cy++) { if (owned[Idx(0, cy)] == 0) stack.Push(Idx(0, cy)); if (owned[Idx(Cols - 1, cy)] == 0) stack.Push(Idx(Cols - 1, cy)); }
        while (stack.Count > 0)
        {
            int c = stack.Pop();
            if (seen[c] == 1 || owned[c] == 1) continue;
            seen[c] = 1;
            int cx = c % Cols, cy = c / Cols;
            for (int d = 0; d < 4; d++) { int nx = cx + DX[d], ny = cy + DY[d]; if (Inside(nx, ny)) stack.Push(Idx(nx, ny)); }
        }
        int gained = 0;
        for (int c = 0; c < Cols * Rows; c++) if (owned[c] == 0 && seen[c] == 0) { owned[c] = 1; gained++; }
        int n = 0;
        for (int c = 0; c < Cols * Rows; c++) n += owned[c];
        painted = n;
        return gained;
    }

    void Wipe()
    {
        foreach (int c in trailCells) trail[c] = 0;
        trailCells.Clear();
        int sx = st.start[0], sy = st.start[1];
        x = sx; y = sy;
        if (owned[Idx(sx, sy)] == 0)
        {
            int best = -1, bd = int.MaxValue;
            for (int c = 0; c < Cols * Rows; c++)
                if (owned[c] == 1) { int d = Mathf.Abs(c % Cols - sx) + Mathf.Abs(c / Cols - sy); if (d < bd) { bd = d; best = c; } }
            if (best >= 0) { x = best % Cols; y = best / Cols; }
        }
        dir = -1; want = -1;
    }

    void Lose()
    {
        Wipe();
        lives--;
        if (lives <= 0) over = true;
    }

    // returns: 1 claimed, 2 ball hit, 3 life lost
    int Step(float dt)
    {
        int ev = 0;
        if (over) return 0;
        t += dt;
        ballT += dt;
        while (ballT >= st.ballStep)
        {
            ballT -= st.ballStep;
            for (int k = 0; k < balls.Length / 4; k++)
            {
                int bx = balls[k * 4], by = balls[k * 4 + 1];
                if (!Inside(bx + balls[k * 4 + 2], by)) balls[k * 4 + 2] = -balls[k * 4 + 2];
                if (!Inside(bx, by + balls[k * 4 + 3])) balls[k * 4 + 3] = -balls[k * 4 + 3];
                balls[k * 4] += balls[k * 4 + 2];
                balls[k * 4 + 1] += balls[k * 4 + 3];
                if (trail[Idx(balls[k * 4], balls[k * 4 + 1])] == 1) { ev = 2; Wipe(); }
            }
        }
        moveT += dt;
        while (moveT >= StepT)
        {
            moveT -= StepT;
            if (want >= 0) dir = want;
            if (dir < 0) continue;
            int nx = x + DX[dir], ny = y + DY[dir];
            if (!Inside(nx, ny)) continue;
            int c = Idx(nx, ny);
            if (trail[c] == 1) { ev = 3; Lose(); if (over) return ev; continue; }
            x = nx; y = ny;
            if (owned[c] == 1) { if (trailCells.Count > 0 && Claim() >= 0) ev = 1; }
            else { trail[c] = 1; trailCells.Add(c); }
        }
        if (Share >= st.goal) { over = true; won = true; }
        else if (t >= st.limit) over = true;
        return ev;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (t <= st.par && lives == Lives) return 3;
        if (t <= (st.par + st.limit) / 2f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, roller;
    Transform[] ballObj;
    Texture2D groundTex;
    Color32[] px;
    Material groundMat, rollerMat, ballMat;
    Bursts sparkle;
    Synth synth;
    bool showStages;
    static readonly Color32 Mine = new Color32(230, 73, 128, 255), Wet = new Color32(250, 162, 193, 255), A = new Color32(206, 212, 218, 255), B = new Color32(196, 202, 208, 255);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.2f, 0.23f, 0.25f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.75f, 0.75f, 0.75f), 0.6f, 50f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        groundTex = new Texture2D(Cols, Rows, TextureFormat.RGBA32, false) { filterMode = FilterMode.Point, wrapMode = TextureWrapMode.Clamp };
        px = new Color32[Cols * Rows];
        groundMat = OiyoArcade.Textured(groundTex);
        rollerMat = OiyoArcade.Lit(new Color(1f, 0.83f, 0.23f), 0.5f);
        ballMat = OiyoArcade.Lit(new Color(0.1f, 0.44f, 0.76f), 0.6f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = RollerClaimStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Playground").transform;
        owned = new byte[Cols * Rows];
        trail = new byte[Cols * Rows];
        trailCells.Clear();
        int sx = st.start[0], sy = st.start[1];
        for (int cy = sy - 1; cy <= sy + 1; cy++) for (int cx = sx - 1; cx <= sx + 1; cx++) owned[Idx(cx, cy)] = 1;
        x = sx; y = sy; dir = -1; want = -1; lives = Lives; painted = 9;
        balls = (int[])st.balls.Clone();
        t = 0f; moveT = 0f; ballT = 0f; over = false; won = false; starsWon = 0;
        plan = null; goHome = false; lastCell = -1;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        var q = OiyoField.Quad("Ground", groundMat, root, Cols * Cell, Rows * Cell);
        q.position = field.W(Cols * Cell / 2f, Top + Rows * Cell / 2f, 0.1f);
        roller = OiyoArcade.Prim(PrimitiveType.Cube, "Roller", rollerMat, root).transform;
        roller.localScale = new Vector3(OiyoField.U(Cell + 2f), OiyoField.U(Cell + 2f), 0.4f);
        ballObj = new Transform[balls.Length / 4];
        for (int k = 0; k < ballObj.Length; k++)
        {
            ballObj[k] = OiyoArcade.Prim(PrimitiveType.Sphere, "Ball", ballMat, root).transform;
            ballObj[k].localScale = Vector3.one * OiyoField.U(Cell * 0.9f);
        }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("roller-claim", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && !over)
        {
            int ev = Step(dt);
            if (ev == 1) { sparkle.Emit(field.W((x + 0.5f) * Cell, Top + (y + 0.5f) * Cell, -0.5f), new Color(0.9f, 0.29f, 0.5f), 14, 3f, 0.08f, 0.5f); synth.Tone(784f, 0.15f, Wave.Triangle, 0.14f, 1175f, 8f); }
            if (ev == 2) synth.Tone(330f, 0.1f, Wave.Square, 0.1f, 220f, 10f);
            if (ev == 3) synth.Tone(160f, 0.2f, Wave.Square, 0.14f, 90f, 8f);
            if (over) End();
        }
        Animate(dt);
    }

    Vector2 dragFrom; bool dragging;

    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; return; }
                    // input is read once per frame: a tap turns toward its side of the roller, a swipe turns its way
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        dragFrom = f; dragging = true;
                        Steer(Toward(f.x - (x + 0.5f) * Cell, f.y - (Top + (y + 0.5f) * Cell)));
                    }
                    var held = OiyoArcade.Held();
                    if (held.Count == 0) dragging = false;
                    else if (dragging && field.ToField(held[0].pos, out Vector2 g) && Vector2.Distance(g, dragFrom) > 18f)
                    {
                        Steer(Toward(g.x - dragFrom.x, g.y - dragFrom.y));
                        dragFrom = g;
                    }
                    int k = Input.GetKeyDown(KeyCode.UpArrow) ? 0 : Input.GetKeyDown(KeyCode.RightArrow) ? 1 : Input.GetKeyDown(KeyCode.DownArrow) ? 2 : Input.GetKeyDown(KeyCode.LeftArrow) ? 3 : -1;
                    if (k >= 0) { if (state == GameState.Ready) state = GameState.Playing; Steer(k); }
                    if (state == GameState.Ready && (confirm || Input.GetKeyDown(KeyCode.Space))) state = GameState.Playing;
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

    static int Toward(float dx, float dy) => Mathf.Abs(dx) > Mathf.Abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);

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
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, Mathf.RoundToInt((st.limit - t) * 10f)), StageCount);
            sparkle.Emit(field.W(180f, 300f, -1f), new Color(1f, 0.85f, 0.25f), 40, 5f, 0.1f, 1f);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
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
        field.Fit(80f, 10f, 0f, Top, Top + Rows * Cell);
        // texture rows run bottom-up
        for (int cy = 0; cy < Rows; cy++)
            for (int cx = 0; cx < Cols; cx++)
            {
                int c = Idx(cx, cy);
                px[(Rows - 1 - cy) * Cols + cx] = owned[c] == 1 ? Mine : trail[c] == 1 ? Wet : ((cx + cy) % 2 == 1 ? A : B);
            }
        groundTex.SetPixels32(px);
        groundTex.Apply(false);
        roller.position = field.W((x + 0.5f) * Cell, Top + (y + 0.5f) * Cell, -0.25f);
        for (int k = 0; k < ballObj.Length; k++) ballObj[k].position = field.W((balls[k * 4] + 0.5f) * Cell, Top + (balls[k * 4 + 1] + 0.5f) * Cell, -0.15f);
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: painted share, lives, and the
    // screen point (px from the top-left) to tap to turn the roller the way a careful painter would: small boxes out of
    // the patch (three out, three across, back), heading home when a ball comes within three cells.
    bool testLog; float testT;
    int[] plan; // d1, d2, depth, width, leg, walked
    bool goHome;
    int lastCell;
    Vector2 Scr(float fx, float fy) { var sp = cam.WorldToScreenPoint(field.W(fx, fy, 0f)); return new Vector2(sp.x, Screen.height - sp.y); }
    int Homeward()
    {
        var prev = new int[Cols * Rows];
        for (int i = 0; i < prev.Length; i++) prev[i] = -2;
        int start = Idx(x, y);
        prev[start] = -1;
        var q = new List<int> { start };
        for (int h = 0; h < q.Count; h++)
        {
            int c = q[h];
            if (owned[c] == 1 && c != start)
            {
                int cur = c;
                while (prev[cur] != start) cur = prev[cur];
                for (int d = 0; d < 4; d++) if (cur % Cols == x + DX[d] && cur / Cols == y + DY[d]) return d;
                return -1;
            }
            int cx = c % Cols, cy = c / Cols;
            for (int d = 0; d < 4; d++)
            {
                int nx = cx + DX[d], ny = cy + DY[d];
                if (!Inside(nx, ny)) continue;
                int n = Idx(nx, ny);
                if (prev[n] != -2 || trail[n] == 1) continue;
                if (c == start && trailCells.Count > 0 && dir >= 0 && (d + 2) % 4 == dir) continue;
                prev[n] = c;
                q.Add(n);
            }
        }
        return -1;
    }
    int Room(int d)
    {
        int cx = x, cy = y;
        while (Inside(cx + DX[d], cy + DY[d]) && owned[Idx(cx + DX[d], cy + DY[d])] == 1) { cx += DX[d]; cy += DY[d]; }
        int k = 0;
        while (Inside(cx + DX[d], cy + DY[d]) && owned[Idx(cx + DX[d], cy + DY[d])] == 0 && k < 12) { cx += DX[d]; cy += DY[d]; k++; }
        return k;
    }
    int Wanted()
    {
        bool outside = trailCells.Count > 0;
        if (!outside)
        {
            goHome = false;
            if (plan != null && plan[4] == 0 && !Inside(x + DX[plan[0]], y + DY[plan[0]])) plan = null;
            if (plan == null || plan[4] > 0)
            {
                int d1 = 0, best = -1;
                for (int d = 0; d < 4; d++) { int r = Room(d); if (r > best) { best = r; d1 = d; } }
                if (best <= 0) for (int d = 0; d < 4; d++) if (Inside(x + DX[d], y + DY[d])) { d1 = d; break; }
                plan = new[] { d1, (d1 + 1) % 4, Mathf.Max(1, Mathf.Min(Mathf.Max(best, 1), 3)), 3, 0, 0 };
            }
            return plan[0];
        }
        bool danger = false;
        for (int k = 0; k < balls.Length / 4 && !danger; k++)
        {
            if (Mathf.Abs(balls[k * 4] - x) + Mathf.Abs(balls[k * 4 + 1] - y) <= 3) danger = true;
            foreach (int c in trailCells) if (Mathf.Abs(c % Cols - balls[k * 4]) + Mathf.Abs(c / Cols - balls[k * 4 + 1]) <= 3) { danger = true; break; }
        }
        if (danger || plan == null) goHome = true;
        if (!goHome)
        {
            plan[5]++;
            if (plan[4] == 0 && trailCells.Count >= plan[2]) { plan[4] = 1; plan[5] = 0; }
            else if (plan[4] == 1 && plan[5] >= plan[3]) plan[4] = 2;
            int d = plan[4] == 0 ? plan[0] : plan[4] == 1 ? plan[1] : (plan[0] + 2) % 4;
            if (!Inside(x + DX[d], y + DY[d]) || trail[Idx(x + DX[d], y + DY[d])] == 1) goHome = true;
            else return d;
        }
        return Homeward();
    }
    int botDir = -1;
    void TestTick(float dt)
    {
        if (!testLog) return;
        int cell = Idx(x, y);
        if (state == GameState.Playing && !over && cell != lastCell) { lastCell = cell; botDir = Wanted(); }
        if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        string next = "null";
        if (state == GameState.Playing && !over && botDir >= 0 && botDir != want)
        {
            var p = Scr((x + 0.5f) * Cell + DX[botDir] * 45f, Top + (y + 0.5f) * Cell + DY[botDir] * 45f);
            next = $"[{p.x:F1},{p.y:F1}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F2},\"par\":{st.par},\"limit\":{st.limit},\"share\":{Share:F3},\"goal\":{st.goal:F2},\"lives\":{lives},\"next\":{next},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.9f, 0.29f, 0.5f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.11f, 0.12f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Goal {0}%", Mathf.RoundToInt(RollerClaimStages.All[i].goal * 100f));

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.85f, 0.9f), U("Roller Claim"),
                U("Roll out of your patch and back to paint everything the stripe encloses. Paint the goal share before time runs out."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + $"{Mathf.FloorToInt(Share * 100f)}% / {Mathf.RoundToInt(st.goal * 100f)}%" + "   " + F("{0}s", Mathf.Max(0, Mathf.CeilToInt(st.limit - t))) + "   " + F("Lives {0}", lives), 15, new Color(1f, 0.85f, 0.9f));
        OiyoArcade.Bar(new Rect(20f, 40f, w - 100f, 12f), Mathf.Clamp01(Share / st.goal), new Color(0.2f, 0.23f, 0.25f), new Color(0.9f, 0.29f, 0.5f));
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Swipe or use the arrows to steer the roller!"), 140f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{0}% painted · goal {1}%", Mathf.RoundToInt(Share * 100f), Mathf.RoundToInt(st.goal * 100f))}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, won, ResultLive, won ? U("The playground is painted!") : U("Not enough painted"), detail, body,
                won && stageIdx < StageCount - 1 ? U("Next stage") : null, won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
