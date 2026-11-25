using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Gumball Volley 3D: the web Gumball Volley (src/components/games/GumballVolley.tsx, src/lib/games/gumball-volley.ts)
// rebuilt in Unity on the web's own 360 × 560 px field (OiyoField). Aim, and a volley of gumballs bounces through the
// numbered candy blocks; after each volley the blocks come down a row. The physics runs on the web's fixed 1/120 s
// steps in double precision; the 30 shops are the web's own (GumballVolleyStages.cs).
public class GumballVolleyPlayer : MonoBehaviour
{
    const string Slug = "gumball-volley";
    const int StageCount = 30;
    const int Cols = 7, Rows = 9, Plus = -1;
    const double Cell = 44, X0 = 26, Y0 = 60, Floor = 480, BallR = 5, Speed = 600, Gap = 0.08, DT = 1.0 / 120;
    static readonly double MinAngle = 10 * Math.PI / 180;
    static readonly double Left = X0 + BallR, Right = X0 + Cols * Cell - BallR, TopY = Y0 + BallR;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of gumball-volley.ts) ----------------
    GumballVolleyStages.Level st;
    int stageIdx, starsWon, nRows;
    class Shop { public int[] grid; public int next, balls, volleys; public double launchX; public bool over, won; public Shop Copy() { var s = (Shop)MemberwiseClone(); s.grid = (int[])grid.Clone(); return s; } }
    class Ball { public double x, y, vx, vy, t0; public bool live; }
    struct Result { public int hits, popped, pluses; public double landX; }
    Shop shop;

    int RowCell(int r, int c) => st.cells[r * Cols + c];

    Shop NewShop()
    {
        var s = new Shop { grid = new int[Rows * Cols], next = st.start, balls = st.balls, launchX = X0 + Cols * Cell / 2 };
        for (int r = 0; r < st.start; r++) { int y = st.start - 1 - r; for (int c = 0; c < Cols; c++) s.grid[y * Cols + c] = RowCell(r, c); }
        return s;
    }

    static double ClampAim(double a) => Math.Max(MinAngle, Math.Min(Math.PI - MinAngle, a));

    Result Volley(Shop s, double angle, Action<List<Ball>> onStep = null)
    {
        double a = ClampAim(angle);
        var res = new Result { landX = s.launchX };
        var balls = new List<Ball>();
        for (int k = 0; k < s.balls; k++) balls.Add(new Ball { x = s.launchX, y = Floor, vx = Math.Cos(a) * Speed, vy = -Math.Sin(a) * Speed, t0 = k * Gap });
        bool landed = false;
        double t = 0;
        int done = 0;
        while (done < balls.Count && t < 20)
        {
            t += DT;
            foreach (var b in balls)
            {
                if (!b.live)
                {
                    if (b.t0 <= t && b.y == Floor && b.vy != 0) b.live = true;
                    else continue;
                }
                double px = b.x, py = b.y;
                b.x += b.vx * DT; b.y += b.vy * DT;
                if (b.x < Left) { b.x = 2 * Left - b.x; b.vx = -b.vx; }
                else if (b.x > Right) { b.x = 2 * Right - b.x; b.vx = -b.vx; }
                if (b.y < TopY) { b.y = 2 * TopY - b.y; b.vy = -b.vy; }
                int c = (int)Math.Floor((b.x - X0) / Cell), r = (int)Math.Floor((b.y - Y0) / Cell);
                int[,] probe = { { c, r }, { (int)Math.Floor((b.x + Math.Sign(b.vx) * BallR - X0) / Cell), r }, { c, (int)Math.Floor((b.y + Math.Sign(b.vy) * BallR - Y0) / Cell) } };
                for (int q = 0; q < 3; q++)
                {
                    int cc = probe[q, 0], rr = probe[q, 1];
                    if (cc < 0 || cc >= Cols || rr < 0 || rr >= Rows) continue;
                    int i = rr * Cols + cc, v = s.grid[i];
                    if (v == Plus)
                    {
                        double mx = X0 + cc * Cell + Cell / 2, my = Y0 + rr * Cell + Cell / 2;
                        if (Math.Sqrt((b.x - mx) * (b.x - mx) + (b.y - my) * (b.y - my)) < 14 + BallR) { s.grid[i] = 0; res.pluses++; }
                        continue;
                    }
                    if (v <= 0) continue;
                    double bx0 = X0 + cc * Cell - BallR, bx1 = X0 + (cc + 1) * Cell + BallR, by0 = Y0 + rr * Cell - BallR, by1 = Y0 + (rr + 1) * Cell + BallR;
                    if (b.x <= bx0 || b.x >= bx1 || b.y <= by0 || b.y >= by1) continue;
                    bool outX = px <= bx0 || px >= bx1, outY = py <= by0 || py >= by1;
                    if (outX && !outY) b.vx = -b.vx;
                    else if (outY && !outX) b.vy = -b.vy;
                    else { b.vx = -b.vx; b.vy = -b.vy; }
                    b.x = px; b.y = py;
                    s.grid[i] = v - 1;
                    res.hits++;
                    if (v - 1 == 0) res.popped++;
                    break;
                }
                if (b.y >= Floor && b.vy > 0)
                {
                    b.y = Floor; b.vy = 0; b.vx = 0; b.live = false; b.t0 = double.PositiveInfinity;
                    done++;
                    if (!landed) { landed = true; res.landX = Math.Max(Left, Math.Min(Right, b.x)); }
                }
            }
            onStep?.Invoke(balls);
        }
        return res;
    }

    void Settle(Shop s, Result res)
    {
        s.volleys++;
        s.balls += res.pluses;
        s.launchX = res.landX;
        bool left = s.next < nRows;
        foreach (int v in s.grid) if (v > 0) left = true;
        if (!left) { s.over = true; s.won = true; return; }
        for (int c = 0; c < Cols; c++) if (s.grid[(Rows - 1) * Cols + c] > 0) { s.over = true; return; }
        for (int r = Rows - 1; r > 0; r--) for (int c = 0; c < Cols; c++) s.grid[r * Cols + c] = s.grid[(r - 1) * Cols + c];
        for (int c = 0; c < Cols; c++) s.grid[c] = s.next < nRows ? RowCell(s.next, c) : 0;
        s.next++;
        bool any = false; foreach (int v in s.grid) if (v > 0) any = true;
        if (!any && s.next >= nRows) { s.over = true; s.won = true; }
    }

    int StarsFor()
    {
        if (!shop.won) return 0;
        if (shop.volleys <= st.par) return 3;
        if (shop.volleys <= st.par + 2) return 2;
        return 1;
    }

    static readonly double Nudge = 0.6 * Math.PI / 180;

    int Judge(Shop before, Shop after, Result res)
    {
        int v = res.popped * 1000 + res.pluses * 400;
        for (int i = 0; i < before.grid.Length; i++)
        {
            int was = before.grid[i];
            if (was > 0) v += (was - Math.Max(0, after.grid[i])) * (10 + (i / Cols) * 6);
        }
        return v;
    }

    /** The careful aimer's aim (the web's chooseAim). */
    double ChooseAim(Shop s)
    {
        double best = Math.PI / 2, bestV = double.NegativeInfinity;
        for (double deg = 12; deg <= 168; deg += 2.5)
        {
            double a = deg * Math.PI / 180, v = 0;
            foreach (double da in new[] { 0, -Nudge, Nudge })
            {
                var t = s.Copy();
                var res = Volley(t, a + da);
                v += Judge(s, t, res);
            }
            if (v > bestV) { bestV = v; best = a; }
        }
        return best;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, launcher;
    Transform[] blockObj;
    Renderer[] blockRen;
    Transform[] ballObj;
    Transform[] aimDots;
    Material[] candy;
    Material plusMat;
    Bursts sparkle;
    Synth synth;
    bool showStages, keyed, aiming;
    double aim = Math.PI / 2;
    int[] shown;
    List<(List<Vector2> balls, int[] grid)> frames;
    Result pending;
    float playT;
    int dragId;
    static readonly Color[] Candy = { new Color(1f, 0.42f, 0.42f), new Color(1f, 0.66f, 0.3f), new Color(1f, 0.83f, 0.23f), new Color(0.41f, 0.86f, 0.49f), new Color(0.3f, 0.67f, 0.97f), new Color(0.59f, 0.46f, 0.98f), new Color(0.97f, 0.51f, 0.67f) };

    Vector2 CellCentre(int i) => new Vector2((float)(X0 + (i % Cols) * Cell + Cell / 2), (float)(Y0 + (i / Cols) * Cell + Cell / 2));

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(1f, 0.96f, 0.9f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.72f, 0.7f, 0.68f), 0.75f, 50f, -25f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        candy = new Material[Candy.Length];
        for (int k = 0; k < Candy.Length; k++) candy[k] = OiyoArcade.Lit(Candy[k], 0.7f);
        plusMat = OiyoArcade.Glow(new Color(0.3f, 0.67f, 0.97f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = GumballVolleyStages.All[stageIdx];
        nRows = st.cells.Length / Cols;
        shop = NewShop();
        shown = (int[])shop.grid.Clone();
        frames = null; playT = 0f; starsWon = 0; keyed = false; aiming = false; aim = Math.PI / 2;
        botFor = -1;
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Shop").transform;
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
        Box("Wall", OiyoArcade.Lit(new Color(1f, 0.91f, 0.8f), 0.1f), 180f, 280f, 1200f, 1600f, 0.6f, 0.2f);
        Box("Board", OiyoArcade.Lit(new Color(1f, 0.94f, 0.85f), 0.1f), (float)(X0 + Cols * Cell / 2), (float)(Y0 + Rows * Cell / 2), (float)(Cols * Cell), (float)(Rows * Cell), 0.3f, 0.1f);
        Box("Counter", OiyoArcade.Lit(new Color(0.85f, 0.28f, 0.05f), 0.3f), 180f, (float)Floor + 50f, 1200f, 90f, 0.1f, 0.6f);
        Box("Line", OiyoArcade.Lit(new Color(0.91f, 0.35f, 0.05f), 0.3f), 180f, (float)(Y0 + Rows * Cell) + 3f, (float)(Cols * Cell), 6f, 0.1f, 0.2f);
        blockObj = new Transform[Rows * Cols];
        blockRen = new Renderer[Rows * Cols];
        for (int i = 0; i < blockObj.Length; i++)
        {
            var c = CellCentre(i);
            blockObj[i] = Box("Block", candy[0], c.x, c.y, (float)Cell - 4f, (float)Cell - 4f, -0.2f, OiyoField.U(30f));
            blockRen[i] = blockObj[i].GetComponent<Renderer>();
        }
        var gum = OiyoArcade.Lit(new Color(0.94f, 0.4f, 0.58f), 0.8f);
        ballObj = new Transform[80];
        for (int k = 0; k < ballObj.Length; k++)
        {
            ballObj[k] = OiyoArcade.Prim(PrimitiveType.Sphere, "Gum", gum, root).transform;
            ballObj[k].localScale = Vector3.one * OiyoField.U(10f);
        }
        launcher = OiyoArcade.Prim(PrimitiveType.Sphere, "Launcher", gum, root).transform;
        launcher.localScale = Vector3.one * OiyoField.U(14f);
        aimDots = new Transform[14];
        var dot = OiyoArcade.Glow(new Color(0.13f, 0.15f, 0.16f, 0.6f));
        for (int k = 0; k < aimDots.Length; k++) aimDots[k] = Box("Aim", dot, 0f, 0f, 4f, 4f, -0.5f, 0.02f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("gumball-volley", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (frames != null)
        {
            int before = Mathf.Min(frames.Count - 1, Mathf.FloorToInt(playT / (float)(2 * DT)));
            playT += dt * 1.5f;
            int k = Mathf.Min(frames.Count - 1, Mathf.FloorToInt(playT / (float)(2 * DT)));
            var g = frames[k].grid;
            for (int i = 0; i < g.Length; i++)
            {
                if (shown[i] > 0 && g[i] == 0)
                {
                    var c = CellCentre(i);
                    sparkle.Emit(field.W(c.x, c.y, -0.8f), Candy[i % Candy.Length], 10, 2.5f, 0.06f, 0.5f);
                    synth.Tone(880f, 0.06f, Wave.Triangle, 0.1f);
                }
                else if (shown[i] > 0 && g[i] < shown[i] && k != before) synth.Tone(660f, 0.03f, Wave.Square, 0.04f);
            }
            shown = (int[])g.Clone();
            if (k >= frames.Count - 1)
            {
                frames = null;
                Settle(shop, pending);
                shown = (int[])shop.grid.Clone();
                if (shop.over) End();
            }
        }
        Animate();
    }

    void Fire(double angle)
    {
        if (state != GameState.Playing || shop.over || frames != null) return;
        frames = new List<(List<Vector2>, int[])>();
        int n = 0;
        pending = Volley(shop, angle, bs =>
        {
            if (n++ % 2 == 1) return;
            var pts = new List<Vector2>();
            foreach (var b in bs) if (b.live) pts.Add(new Vector2((float)b.x, (float)b.y));
            frames.Add((pts, (int[])shop.grid.Clone()));
        });
        if (frames.Count == 0) frames.Add((new List<Vector2>(), (int[])shop.grid.Clone()));
        playT = 0f;
        synth.Tone(392f, 0.06f, Wave.Triangle, 0.12f);
    }

    void AimAt(Vector2 screen)
    {
        if (!field.ToField(screen, out Vector2 f)) return;
        aim = ClampAim(Math.Atan2(Floor - f.y, f.x - shop.launchX));
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
                    // input is read once per frame: press and drag to aim, let go to fire
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (shop.over || frames != null) continue;
                        aiming = true; dragId = b.id; AimAt(b.pos);
                    }
                    if (aiming)
                    {
                        foreach (var hp in OiyoArcade.Held()) if (hp.id == dragId) AimAt(hp.pos);
                        foreach (var e in OiyoArcade.Ended())
                        {
                            if (e.id != dragId) continue;
                            aiming = false; AimAt(e.pos); Fire(aim);
                        }
                    }
                    double step = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift) ? Math.PI / 360 : Math.PI / 72;
                    bool k = true;
                    if (Input.GetKeyDown(KeyCode.LeftArrow)) aim = ClampAim(aim + step);
                    else if (Input.GetKeyDown(KeyCode.RightArrow)) aim = ClampAim(aim - step);
                    else k = false;
                    if (k) { keyed = true; if (state == GameState.Ready) state = GameState.Playing; }
                    if (Input.GetKeyDown(KeyCode.Space) || confirm)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else { keyed = true; Fire(aim); }
                    }
                    return;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm && ResultLive) LoadStage(shop.won ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
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
        if (shop.won)
        {
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, 100 - shop.volleys * 5), StageCount);
            sparkle.Emit(field.W(180f, 260f, -1f), new Color(0.97f, 0.51f, 0.67f), 40, 4f, 0.1f, 1f);
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
        field.Fit(56f, 10f, 0f, (float)Y0 - 10f, (float)Floor + 20f);
        for (int i = 0; i < blockObj.Length; i++)
        {
            int v = shown[i];
            blockObj[i].gameObject.SetActive(v != 0);
            if (v == 0) continue;
            var c = CellCentre(i);
            if (v == Plus)
            {
                blockRen[i].sharedMaterial = plusMat;
                blockObj[i].localScale = new Vector3(OiyoField.U(16f), OiyoField.U(16f), OiyoField.U(16f));
                blockObj[i].rotation = Quaternion.Euler(0f, 0f, Time.time * 90f);
                blockObj[i].position = field.W(c.x, c.y, -0.3f);
            }
            else
            {
                blockRen[i].sharedMaterial = candy[((i * 3) + v) % candy.Length];
                blockObj[i].localScale = new Vector3(OiyoField.U((float)Cell - 4f), OiyoField.U((float)Cell - 4f), OiyoField.U(30f));
                blockObj[i].rotation = Quaternion.identity;
                blockObj[i].position = field.W(c.x, c.y, -0.2f);
            }
        }
        int nb = 0;
        if (frames != null)
        {
            int k = Mathf.Min(frames.Count - 1, Mathf.FloorToInt(playT / (float)(2 * DT)));
            foreach (var p in frames[k].balls) { if (nb >= ballObj.Length) break; ballObj[nb].gameObject.SetActive(true); ballObj[nb].position = field.W(p.x, p.y, -0.6f); nb++; }
        }
        for (int k = nb; k < ballObj.Length; k++) ballObj[k].gameObject.SetActive(false);
        launcher.gameObject.SetActive(frames == null && !shop.over);
        launcher.position = field.W((float)shop.launchX, (float)Floor, -0.6f);
        bool show = frames == null && !shop.over && state == GameState.Playing && (aiming || keyed);
        for (int k = 0; k < aimDots.Length; k++)
        {
            aimDots[k].gameObject.SetActive(show);
            float s = (k + 1) * 22f;
            aimDots[k].position = field.W((float)shop.launchX + Mathf.Cos((float)aim) * s, (float)Floor - Mathf.Sin((float)aim) * s, -0.5f);
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the drag (screen px from the
    // top-left: press and let-go points) for the careful aimer's aim, once the volley has finished.
    bool testLog; float testT; int botFor = -1; double botAim;
    void TestTick(float dt)
    {
        if (!testLog) return;
        if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        string nx = "null";
        if (state == GameState.Playing && !shop.over && frames == null)
        {
            if (botFor != shop.volleys) { botAim = ChooseAim(shop); botFor = shop.volleys; }
            var p = cam.WorldToScreenPoint(field.W((float)(shop.launchX + Math.Cos(botAim) * 160), (float)(Floor - Math.Sin(botAim) * 160), 0f));
            nx = $"[{p.x:F2},{Screen.height - p.y:F2},{p.x:F2},{Screen.height - p.y:F2}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"volleys\":{shop.volleys},\"balls\":{shop.balls},\"par\":{st.par},\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.97f, 0.4f, 0.58f, 0.97f);
    static readonly Color Dark = new Color(0.2f, 0.08f, 0.12f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} rows", GumballVolleyStages.All[i].cells.Length / Cols);

    Vector2 Gui(Vector2 f, float z) => OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(f.x, f.y, z)));

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.92f, 0.95f), U("Gumball Volley"),
                U("Drag to aim and let go: a volley of gumballs bounces through the numbered blocks, taking one off with every hit. Pop them all before a block reaches the counter."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        for (int i = 0; i < shown.Length; i++)
        {
            if (shown[i] <= 0) continue;
            var p = Gui(CellCentre(i), -0.75f);
            OiyoArcade.Text(new Rect(p.x - 20f, p.y - 11f, 40f, 22f), shown[i].ToString(), 15, new Color(0.13f, 0.15f, 0.16f), TextAnchor.MiddleCenter, true);
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Volley {0}", shop.volleys) + "   " + F("{0} gumballs", shop.balls), 15, new Color(1f, 0.92f, 0.95f));
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Drag to aim, let go to fire the gumballs!"), 120f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = shop.won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = shop.won ? $"<size=14>{F("All popped in {0} volleys", shop.volleys)}</size>" : "";
            int r = OiyoScreens.Result(w, h, Dark, Accent, shop.won, ResultLive, shop.won ? U("Every block popped!") : U("A block reached the counter"), detail, body,
                shop.won && stageIdx < StageCount - 1 ? U("Next stage") : null, shop.won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
