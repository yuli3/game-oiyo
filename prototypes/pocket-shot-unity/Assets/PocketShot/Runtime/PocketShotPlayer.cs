using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Pocket Shot 3D: the web Pocket Shot (src/components/games/PocketShot.tsx, src/lib/games/pocket-shot.ts) rebuilt in
// Unity on the web's own 360 × 560 px field (OiyoField). Pull back anywhere and let go to strike the white ball the
// other way, harder the further you pull. Sink every numbered ball within the shots. The physics runs on the web's
// fixed 1/240 s steps in double precision; the 30 tables are the web's own (PocketShotStages.cs).
public class PocketShotPlayer : MonoBehaviour
{
    const string Slug = "pocket-shot";
    const int StageCount = 30;
    const double Left = 36, Right = 324, TopY = 96, Bottom = 520, R = 10, CornerR = 18, SideR = 16, Friction = 200, Cushion = 0.8;
    const double MinPower = 80, MaxPower = 900, DT = 1.0 / 240, Pull = 5;
    static readonly double[,] Pockets = { { Left, TopY, CornerR }, { Right, TopY, CornerR }, { Left, (TopY + Bottom) / 2, SideR }, { Right, (TopY + Bottom) / 2, SideR }, { Left, Bottom, CornerR }, { Right, Bottom, CornerR } };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of pocket-shot.ts) ----------------
    class Ball { public double x, y, vx, vy; public bool down; public Ball Copy() => (Ball)MemberwiseClone(); }
    class Table
    {
        public Ball cue; public Ball[] balls; public int shots; public bool moving, scratch, over, won;
        public Table Copy() { var t = (Table)MemberwiseClone(); t.cue = cue.Copy(); t.balls = new Ball[balls.Length]; for (int i = 0; i < balls.Length; i++) t.balls[i] = balls[i].Copy(); return t; }
    }
    struct StepEvent { public List<int> dropped; public int hits; }

    PocketShotStages.Level st;
    int stageIdx, starsWon;
    Table tb;

    Table NewTable()
    {
        var t = new Table { cue = new Ball { x = st.cue[0], y = st.cue[1] }, balls = new Ball[st.balls.Length / 2] };
        for (int i = 0; i < t.balls.Length; i++) t.balls[i] = new Ball { x = st.balls[2 * i], y = st.balls[2 * i + 1] };
        return t;
    }

    static double Hypot(double a, double b) => Math.Sqrt(a * a + b * b);

    bool Strike(Table t, double angle, double power)
    {
        if (t.over || t.moving) return false;
        double p = Math.Max(MinPower, Math.Min(MaxPower, power));
        t.cue.vx = Math.Cos(angle) * p;
        t.cue.vy = Math.Sin(angle) * p;
        t.shots++;
        t.moving = true;
        t.scratch = false;
        return true;
    }

    StepEvent Step(Table t)
    {
        var ev = new StepEvent { dropped = new List<int>() };
        if (!t.moving) return ev;
        int n = t.balls.Length + 1;
        Ball B(int i) => i == 0 ? t.cue : t.balls[i - 1];
        for (int i = 0; i < n; i++)
        {
            var b = B(i);
            if (b.down) continue;
            double sp = Hypot(b.vx, b.vy);
            if (sp == 0) continue;
            double ns = Math.Max(0, sp - Friction * DT);
            if (ns < 4) { b.vx = 0; b.vy = 0; }
            else { b.vx *= ns / sp; b.vy *= ns / sp; }
            b.x += b.vx * DT;
            b.y += b.vy * DT;
        }
        for (int i = 0; i < n; i++)
        {
            var a = B(i);
            if (a.down) continue;
            for (int j = i + 1; j < n; j++)
            {
                var b = B(j);
                if (b.down) continue;
                double dx = b.x - a.x, dy = b.y - a.y, d = Hypot(dx, dy);
                if (d >= 2 * R || d == 0) continue;
                double nx = dx / d, ny = dy / d, push = (2 * R - d) / 2;
                a.x -= nx * push; a.y -= ny * push;
                b.x += nx * push; b.y += ny * push;
                double rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
                if (rel <= 0) continue;
                double k = rel * 0.97;
                a.vx -= nx * k; a.vy -= ny * k;
                b.vx += nx * k; b.vy += ny * k;
                ev.hits++;
            }
        }
        for (int i = 0; i < n; i++)
        {
            var b = B(i);
            if (b.down) continue;
            bool drop = false;
            for (int p = 0; p < 6 && !drop; p++) if (Hypot(b.x - Pockets[p, 0], b.y - Pockets[p, 1]) < Pockets[p, 2]) drop = true;
            if (drop) { b.down = true; b.vx = 0; b.vy = 0; ev.dropped.Add(i - 1); continue; }
            if (b.x < Left + R) { b.x = 2 * (Left + R) - b.x; b.vx = -b.vx * Cushion; }
            else if (b.x > Right - R) { b.x = 2 * (Right - R) - b.x; b.vx = -b.vx * Cushion; }
            if (b.y < TopY + R) { b.y = 2 * (TopY + R) - b.y; b.vy = -b.vy * Cushion; }
            else if (b.y > Bottom - R) { b.y = 2 * (Bottom - R) - b.y; b.vy = -b.vy * Cushion; }
        }
        if (ev.dropped.Contains(-1)) t.scratch = true;
        bool still = true;
        for (int i = 0; i < n; i++) { var b = B(i); if (!b.down && (b.vx != 0 || b.vy != 0)) still = false; }
        if (still) SettleTable(t);
        return ev;
    }

    void SettleTable(Table t)
    {
        t.moving = false;
        if (t.cue.down)
        {
            t.cue.down = false;
            double sx = st.cue[0], y = st.cue[1];
            bool blocked = true;
            while (blocked)
            {
                blocked = false;
                foreach (var b in t.balls) if (!b.down && Hypot(b.x - sx, b.y - y) < 2 * R + 1) blocked = true;
                if (blocked) y -= 2 * R;
            }
            t.cue.x = sx;
            t.cue.y = Math.Max(TopY + R, y);
            t.cue.vx = 0; t.cue.vy = 0;
        }
        bool all = true;
        foreach (var b in t.balls) if (!b.down) all = false;
        if (all) { t.over = true; t.won = true; }
        else if (t.shots >= st.shots) t.over = true;
    }

    void RunOut(Table t)
    {
        int n = 0;
        while (t.moving && n < 12 / DT) { Step(t); n++; }
        if (t.moving) SettleTable(t);
    }

    int StarsFor()
    {
        if (!tb.won) return 0;
        if (tb.shots <= st.par) return 3;
        if (tb.shots <= st.par + 1) return 2;
        return 1;
    }

    static readonly double[] Powers = { 260, 380, 520, 700 };
    const double Nudge = 0.006;

    /** The careful player's shot (the web's chooseShot): a straight pot that still works aimed a hair off. */
    void ChooseShot(Table t, out double bestAngle, out double bestPower)
    {
        bestAngle = 0; bestPower = 400;
        double bestV = double.NegativeInfinity;
        int left = 0; foreach (var b in t.balls) if (!b.down) left++;
        var c = t.cue;
        foreach (var b in t.balls)
        {
            if (b.down) continue;
            for (int p = 0; p < 6; p++)
            {
                double ppx = Pockets[p, 0], ppy = Pockets[p, 1];
                double mx = ppx + (ppx < 180 ? 7 : -7);
                double my = ppy == TopY ? ppy + 7 : ppy == Bottom ? ppy - 7 : ppy;
                double px = mx - b.x, py = my - b.y, pd = Hypot(px, py);
                double gx = b.x - px / pd * 2 * R, gy = b.y - py / pd * 2 * R;
                double ax = gx - c.x, ay = gy - c.y, ad = Hypot(ax, ay);
                if (ad < 1) continue;
                double cut = (ax * px + ay * py) / (ad * pd);
                if (cut < 0.35) continue;
                double angle = Math.Atan2(ay, ax);
                foreach (double power in Powers)
                {
                    double v = 0;
                    foreach (double da in new[] { 0, -Nudge, Nudge })
                    {
                        var s = t.Copy();
                        Strike(s, angle + da, power);
                        RunOut(s);
                        int stillUp = 0; foreach (var x in s.balls) if (!x.down) stillUp++;
                        v += (left - stillUp) * 100 - (s.scratch ? 150 : 0) - power / 100;
                    }
                    if (v > bestV) { bestV = v; bestAngle = angle; bestPower = power; }
                }
            }
        }
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, cueBall, stick;
    Transform[] ballObj;
    Transform[] aimDots;
    Bursts sparkle;
    Synth synth;
    bool showStages, keyed;
    double aimAngle = -Math.PI / 2, aimPower = 420;
    bool dragging; Vector2 dragFrom; int dragId;
    double acc;
    static readonly Color[] BallColors = { new Color(0.99f, 0.77f, 0.1f), new Color(0.11f, 0.49f, 0.84f), new Color(0.88f, 0.19f, 0.19f), new Color(0.44f, 0.28f, 0.91f), new Color(0.97f, 0.4f, 0.03f), new Color(0.18f, 0.62f, 0.27f) };

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.23f, 0.16f, 0.13f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.65f, 0.65f, 0.62f), 0.8f, 55f, -20f);
        sparkle = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = PocketShotStages.All[stageIdx];
        tb = NewTable();
        starsWon = 0; keyed = false; dragging = false; acc = 0;
        aimAngle = -Math.PI / 2; aimPower = 420;
        botShotFor = -1;
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Table").transform;
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

    Transform Sphere(Color c, float gloss)
    {
        var s = OiyoArcade.Prim(PrimitiveType.Sphere, "Ball", OiyoArcade.Lit(c, gloss), root).transform;
        s.localScale = Vector3.one * OiyoField.U(20f);
        return s;
    }

    void BuildScene()
    {
        float l = (float)Left, r = (float)Right, t = (float)TopY, b = (float)Bottom;
        var wood = OiyoArcade.Lit(new Color(0.54f, 0.35f, 0.17f), 0.4f);
        Box("Floor", OiyoArcade.Lit(new Color(0.23f, 0.16f, 0.13f), 0.1f), 180f, 300f, 1200f, 1800f, 1f, 0.2f);
        Box("Rail", wood, (l + r) / 2f, (t + b) / 2f, r - l + 44f, b - t + 44f, 0.2f, 0.5f);
        Box("Cloth", OiyoArcade.Lit(new Color(0.11f, 0.49f, 0.33f), 0.05f), (l + r) / 2f, (t + b) / 2f, r - l, b - t, 0.05f, 0.4f);
        var hole = OiyoArcade.Lit(new Color(0.05f, 0.05f, 0.05f), 0f);
        for (int p = 0; p < 6; p++)
        {
            var h = OiyoArcade.Prim(PrimitiveType.Cylinder, "Pocket", hole, root).transform;
            float d = (float)Pockets[p, 2] * 2f;
            h.localScale = new Vector3(OiyoField.U(d), 0.02f, OiyoField.U(d));
            h.rotation = Quaternion.Euler(-90f, 0f, 0f);
            h.position = field.W((float)Pockets[p, 0], (float)Pockets[p, 1], -0.17f);
        }
        var dotMat = OiyoArcade.Lit(new Color(0.75f, 0.54f, 0.29f), 0.3f);
        for (int k = 1; k <= 3; k++)
        {
            Box("Sight", dotMat, l + (r - l) * k / 4f, t - 14f, 4f, 4f, -0.06f, 0.02f);
            Box("Sight", dotMat, l + (r - l) * k / 4f, b + 14f, 4f, 4f, -0.06f, 0.02f);
        }
        ballObj = new Transform[tb.balls.Length];
        for (int k = 0; k < ballObj.Length; k++) ballObj[k] = Sphere(BallColors[k % 6], 0.85f);
        cueBall = Sphere(new Color(0.97f, 0.97f, 0.98f), 0.9f);
        stick = Box("Cue", OiyoArcade.Lit(new Color(0.91f, 0.77f, 0.42f), 0.5f), 0f, 0f, 5f, 130f, -0.4f, OiyoField.U(5f));
        var aimMat = OiyoArcade.Glow(new Color(1f, 1f, 1f, 0.8f));
        aimDots = new Transform[16];
        for (int k = 0; k < aimDots.Length; k++) aimDots[k] = Box("Aim", aimMat, 0f, 0f, 4f, 4f, -0.35f, 0.02f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("pocket-shot", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && tb.moving)
        {
            acc += dt;
            int hits = 0;
            while (acc >= DT && tb.moving)
            {
                acc -= DT;
                var ev = Step(tb);
                hits += ev.hits;
                foreach (int k in ev.dropped)
                {
                    var b = k < 0 ? tb.cue : tb.balls[k];
                    sparkle.Emit(field.W((float)b.x, (float)b.y, -0.6f), k < 0 ? Color.white : BallColors[k % 6], 14, 2.5f, 0.06f, 0.5f);
                    synth.Tone(k < 0 ? 196f : 784f, 0.12f, Wave.Triangle, 0.15f);
                }
            }
            if (hits > 0) synth.Tone(1200f, 0.03f, Wave.Square, 0.06f);
            if (!tb.moving)
            {
                acc = 0;
                if (tb.over) End();
            }
        }
        Animate();
    }

    void Shoot(double angle, double power)
    {
        if (state != GameState.Playing || tb.over || tb.moving) return;
        if (Strike(tb, angle, power)) synth.Tone(330f, 0.05f, Wave.Triangle, 0.12f);
    }

    bool AimFrom(Vector2 screen)
    {
        if (!field.ToField(screen, out Vector2 f)) return false;
        double dx = dragFrom.x - f.x, dy = dragFrom.y - f.y, len = Hypot(dx, dy);
        if (len > 4) { aimAngle = Math.Atan2(dy, dx); aimPower = Math.Max(MinPower, Math.Min(MaxPower, len * Pull)); }
        return len >= 12;
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
                    // input is read once per frame: press, pull back, let go
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (tb.moving || tb.over || !field.ToField(b.pos, out Vector2 f)) continue;
                        dragging = true; dragFrom = f; dragId = b.id;
                    }
                    if (dragging)
                    {
                        foreach (var hp in OiyoArcade.Held()) if (hp.id == dragId) AimFrom(hp.pos);
                        foreach (var e in OiyoArcade.Ended())
                        {
                            if (e.id != dragId) continue;
                            dragging = false;
                            if (AimFrom(e.pos)) Shoot(aimAngle, aimPower);
                        }
                    }
                    double turn = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift) ? Math.PI / 720 : Math.PI / 90;
                    bool k = true;
                    if (Input.GetKeyDown(KeyCode.LeftArrow)) aimAngle -= turn;
                    else if (Input.GetKeyDown(KeyCode.RightArrow)) aimAngle += turn;
                    else if (Input.GetKeyDown(KeyCode.UpArrow)) aimPower = Math.Min(MaxPower, aimPower + 40);
                    else if (Input.GetKeyDown(KeyCode.DownArrow)) aimPower = Math.Max(MinPower, aimPower - 40);
                    else k = false;
                    if (k) { keyed = true; if (state == GameState.Ready) state = GameState.Playing; }
                    if (Input.GetKeyDown(KeyCode.Space) || confirm)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else { keyed = true; Shoot(aimAngle, aimPower); }
                    }
                    return;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm && ResultLive) LoadStage(tb.won ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
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
        if (tb.won)
        {
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, (st.shots - tb.shots) * 10), StageCount);
            sparkle.Emit(field.W(180f, 300f, -1f), new Color(1f, 0.85f, 0.25f), 40, 4f, 0.1f, 1f);
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

    void Place(Transform o, Ball b)
    {
        o.gameObject.SetActive(!b.down);
        o.position = field.W((float)b.x, (float)b.y, -OiyoField.U(10f) - 0.17f);
        if (b.vx != 0 || b.vy != 0) o.Rotate(new Vector3((float)b.vy, -(float)b.vx, 0f) * 0.02f, Space.World);
    }

    void Animate()
    {
        if (root == null) return;
        field.Fit(56f, 10f, 0f, 70f, 550f);
        for (int k = 0; k < ballObj.Length; k++) Place(ballObj[k], tb.balls[k]);
        Place(cueBall, tb.cue);
        bool aim = state == GameState.Playing && !tb.moving && !tb.over && (dragging || keyed);
        stick.gameObject.SetActive(state == GameState.Playing && !tb.moving && !tb.over);
        float ca = Mathf.Cos((float)aimAngle), sa = Mathf.Sin((float)aimAngle);
        float back = 16f + (float)(aimPower / MaxPower) * 40f;
        float cx = (float)tb.cue.x, cy = (float)tb.cue.y;
        stick.position = field.W(cx - ca * (back + 65f), cy - sa * (back + 65f), -0.4f);
        stick.rotation = Quaternion.Euler(0f, 0f, -(float)(aimAngle * 180 / Math.PI) - 90f);
        float len = 40f + (float)(aimPower / MaxPower) * 140f;
        for (int k = 0; k < aimDots.Length; k++)
        {
            float s = 16f + k * 10f;
            aimDots[k].gameObject.SetActive(aim && s < len);
            aimDots[k].position = field.W(cx + ca * s, cy + sa * s, -0.35f);
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the pull (screen px from the
    // top-left, press and let-go points) for the careful player's shot, once everything has stopped.
    bool testLog; float testT; int botShotFor = -1; double botAngle, botPower;
    void TestTick(float dt)
    {
        if (!testLog) return;
        if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        string nx = "null";
        if (state == GameState.Playing && !tb.over && !tb.moving)
        {
            if (botShotFor != tb.shots) { ChooseShot(tb, out botAngle, out botPower); botShotFor = tb.shots; }
            float len = (float)(botPower / Pull);
            var a = cam.WorldToScreenPoint(field.W(180f, 300f, 0f));
            var b = cam.WorldToScreenPoint(field.W(180f - Mathf.Cos((float)botAngle) * len, 300f - Mathf.Sin((float)botAngle) * len, 0f));
            nx = $"[{a.x:F2},{Screen.height - a.y:F2},{b.x:F2},{Screen.height - b.y:F2}]";
        }
        int up = 0; foreach (var x in tb.balls) if (!x.down) up++;
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"shots\":{tb.shots},\"of\":{st.shots},\"par\":{st.par},\"left\":{up},\"moving\":{(tb.moving ? 1 : 0)},\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(1f, 0.83f, 0.23f, 0.97f);
    static readonly Color Dark = new Color(0.12f, 0.08f, 0.06f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Balls left {0}", PocketShotStages.All[i].balls.Length / 2);

    Vector2 Gui(float x, float y, float z) => OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(x, y, z)));

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.91f, 0.8f), U("Pocket Shot"),
                U("Pull back anywhere and let go to strike the white ball the other way, harder the further you pull. Sink every numbered ball within the shots."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        for (int k = 0; k < tb.balls.Length; k++)
        {
            if (tb.balls[k].down) continue;
            var p = Gui((float)tb.balls[k].x, (float)tb.balls[k].y, -0.5f);
            OiyoArcade.Text(new Rect(p.x - 10f, p.y - 9f, 20f, 18f), (k + 1).ToString(), 10, new Color(0.1f, 0.1f, 0.1f), TextAnchor.MiddleCenter, true);
        }
        int up = 0; foreach (var x in tb.balls) if (!x.down) up++;
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Shots {0}/{1}", tb.shots, st.shots) + "   " + F("Balls left {0}", up), 15, new Color(1f, 0.91f, 0.8f));
        if (tb.scratch && !tb.moving && state == GameState.Playing)
            OiyoArcade.Shadowed(new Rect(0f, 58f, w, 24f), U("The white ball dropped"), 15, new Color(1f, 0.6f, 0.6f), TextAnchor.MiddleCenter);
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Pull back and let go to strike the white ball!"), 120f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = tb.won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = tb.won ? $"<size=14>{F("Cleared in {0} shots", tb.shots)}</size>" : "";
            int r = OiyoScreens.Result(w, h, Dark, Accent, tb.won, ResultLive, tb.won ? U("All potted!") : U("Out of shots"), detail, body,
                tb.won && stageIdx < StageCount - 1 ? U("Next stage") : null, tb.won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
