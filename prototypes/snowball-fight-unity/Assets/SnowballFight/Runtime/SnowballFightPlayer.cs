using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Snowball Fight 3D: the web Snowball Fight (src/components/games/SnowballFight.tsx,
// src/lib/games/snowball-fight.ts) rebuilt in Unity, solo stages. The rules are the web's, in its own
// 360 x 600 px side view: pull back and let go to throw (velocity = -drag x 4.2, at most 680 px/s,
// gravity 620, the stage's wind along x), you stand up only while aiming, the hill kids pop up from
// behind their walls on their own timers and lob back, snow walls are 6 px blocks that crumble where
// a ball lands, and once your wall is gone you are hit even while ducking. The 30 stages (hill,
// forts, kids, wind, hearts) are the web's own (SnowballFightStages.cs). The web's two-player mode
// stays in the quick-play tab. Keyboard: hold Space to aim, arrows tilt and power the throw.
public class SnowballFightPlayer : MonoBehaviour
{
    const string Slug = "snowball-fight";
    const int StageCount = 30;
    const float FW = 360f, FH = 600f, Block = 6f, Gravity = 620f, MaxSpeed = 680f, BallR = 4f;
    const float PlayerX = 46f, HandDy = 36f;
    const int Cols = 60, Rows = 100;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of snowball-fight.ts, solo) ----------------
    class Kid
    {
        public float x, feet, w = 20f, h = 44f; public int hp, maxHp; public bool up; public float timer, upTime, downTime, throwAt = -1f, aim, hitFlash; public int side;
        public Transform t; public Renderer r;
    }
    class Ball { public float x, y, vx, vy; public int side; public bool alive = true; public Transform t; }

    SnowballFightStages.Level level;
    int stageIdx;
    int[] ground;
    readonly bool[] snow = new bool[Cols * Rows];
    Kid player;
    readonly List<Kid> enemies = new List<Kid>();
    readonly List<Ball> balls = new List<Ball>();
    bool aiming;
    float cooldown, time;
    bool over; int winner = -1;
    System.Random rand;
    int starsWon;

    bool IsSnow(float x, float y)
    {
        int c = Mathf.FloorToInt(x / Block), r = Mathf.FloorToInt(y / Block);
        if (c < 0 || r < 0 || c >= Cols || r >= Rows) return false;
        return snow[r * Cols + c];
    }
    float GroundAt(float x) => ground[Mathf.Clamp(Mathf.FloorToInt(x / Block), 0, ground.Length - 1)];

    struct Box { public float x0, y0, x1, y1; }
    static Box KidBox(Kid k, bool standing)
    {
        float h = standing ? k.h : 26f;
        return new Box { x0 = k.x - k.w / 2f, y0 = k.feet - h, x1 = k.x + k.w / 2f, y1 = k.feet };
    }
    static Vector2 HandOf(Kid k) => new Vector2(k.x + (k.side == 0 ? 10f : -10f), k.feet - HandDy);

    static Vector2 VelocityFromDrag(float dx, float dy)
    {
        const float k = 4.2f;
        var v = new Vector2(-dx * k, -dy * k);
        float sp = v.magnitude;
        if (sp > MaxSpeed) v *= MaxSpeed / sp;
        return v;
    }

    bool Covered(Kid k)
    {
        int dir = k.side == 0 ? 1 : -1;
        for (float dx = 12f; dx <= 44f; dx += Block)
            for (float y = k.feet - 24f; y < k.feet - 2f; y += Block)
                if (IsSnow(k.x + dir * dx, y)) return true;
        return false;
    }

    bool StandingNow(Kid k) => k.side == 1 ? k.up || k.hp <= 0 : aiming || !Covered(k);

    bool ThrowBall(float vx, float vy)
    {
        if (over || cooldown > 0f || player.hp <= 0) return false;
        var h = HandOf(player);
        AddBall(h.x, h.y, vx, vy, 0);
        cooldown = 0.45f;
        return true;
    }

    void EnemyThrow(Kid e)
    {
        var h = HandOf(e);
        float tx = player.x + ((float)rand.NextDouble() - 0.5f) * e.aim * 2f;
        float ty = player.feet - 26f;
        float T = 0.9f + (float)rand.NextDouble() * 0.5f;
        float vx = (tx - h.x - 0.5f * level.wind * T * T) / T;
        float vy = (ty - h.y - 0.5f * Gravity * T * T) / T;
        AddBall(h.x, h.y, vx, vy, 1);
    }

    void Crumble(float x, float y, int radius = 2)
    {
        int c0 = Mathf.FloorToInt(x / Block), r0 = Mathf.FloorToInt(y / Block);
        for (int dr = -radius; dr <= radius; dr++)
            for (int dc = -radius; dc <= radius; dc++)
            {
                if (dr * dr + dc * dc > radius * radius + 1) continue;
                int c = c0 + dc, r = r0 + dr;
                if (c < 0 || r < 0 || c >= Cols || r >= Rows) continue;
                int i = r * Cols + c;
                if (snow[i]) { snow[i] = false; if (cubes.TryGetValue(i, out var cube)) { cube.gameObject.SetActive(false); } }
            }
    }

    void Step(float dt)
    {
        if (over) return;
        time += dt;
        cooldown = Mathf.Max(0f, cooldown - dt);
        player.hitFlash = Mathf.Max(0f, player.hitFlash - dt);
        foreach (var e in enemies) e.hitFlash = Mathf.Max(0f, e.hitFlash - dt);
        foreach (var e in enemies)
        {
            if (e.hp <= 0) continue;
            e.timer -= dt;
            if (e.timer <= 0f)
            {
                e.up = !e.up;
                e.timer = e.up ? e.upTime : e.downTime;
                if (e.up) { e.throwAt = e.upTime * (0.35f + (float)rand.NextDouble() * 0.4f); synth.Tone(700f, 0.05f, Wave.Square, 0.04f, 900f, 20f); }
            }
            if (e.up && e.throwAt >= 0f && e.upTime - e.timer >= e.throwAt)
            {
                e.throwAt = -1f;
                EnemyThrow(e);
                synth.Tone(330f, 0.08f, Wave.Noise, 0.06f, 0f, 18f);
            }
        }
        const int sub = 3;
        foreach (var b in balls)
        {
            if (!b.alive) continue;
            for (int s = 0; s < sub && b.alive; s++)
            {
                float h = dt / sub;
                b.vx += level.wind * h;
                b.vy += Gravity * h;
                b.x += b.vx * h;
                b.y += b.vy * h;
                if (b.x < -20f || b.x > FW + 20f || b.y > FH + 20f) { b.alive = false; break; }
                if (b.side == 0)
                {
                    foreach (var k in enemies)
                    {
                        if (!b.alive || k.hp <= 0 || !k.up) continue;
                        if (HitBox(b, KidBox(k, k.up))) { b.alive = false; k.hp -= 1; k.hitFlash = 0.5f; if (k.hp <= 0) k.up = true; OnHit(k, b); }
                    }
                }
                else if (player.hp > 0 && HitBox(b, KidBox(player, aiming || !Covered(player))))
                {
                    b.alive = false; player.hp -= 1; player.hitFlash = 0.5f; OnHit(player, b);
                }
                if (!b.alive) break;
                if (IsSnow(b.x, b.y)) { Crumble(b.x, b.y); b.alive = false; Splash(b.x, b.y); break; }
                if (b.y >= GroundAt(b.x)) { b.alive = false; Splash(b.x, GroundAt(b.x)); }
            }
        }
        for (int i = balls.Count - 1; i >= 0; i--)
            if (!balls[i].alive) { Destroy(balls[i].t.gameObject); balls.RemoveAt(i); }
        if (player.hp <= 0) { over = true; winner = 1; }
        else
        {
            bool all = true;
            foreach (var e in enemies) if (e.hp > 0) { all = false; break; }
            if (all) { over = true; winner = 0; }
        }
    }

    static bool HitBox(Ball b, Box box) => b.x + BallR > box.x0 && b.x - BallR < box.x1 && b.y + BallR > box.y0 && b.y - BallR < box.y1;

    int StarsFor()
    {
        int left = player.hp, hearts = level.hearts;
        if (left <= 0) return 0;
        if (left >= hearts) return 3;
        return left >= hearts - 1 ? 2 : 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Transform root;
    readonly Dictionary<int, Transform> cubes = new Dictionary<int, Transform>();
    readonly List<Transform> guide = new List<Transform>();
    readonly List<Transform> windStreaks = new List<Transform>();
    Material[] redMats, greenMats;
    Material groundMat, blockMat, blockTopMat, ballMat, guideMat, pineMat, hillsMat;
    Bursts puffs;
    Synth synth;
    bool showStages;
    const float Depth = 1.4f;

    static readonly Color[] Skies =
    {
        new Color(0.56f, 0.79f, 1f), new Color(0.65f, 0.71f, 0.99f), new Color(1f, 0.7f, 0.54f),
        new Color(0.36f, 0.42f, 0.77f), new Color(0.08f, 0.1f, 0.23f), new Color(0.04f, 0.06f, 0.15f),
    };

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(FW, FH, Skies[0]);
        OiyoField.Lights(new Color(0.6f, 0.64f, 0.72f), 0.75f, 35f, -35f);
        puffs = new Bursts(transform, 0.9f);
        synth = new Synth(gameObject);
        redMats = new[] { OiyoField.Sprite("SB/red_stand"), OiyoField.Sprite("SB/red_throw"), OiyoField.Sprite("SB/red_duck") };
        greenMats = new[] { OiyoField.Sprite("SB/green_stand"), OiyoField.Sprite("SB/green_throw"), OiyoField.Sprite("SB/green_duck") };
        groundMat = OiyoArcade.Lit(Color.white, 0.2f, OiyoArcade.Art("SB/snow", true));
        blockMat = OiyoArcade.Lit(new Color(0.88f, 0.93f, 0.98f), 0.3f, OiyoArcade.Art("SB/block", true));
        blockTopMat = OiyoArcade.Lit(Color.white, 0.35f, OiyoArcade.Art("SB/block", true));
        ballMat = OiyoArcade.Lit(Color.white, 0.5f);
        guideMat = OiyoArcade.Glow(new Color(0.88f, 0.19f, 0.19f));
        pineMat = OiyoField.Sprite("SB/pine");
        hillsMat = OiyoField.Sprite("SB/hills");
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void AddBall(float x, float y, float vx, float vy, int side)
    {
        var go = OiyoArcade.Prim(PrimitiveType.Sphere, "Ball", ballMat, root);
        go.transform.localScale = Vector3.one * OiyoField.U(BallR * 2.4f);
        balls.Add(new Ball { x = x, y = y, vx = vx, vy = vy, side = side, t = go.transform });
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        level = SnowballFightStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Field").transform;
        cubes.Clear(); guide.Clear(); windStreaks.Clear(); balls.Clear(); enemies.Clear();
        ground = (int[])level.ground.Clone();
        System.Array.Clear(snow, 0, snow.Length);
        for (int i = 0; i + 2 < level.snow.Length; i += 3)
            for (int r = level.snow[i + 1]; r < level.snow[i + 1] + level.snow[i + 2]; r++) snow[r * Cols + level.snow[i]] = true;
        player = new Kid { x = PlayerX, feet = level.playerFeet, hp = level.hearts, maxHp = level.hearts, side = 0 };
        for (int i = 0; i + 6 < level.enemies.Length; i += 7)
        {
            var e = level.enemies;
            enemies.Add(new Kid { x = e[i], feet = e[i + 1], hp = (int)e[i + 2], maxHp = (int)e[i + 2], upTime = e[i + 3], downTime = e[i + 4], timer = e[i + 5], aim = e[i + 6], side = 1 });
        }
        aiming = false; cooldown = 0f; time = 0f; over = false; winner = -1; starsWon = 0;
        rand = new System.Random(System.Environment.TickCount);
        drag = false; kbdAim = false;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Fit();
        Animate(0f);
    }

    void BuildScene()
    {
        field.Cam.backgroundColor = Skies[Mathf.Min(Skies.Length - 1, stageIdx / 5)];
        // far hills and a couple of pines behind the hill
        var hills = OiyoField.Quad("Hills", hillsMat, root, FW * 3.2f, 240f);
        hills.position = field.W(FW * 0.5f, 330f, 9f);
        var p1 = OiyoField.Quad("Pine", pineMat, root, 50f, 64f); p1.position = field.W(20f, 270f, 3f);
        var p2 = OiyoField.Quad("Pine", pineMat, root, 40f, 52f); p2.position = field.W(336f, 90f, 4f);
        if (stageIdx >= 20)
        {
            var rs = new System.Random(stageIdx);
            for (int i = 0; i < 30; i++)
            {
                var st = OiyoArcade.GlowQuad("Star", new Color(1f, 1f, 0.9f, 0.7f), OiyoField.U(4f + (float)rs.NextDouble() * 4f), root);
                st.transform.position = field.W(-200f + (float)rs.NextDouble() * (FW + 400f), -260f + (float)rs.NextDouble() * 420f, 10f);
            }
        }
        // the hill: one snowy column per 6 px, deep enough to read as a slope in 3D
        for (int c = 0; c < Cols; c++)
        {
            float g = ground[c];
            var col = OiyoArcade.Prim(PrimitiveType.Cube, "Ground", groundMat, root);
            float bottom = FH + 120f;
            col.transform.position = field.W(c * Block + Block * 0.5f, (g + bottom) * 0.5f, 0.3f);
            col.transform.localScale = new Vector3(OiyoField.U(Block) + 0.002f, OiyoField.U(bottom - g), Depth * 2.2f);
        }
        // side aprons so wide screens show snow, not sky, below the hill
        for (int s = -1; s <= 1; s += 2)
        {
            var ap = OiyoArcade.Prim(PrimitiveType.Cube, "Apron", groundMat, root);
            float g = s < 0 ? ground[0] : ground[Cols - 1];
            float x = s < 0 ? -FW * 0.75f : FW * 1.75f;
            ap.transform.position = field.W(x, (g + FH + 120f) * 0.5f, 0.3f);
            ap.transform.localScale = new Vector3(OiyoField.U(FW * 1.5f), OiyoField.U(FH + 120f - g), Depth * 2.2f);
        }
        for (int r = 0; r < Rows; r++)
            for (int c = 0; c < Cols; c++)
            {
                int i = r * Cols + c;
                if (!snow[i]) continue;
                bool top = r == 0 || !snow[i - Cols];
                var cube = OiyoArcade.Prim(PrimitiveType.Cube, "Snow", top ? blockTopMat : blockMat, root);
                cube.transform.position = field.W(c * Block + Block * 0.5f, r * Block + Block * 0.5f, 0f);
                cube.transform.localScale = new Vector3(OiyoField.U(Block), OiyoField.U(Block), Depth);
                cubes[i] = cube.transform;
            }
        player.t = OiyoField.Quad("Player", redMats[2], root, 30f, 55f);
        player.r = player.t.GetComponent<Renderer>();
        foreach (var e in enemies) { e.t = OiyoField.Quad("Kid", greenMats[2], root, 30f, 55f); e.r = e.t.GetComponent<Renderer>(); }
        for (int i = 0; i < 12; i++)
        {
            var g = OiyoArcade.Prim(PrimitiveType.Sphere, "Guide", guideMat, root);
            g.transform.localScale = Vector3.one * OiyoField.U(4.5f);
            g.SetActive(false);
            guide.Add(g.transform);
        }
        if (Mathf.Abs(level.wind) > 1f)
            for (int k = 0; k < 6; k++)
            {
                var s = OiyoArcade.Prim(PrimitiveType.Quad, "Wind", OiyoArcade.Transparent(OiyoArcade.GlowTexture(), new Color(1f, 1f, 1f, 0.6f)), root);
                windStreaks.Add(s.transform);
            }
    }

    void Fit()
    {
        bool portrait = field.Cam.aspect < 1f;
        // only the part of the field that holds the hill has to show
        float top = FH;
        foreach (var g in ground) top = Mathf.Min(top, g);
        float y0 = Mathf.Max(0f, top - 130f);
        field.Fit(portrait ? 100f : 90f, portrait ? 30f : 10f, -9f, y0, FH - 20f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("snowball-fight", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        Fit();
        ReadInput(dt);
        if (state == GameState.Playing)
        {
            Step(dt);
            if (over) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    void OnHit(Kid k, Ball b)
    {
        puffs.Emit(field.W(b.x, b.y, -0.3f), Color.white, 18, 3.5f, 0.28f, 0.5f);
        if (k.side == 1)
        {
            Toast(U("Got one!"), new Color(0.55f, 1f, 0.6f));
            synth.Tone(880f, 0.14f, Wave.Triangle, 0.2f, 1320f, 8f);
        }
        else
        {
            synth.Tone(200f, 0.25f, Wave.Square, 0.14f, 110f, 7f);
        }
    }

    void Splash(float x, float y)
    {
        puffs.Emit(field.W(x, y, -0.2f), new Color(0.93f, 0.96f, 1f), 7, 2.2f, 0.2f, 0.4f);
        synth.Tone(160f, 0.07f, Wave.Noise, 0.07f, 0f, 22f);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string s, Color c) { msg = s; msgT = 0.9f; msgC = c; }

    // pull-back aim: pointer press point and current point in field px
    bool drag; Vector2 dragFrom, dragTo; int dragId;
    bool kbdAim; float kbdAngle = 48f, kbdPower = 0.75f;
    void ReadInput(float dt)
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; drag = false; aiming = false; return; }
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (drag || !field.ToField(b.pos, out var p)) continue;
                        drag = true; dragId = b.id; dragFrom = p; dragTo = p;
                        if (state == GameState.Ready) state = GameState.Playing;
                    }
                    if (drag)
                    {
                        foreach (var h in OiyoArcade.Held()) if (h.id == dragId && field.ToField(h.pos, out var p)) dragTo = p;
                        foreach (var e in OiyoArcade.Ended())
                            if (e.id == dragId)
                            {
                                if (field.ToField(e.pos, out var p)) dragTo = p;
                                drag = false;
                                Fire(VelocityFromDrag(dragTo.x - dragFrom.x, dragTo.y - dragFrom.y));
                            }
                    }
                    // keyboard: Space stands and aims, arrows set the angle and power, release throws
                    if (Input.GetKeyDown(KeyCode.Space)) { kbdAim = true; if (state == GameState.Ready) state = GameState.Playing; }
                    if (kbdAim)
                    {
                        if (Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.W)) kbdAngle = Mathf.Min(85f, kbdAngle + 40f * dt);
                        if (Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.S)) kbdAngle = Mathf.Max(5f, kbdAngle - 40f * dt);
                        if (Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D)) kbdPower = Mathf.Min(1f, kbdPower + 0.5f * dt);
                        if (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A)) kbdPower = Mathf.Max(0.25f, kbdPower - 0.5f * dt);
                        if (Input.GetKeyUp(KeyCode.Space)) { kbdAim = false; Fire(KbdVelocity()); }
                    }
                    aiming = state == GameState.Playing && (drag || kbdAim);
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
                if (!showStages && (confirm || Input.GetKeyDown(KeyCode.Space))) LoadStage(stageIdx);
                return;
        }
    }

    Vector2 KbdVelocity()
    {
        float a = kbdAngle * Mathf.Deg2Rad, sp = kbdPower * MaxSpeed;
        return new Vector2(Mathf.Cos(a) * sp, -Mathf.Sin(a) * sp);
    }

    Vector2 AimVelocity() => drag ? VelocityFromDrag(dragTo.x - dragFrom.x, dragTo.y - dragFrom.y) : KbdVelocity();

    void Fire(Vector2 v)
    {
        if (state != GameState.Playing || v.magnitude < 140f) return;
        if (ThrowBall(v.x, v.y)) synth.Tone(520f, 0.06f, Wave.Noise, 0.08f, 0f, 16f);
    }

    float endTime;
    bool ResultLive => Time.unscaledTime - endTime > 0.45f;

    void End()
    {
        if (state != GameState.Playing) return;
        endTime = Time.unscaledTime;
        drag = false; aiming = false; kbdAim = false;
        if (winner == 0)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, player.hp, StageCount);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
        }
        else
        {
            state = GameState.GameOver;
            synth.Tone(220f, 0.6f, Wave.Triangle, 0.2f, 110f, 3f);
        }
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.18f, Wave.Triangle, 0.22f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void PlaceKid(Kid k, Material[] mats)
    {
        bool standing = StandingNow(k);
        int pose = standing ? ((k.side == 1 ? k.throwAt < 0f : aiming) ? 1 : 0) : 2;
        k.r.sharedMaterial = mats[pose];
        float hPx = pose == 2 ? 30f : 55f;
        k.t.localScale = new Vector3(OiyoField.U(30f) * (k.side == 1 ? -1f : 1f), OiyoField.U(hPx), 1f);
        k.t.position = field.W(k.x, k.feet - hPx * 0.5f + 1f, -0.05f);
        k.t.rotation = Quaternion.identity;
        bool down = k.hp <= 0;
        if (down)
        {
            k.r.sharedMaterial = mats[2];
            k.t.localScale = new Vector3(OiyoField.U(30f), OiyoField.U(30f), 1f);
            k.t.rotation = Quaternion.Euler(0f, 0f, k.side == 1 ? -90f : 90f);
            k.t.position = field.W(k.x, k.feet - 12f, -0.05f);
        }
        bool flash = k.hitFlash > 0f && Mathf.FloorToInt(k.hitFlash * 20f) % 2 == 0;
        k.t.gameObject.SetActive(!(flash) || down);
    }

    void Animate(float dt)
    {
        if (root == null) return;
        PlaceKid(player, redMats);
        foreach (var e in enemies) PlaceKid(e, greenMats);
        foreach (var b in balls)
        {
            b.t.position = field.W(b.x, b.y, -0.05f);
            b.t.Rotate(0f, 0f, -b.vx * dt, Space.World);
        }
        // aim guide: the web's predicted arc, every third step
        bool showGuide = state == GameState.Playing && aiming && player.hp > 0;
        int gi = 0;
        if (showGuide)
        {
            var v = AimVelocity();
            var h = HandOf(player);
            float x = h.x, y = h.y, vx = v.x, vy = v.y;
            const float step = 1f / 60f;
            int n = 0;
            for (float t = 0f; t < 0.55f && gi < guide.Count; t += step)
            {
                vx += level.wind * step; vy += Gravity * step; x += vx * step; y += vy * step;
                if (y >= GroundAt(x) || IsSnow(x, y)) break;
                if (n++ % 3 != 0) continue;
                guide[gi].gameObject.SetActive(true);
                guide[gi].position = field.W(x, y, -0.05f);
                gi++;
            }
        }
        for (; gi < guide.Count; gi++) guide[gi].gameObject.SetActive(false);
        for (int k = 0; k < windStreaks.Count; k++)
        {
            float span = FW + 60f;
            float x = Mathf.Repeat(time * (50f + Mathf.Abs(level.wind)) * Mathf.Sign(level.wind) + k * 97f, span) - 30f;
            var s = windStreaks[k];
            s.position = field.W(x, 60f + k * 48f + (FH - 600f), -0.6f);
            s.localScale = new Vector3(OiyoField.U(18f + Mathf.Abs(level.wind) / 4f), OiyoField.U(4f), 1f);
        }
    }

    // ?oiyotest=1 prints the run state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.1f;
        var sb = new System.Text.StringBuilder();
        foreach (var e in enemies)
        {
            if (sb.Length > 0) sb.Append(',');
            sb.Append($"[{e.x:F0},{e.feet:F0},{(e.up ? 1 : 0)},{e.hp}]");
        }
        var a = field.Cam.WorldToScreenPoint(field.W(0f, 300f));
        var a2 = field.Cam.WorldToScreenPoint(field.W(100f, 400f));
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{time:F1},\"hp\":{player.hp},\"cool\":{cooldown:F2},\"enemies\":[{sb}],\"wind\":{level.wind:F0},\"origin\":[{a.x:F0},{a.y:F0}],\"o2\":[{a2.x:F0},{a2.y:F0}],\"ppf\":{field.ScreenPerField():F3},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.85f, 0.28f, 0.06f, 0.97f);
    static readonly Color Dark = new Color(0.07f, 0.12f, 0.22f, 0.86f);
    static readonly Color Gold = new Color(1f, 0.82f, 0.25f, 0.97f);

    const string Heart = "♥";
    static string Repeat(string s, int n) { var sb = new System.Text.StringBuilder(); for (int i = 0; i < n; i++) sb.Append(s); return sb.ToString(); }

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} kids", SnowballFightStages.All[i].enemies.Length / 7);

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.85f, 0.95f, 1f), U("Snowball Fight"),
                U("Pull back and let go to lob snowballs up the hill. Kids only show while they peek, and so do you."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        int left = 0; foreach (var e in enemies) if (e.hp > 0) left++;
        string hearts = "<color=#ff6b6b>" + Repeat(Heart, player.hp) + "</color><color=#ffffff44>" + Repeat(Heart, player.maxHp - player.hp) + "</color>";
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>   " + hearts, 16, new Color(0.9f, 0.96f, 1f));
        string wind = Mathf.Abs(level.wind) > 1f ? $"   {U("Wind")} <b>{(level.wind < 0 ? "◀" : "▶")} {Mathf.Abs(level.wind):F0}</b>" : "";
        OiyoArcade.Text(new Rect(20f, 38f, w - 90f, 24f), F("{0} left", left) + wind, 16, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; drag = false; aiming = false; }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 78f, w - 16f, 36f), msg, 20, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Pull back and let go to throw"),
                U("You stand up only while aiming. Hit each kid when they peek over their wall.") + (level.wind != 0f ? "\n<color=#a5d8ff>" + U("Mind the wind!") + "</color>" : ""), 150f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("{0} left", left);
            string body = F("Hearts left {0}/{1}", Mathf.Max(0, player.hp), player.maxHp) + $"\n<size=14>{F("{0} s", time.ToString("F1"))}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("You took the hill!") : U("You got snowed"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
