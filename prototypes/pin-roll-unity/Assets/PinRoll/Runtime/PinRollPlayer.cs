using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Pin Roll 3D: the web Pin Roll (src/components/games/PinRoll.tsx, src/lib/games/pin-roll.ts) rebuilt in Unity on the
// web's own 360 × 560 px field (OiyoField). Press where the ball should start and flick it up the toy lane. Two rolls a
// frame; knock down the stage's pins. The physics runs on the web's fixed 1/240 s steps in double precision; the 30
// lanes are the web's own (PinRollStages.cs).
public class PinRollPlayer : MonoBehaviour
{
    const string Slug = "pin-roll";
    const int StageCount = 30;
    const double LaneL = 110, LaneR = 250, Foul = 470, Back = 112, BallR = 12, PinR = 7, PostR = 9, HeadY = 190;
    const double MinSpeed = 260, MaxSpeed = 760, DT = 1.0 / 240, Pull = 4;
    const int StrikeBonus = 5, SpareBonus = 2;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of pin-roll.ts) ----------------
    class Body { public double x, y, vx, vy, r, m, f; public bool standing = true, hit, gutter; public double sx, sy; public Body Copy() => (Body)MemberwiseClone(); }
    class Alley
    {
        public int frame, roll, score, knocked, strikes; public Body ball; public Body[] pins; public bool over, won;
        public Alley Copy() { var a = (Alley)MemberwiseClone(); a.ball = ball?.Copy(); a.pins = new Body[pins.Length]; for (int i = 0; i < pins.Length; i++) a.pins[i] = pins[i].Copy(); return a; }
    }
    struct RollEvent { public int down; public bool strike, spare; }

    PinRollStages.Level st;
    int stageIdx, starsWon;
    Alley al;
    static readonly double[,] Spots = BuildSpots();
    static double[,] BuildSpots()
    {
        var s = new double[10, 2];
        double cx = (LaneL + LaneR) / 2;
        int i = 0;
        for (int row = 0; row < 4; row++) for (int k = 0; k <= row; k++) { s[i, 0] = cx + (k - row / 2.0) * 24; s[i, 1] = HeadY - row * 22; i++; }
        return s;
    }

    static Body[] FreshPins()
    {
        var p = new Body[10];
        for (int i = 0; i < 10; i++) p[i] = new Body { x = Spots[i, 0], y = Spots[i, 1], r = PinR, m = 1, f = 380, sx = Spots[i, 0], sy = Spots[i, 1] };
        return p;
    }

    Alley NewAlley() => new Alley { pins = FreshPins() };

    static bool Roll(Alley a, double x0, double angle, double speed)
    {
        if (a.over || a.ball != null) return false;
        double x = Math.Max(LaneL + BallR, Math.Min(LaneR - BallR, x0));
        double s = Math.Max(MinSpeed, Math.Min(MaxSpeed, speed));
        a.ball = new Body { x = x, y = Foul, vx = Math.Sin(angle) * s, vy = -Math.Cos(angle) * s, r = BallR, m = 6, f = 30 };
        return true;
    }

    static bool Collide(Body p, Body q)
    {
        double dx = q.x - p.x, dy = q.y - p.y, d = Math.Sqrt(dx * dx + dy * dy), min = p.r + q.r;
        if (d >= min || d == 0) return false;
        double nx = dx / d, ny = dy / d, push = min - d, tm = p.m + q.m;
        p.x -= nx * push * (q.m / tm); p.y -= ny * push * (q.m / tm);
        q.x += nx * push * (p.m / tm); q.y += ny * push * (p.m / tm);
        double rel = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny;
        if (rel <= 0) return true;
        double j = 1.85 * rel / tm;
        p.vx -= j * q.m * nx; p.vy -= j * q.m * ny;
        q.vx += j * p.m * nx; q.vy += j * p.m * ny;
        return true;
    }

    static void Slow(Body b)
    {
        double sp = Math.Sqrt(b.vx * b.vx + b.vy * b.vy);
        if (sp == 0) return;
        double ns = Math.Max(0, sp - b.f * DT);
        if (ns < 3) { b.vx = 0; b.vy = 0; }
        else { b.vx *= ns / sp; b.vy *= ns / sp; }
        b.x += b.vx * DT; b.y += b.vy * DT;
    }

    Body Post(int k) => new Body { x = st.posts[2 * k], y = st.posts[2 * k + 1], r = PostR, m = 1e6, f = 0 };

    RollEvent? Step(Alley a)
    {
        var b = a.ball;
        if (b == null) return null;
        Slow(b);
        if (!b.gutter && (b.x < LaneL || b.x > LaneR)) { b.gutter = true; b.vx = 0; }
        var up = new List<Body>();
        foreach (var p in a.pins) if (p.standing) up.Add(p);
        foreach (var p in up) Slow(p);
        int np = st.posts.Length / 2;
        if (!b.gutter)
        {
            for (int k = 0; k < np; k++) Collide(b, Post(k));
            foreach (var p in up) if (Collide(b, p)) p.hit = true;
        }
        for (int i = 0; i < up.Count; i++)
        {
            for (int j = i + 1; j < up.Count; j++) if (Collide(up[i], up[j])) { up[i].hit = true; up[j].hit = true; }
            for (int k = 0; k < np; k++) Collide(up[i], Post(k));
        }
        foreach (var p in up) if (Math.Sqrt((p.x - p.sx) * (p.x - p.sx) + (p.y - p.sy) * (p.y - p.sy)) > 3 || p.x < LaneL || p.x > LaneR) p.hit = true;
        bool ballDone = b.y < Back - 20 || (b.vx == 0 && b.vy == 0);
        bool pinsStill = true;
        foreach (var p in up) if (!((p.vx == 0 && p.vy == 0) || p.y < Back - 30 || p.x < LaneL - 20 || p.x > LaneR + 20)) pinsStill = false;
        if (!ballDone || !pinsStill) return null;
        return FinishRoll(a);
    }

    RollEvent FinishRoll(Alley a)
    {
        a.ball = null;
        int down = 0;
        foreach (var p in a.pins)
        {
            if (p.standing && p.hit) { p.standing = false; down++; }
            if (p.standing) { p.x = p.sx; p.y = p.sy; p.vx = 0; p.vy = 0; }
        }
        a.knocked += down;
        var ev = new RollEvent { down = down };
        int points = down;
        if (a.roll == 0 && a.knocked == 10) { ev.strike = true; a.strikes++; points += StrikeBonus; }
        else if (a.roll == 1 && a.knocked == 10) { ev.spare = true; points += SpareBonus; }
        a.score += points;
        if (a.roll == 0 && !ev.strike) a.roll = 1;
        else { a.frame++; a.roll = 0; a.knocked = 0; a.pins = FreshPins(); }
        if (a.frame >= st.frames) { a.over = true; a.won = a.score >= st.need; }
        return ev;
    }

    RollEvent RunRoll(Alley a)
    {
        for (int n = 0; n < 12 / DT; n++) { var ev = Step(a); if (ev != null) return ev.Value; }
        return FinishRoll(a);
    }

    int StarsFor()
    {
        if (!al.won) return 0;
        if (al.score >= st.par) return 3;
        if (al.score >= Mathf.CeilToInt((st.need + st.par) / 2f)) return 2;
        return 1;
    }

    static readonly double[] Xs = { -44, -22, 0, 22, 44 };
    static readonly double[] Angles = { -0.18, -0.12, -0.07, -0.03, 0, 0.03, 0.07, 0.12, 0.18 };
    static readonly double[] Speeds = { 620 };
    const double Nudge = 0.012;

    /** The careful bowler's roll (the web's chooseRoll). */
    void ChooseRoll(Alley a, out double bx, out double bAngle, out double bSpeed)
    {
        double cx = (LaneL + LaneR) / 2;
        bx = cx; bAngle = 0; bSpeed = 600;
        double bestV = double.NegativeInfinity;
        foreach (double dx in Xs)
            foreach (double angle in Angles)
                foreach (double speed in Speeds)
                {
                    double v = 0;
                    foreach (double da in new[] { 0, -Nudge, Nudge })
                    {
                        var s = a.Copy();
                        Roll(s, cx + dx, angle + da, speed);
                        var ev = RunRoll(s);
                        v += ev.down * 10 + (ev.strike ? StrikeBonus * 10 : 0) + (ev.spare ? SpareBonus * 10 : 0);
                    }
                    if (v > bestV) { bestV = v; bx = cx + dx; bAngle = angle; bSpeed = speed; }
                }
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, ballObj, aimBall;
    Transform[] pinObj;
    Transform[] aimDots;
    Bursts sparkle;
    Synth synth;
    bool showStages, keyed, dragging;
    int dragId;
    Vector2 dragFrom;
    double aimX = (LaneL + LaneR) / 2, aimAngle, aimSpeed = 560, acc;
    float bannerT; string banner;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.17f, 0.18f, 0.26f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.65f, 0.64f, 0.66f), 0.8f, 55f, -20f);
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
        st = PinRollStages.All[stageIdx];
        al = NewAlley();
        starsWon = 0; keyed = false; dragging = false; acc = 0; bannerT = 0f;
        aimX = (LaneL + LaneR) / 2; aimAngle = 0; aimSpeed = 560;
        botFor = -1;
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Lane").transform;
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
        float l = (float)LaneL, r = (float)LaneR;
        Box("Floor", OiyoArcade.Lit(new Color(0.17f, 0.18f, 0.26f), 0.1f), 180f, 300f, 1200f, 1800f, 1f, 0.2f);
        Box("Gutters", OiyoArcade.Lit(new Color(0.29f, 0.31f, 0.34f), 0.3f), (l + r) / 2f, 315f, r - l + 44f, 450f, 0.2f, 0.3f);
        Box("Lane", OiyoArcade.Lit(new Color(0.91f, 0.72f, 0.45f), 0.6f), (l + r) / 2f, 315f, r - l, 450f, 0.05f, 0.3f);
        var board = OiyoArcade.Lit(new Color(0.83f, 0.63f, 0.36f), 0.5f);
        for (float x = l + 14f; x < r; x += 14f) Box("Board", board, x, 315f, 2f, 450f, -0.11f, 0.02f);
        var arrow = OiyoArcade.Lit(new Color(0.79f, 0.16f, 0.16f), 0.3f);
        for (int k = 0; k < 5; k++) Box("Arrow", arrow, l + 17f + k * 28f, 365f, 6f, 10f, -0.12f, 0.02f);
        Box("Foul", OiyoArcade.Lit(new Color(0.13f, 0.15f, 0.16f), 0.3f), (l + r) / 2f, (float)Foul + 18f, r - l, 3f, -0.12f, 0.02f);
        var postMat = OiyoArcade.Lit(new Color(1f, 0.57f, 0.17f), 0.5f);
        for (int k = 0; k < st.posts.Length / 2; k++)
        {
            var p = OiyoArcade.Prim(PrimitiveType.Cylinder, "Post", postMat, root).transform;
            p.localScale = new Vector3(OiyoField.U(18f), OiyoField.U(14f), OiyoField.U(18f));
            p.rotation = Quaternion.Euler(-90f, 0f, 0f);
            p.position = field.W(st.posts[2 * k], st.posts[2 * k + 1], -0.35f);
        }
        var pinMat = OiyoArcade.Lit(new Color(0.97f, 0.97f, 0.98f), 0.7f);
        var neck = OiyoArcade.Lit(new Color(0.88f, 0.19f, 0.19f), 0.4f);
        pinObj = new Transform[10];
        for (int k = 0; k < 10; k++)
        {
            pinObj[k] = new GameObject("Pin").transform;
            pinObj[k].SetParent(root, false);
            var body = OiyoArcade.Prim(PrimitiveType.Sphere, "Body", pinMat, pinObj[k]).transform;
            body.localScale = Vector3.one * OiyoField.U(14f);
            var band = OiyoArcade.Prim(PrimitiveType.Cube, "Band", neck, pinObj[k]).transform;
            band.localScale = new Vector3(OiyoField.U(12f), OiyoField.U(2.5f), OiyoField.U(4f));
            band.localPosition = new Vector3(0f, 0f, -OiyoField.U(6f));
        }
        var ballMat = OiyoArcade.Lit(new Color(0.23f, 0.36f, 0.86f), 0.9f);
        ballObj = OiyoArcade.Prim(PrimitiveType.Sphere, "Ball", ballMat, root).transform;
        ballObj.localScale = Vector3.one * OiyoField.U(24f);
        aimBall = OiyoArcade.Prim(PrimitiveType.Sphere, "AimBall", ballMat, root).transform;
        aimBall.localScale = Vector3.one * OiyoField.U(24f);
        aimDots = new Transform[16];
        var dot = OiyoArcade.Glow(new Color(1f, 1f, 1f, 0.85f));
        for (int k = 0; k < aimDots.Length; k++) aimDots[k] = Box("Aim", dot, 0f, 0f, 4f, 4f, -0.4f, 0.02f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("pin-roll", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing && al.ball != null)
        {
            acc += dt;
            while (acc >= DT && al.ball != null)
            {
                acc -= DT;
                var ev = Step(al);
                if (ev == null) continue;
                acc = 0;
                var e = ev.Value;
                if (e.strike) { banner = U("Strike!"); bannerT = 1.2f; }
                else if (e.spare) { banner = U("Spare!"); bannerT = 1.2f; }
                if (e.down > 0)
                {
                    sparkle.Emit(field.W(180f, (float)HeadY - 30f, -0.8f), e.strike ? new Color(1f, 0.83f, 0.23f) : Color.white, e.strike ? 30 : 8 + e.down, 3f, 0.07f, 0.6f);
                    synth.Tone(e.strike || e.spare ? 988f : 523f, 0.12f, Wave.Triangle, 0.15f);
                }
                else synth.Tone(196f, 0.12f, Wave.Square, 0.08f);
                if (al.over) End();
            }
        }
        bannerT = Mathf.Max(0f, bannerT - dt);
        Animate();
    }

    void Throw(double x, double angle, double speed)
    {
        if (state != GameState.Playing || al.over || al.ball != null) return;
        if (Roll(al, x, angle, speed)) synth.Tone(330f, 0.05f, Wave.Triangle, 0.12f);
    }

    double DragLen(Vector2 screen)
    {
        if (!field.ToField(screen, out Vector2 f)) return 0;
        double dx = f.x - dragFrom.x, dy = f.y - dragFrom.y, len = Math.Sqrt(dx * dx + dy * dy);
        if (dy < -4) { aimAngle = Math.Max(-0.45, Math.Min(0.45, Math.Atan2(dx, -dy))); aimSpeed = Math.Max(MinSpeed, Math.Min(MaxSpeed, len * Pull)); }
        return dy < -12 ? len : 0;
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
                    // input is read once per frame: press where the ball starts, flick up the lane
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        if (al.over || al.ball != null || !field.ToField(b.pos, out Vector2 f)) continue;
                        dragging = true; dragId = b.id; dragFrom = f;
                        aimX = Math.Max(LaneL + BallR, Math.Min(LaneR - BallR, f.x));
                    }
                    if (dragging)
                    {
                        foreach (var hp in OiyoArcade.Held()) if (hp.id == dragId) DragLen(hp.pos);
                        foreach (var e in OiyoArcade.Ended())
                        {
                            if (e.id != dragId) continue;
                            dragging = false;
                            if (DragLen(e.pos) >= 20) Throw(aimX, aimAngle, aimSpeed);
                        }
                    }
                    bool k = true;
                    if (Input.GetKeyDown(KeyCode.LeftArrow)) aimX = Math.Max(LaneL + BallR, aimX - 4);
                    else if (Input.GetKeyDown(KeyCode.RightArrow)) aimX = Math.Min(LaneR - BallR, aimX + 4);
                    else if (Input.GetKeyDown(KeyCode.A)) aimAngle = Math.Max(-0.45, aimAngle - 0.02);
                    else if (Input.GetKeyDown(KeyCode.D)) aimAngle = Math.Min(0.45, aimAngle + 0.02);
                    else if (Input.GetKeyDown(KeyCode.UpArrow)) aimSpeed = Math.Min(MaxSpeed, aimSpeed + 40);
                    else if (Input.GetKeyDown(KeyCode.DownArrow)) aimSpeed = Math.Max(MinSpeed, aimSpeed - 40);
                    else k = false;
                    if (k) { keyed = true; if (state == GameState.Ready) state = GameState.Playing; }
                    if (Input.GetKeyDown(KeyCode.Space) || confirm)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        else { keyed = true; Throw(aimX, aimAngle, aimSpeed); }
                    }
                    return;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm && ResultLive) LoadStage(al.won ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
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
        if (al.won)
        {
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, al.score, StageCount);
            sparkle.Emit(field.W(180f, 280f, -1f), new Color(1f, 0.85f, 0.25f), 40, 4f, 0.1f, 1f);
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
        field.Fit(56f, 10f, 0f, 90f, 540f);
        for (int k = 0; k < 10; k++)
        {
            var p = al.pins[k];
            pinObj[k].gameObject.SetActive(p.standing);
            pinObj[k].position = field.W((float)p.x, (float)p.y, -OiyoField.U(7f) - 0.12f);
            pinObj[k].localScale = p.hit ? new Vector3(1f, 0.6f, 1f) : Vector3.one;
        }
        var b = al.ball;
        ballObj.gameObject.SetActive(b != null);
        if (b != null)
        {
            ballObj.position = field.W((float)b.x, (float)b.y, -OiyoField.U(12f) - 0.12f + (b.gutter ? 0.2f : 0f));
            ballObj.Rotate(new Vector3((float)b.vy, -(float)b.vx, 0f) * 0.02f, Space.World);
        }
        bool aiming = state == GameState.Playing && b == null && !al.over;
        aimBall.gameObject.SetActive(aiming || state == GameState.Ready);
        aimBall.position = field.W((float)aimX, (float)Foul, -OiyoField.U(12f) - 0.12f);
        float len = 60f + (float)(aimSpeed / MaxSpeed) * 120f;
        for (int k = 0; k < aimDots.Length; k++)
        {
            float s = 20f + k * 12f;
            aimDots[k].gameObject.SetActive(aiming && (dragging || keyed) && s < len);
            aimDots[k].position = field.W((float)aimX + Mathf.Sin((float)aimAngle) * s, (float)Foul - Mathf.Cos((float)aimAngle) * s, -0.4f);
        }
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check, with the flick (screen px from
    // the top-left: press and let-go points) for the careful bowler's roll, once the lane is still.
    bool testLog; float testT; int botFor = -1; double botX, botAngle, botSpeed;
    void TestTick(float dt)
    {
        if (!testLog) return;
        if ((testT -= dt) > 0f) return;
        testT = 0.05f;
        string nx = "null";
        int key = al.frame * 2 + al.roll;
        if (state == GameState.Playing && !al.over && al.ball == null)
        {
            if (botFor != key) { ChooseRoll(al, out botX, out botAngle, out botSpeed); botFor = key; }
            float len = (float)(botSpeed / Pull);
            var a = cam.WorldToScreenPoint(field.W((float)botX, (float)Foul, 0f));
            var e = cam.WorldToScreenPoint(field.W((float)botX + Mathf.Sin((float)botAngle) * len, (float)Foul - Mathf.Cos((float)botAngle) * len, 0f));
            nx = $"[{a.x:F2},{Screen.height - a.y:F2},{e.x:F2},{Screen.height - e.y:F2}]";
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"rolls\":{key},\"score\":{al.score},\"need\":{st.need},\"par\":{st.par},\"next\":{nx},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(1f, 0.83f, 0.23f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.1f, 0.16f, 0.9f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Goal {0}", PinRollStages.All[i].need);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(1f, 0.93f, 0.8f), U("Pin Roll"),
                U("Press where the ball should start and flick it up the lane. Two rolls a frame; knock down enough pins over the frames. A strike scores a bonus."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 44f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 18f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("Frame {0}/{1}", Mathf.Min(al.frame + 1, st.frames), st.frames) + "   " + F("Score {0}/{1}", al.score, st.need), 15, new Color(1f, 0.93f, 0.8f));
        if (bannerT > 0f) OiyoArcade.Shadowed(new Rect(0f, h * 0.42f, w, 44f), banner, 30, new Color(1f, 0.83f, 0.23f), TextAnchor.MiddleCenter);
        if (OiyoArcade.Button(new Rect(w - 56f, 12f, 40f, 36f), "<b>II</b>", OiyoScreens.Slate, 16))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Flick up from where the ball should start!"), 120f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            string detail = al.won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("{0} points · {1} strikes", al.score, al.strikes)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, al.won, ResultLive, al.won ? U("Goal reached!") : U("Not enough points"), detail, body,
                al.won && stageIdx < StageCount - 1 ? U("Next stage") : null, al.won && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
