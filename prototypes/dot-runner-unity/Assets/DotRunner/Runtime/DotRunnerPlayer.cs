using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Dot Runner 3D: the web Dot Runner (src/components/games/DotRunner.tsx, src/lib/games/dot-runner.ts)
// rebuilt as a 30-stage Unity runner. One button: jump the blocks, grab the coins, run to the
// flag. The web feel in world units (1 unit = 50 px): run 300 px/s, gravity 0.5 px/frame^2,
// jump 10 px/frame, a 20 px dot, 20 px blocks 20-60 px tall; the run speeds up 8% every 10 s
// up to 1.4x. Here a short tap is a short hop and holding jumps full height. Each stage is a
// fixed course (seeded, so it can be learned) that ends at a flag; new hazards arrive every
// five stages: tall and double blocks, gaps in the track, low bars to stay under, blocks that
// slide toward you, then all of it faster. One hit ends the run, as on the web.
// Stars come from the share of coins collected.
public class DotRunnerPlayer : MonoBehaviour
{
    const string Slug = "dot-runner";
    const int StageCount = 30;
    const float Size = 0.4f, Gravity = 36f, JumpV = 12f, RunSpeed = 6f, CutJump = 0.45f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    enum Kind { Block, Pit, Bar, Slider }
    class Thing { public Kind kind; public float x, w, h, y, vx; public Transform t; }
    class Coin { public float x, y; public bool taken; public Transform t; }
    static readonly string[] ZoneNames = { "Night track", "Twin blocks", "Broken track", "Low bridges", "Rush hour", "Last lap" };
    static readonly Color[] ZoneColor = { new Color(0.37f, 0.95f, 1f), new Color(0.6f, 1f, 0.55f), new Color(1f, 0.75f, 0.35f), new Color(1f, 0.5f, 0.85f), new Color(0.65f, 0.55f, 1f), new Color(1f, 0.4f, 0.35f) };

    int stageIdx;
    float goal;                 // flag distance (units)
    readonly List<Thing> things = new List<Thing>();
    readonly List<Coin> coins = new List<Coin>();
    float px, py, vy, runTime, distanceScore;
    bool grounded, jumpHeld;
    int coinCount, score, stars;
    string endReason = "";
    string popup = ""; float popupTimer; Color popupColor;

    Camera cam;
    Transform root, dot, flag, sky;
    Material dotMat;
    TrailRenderer trail;
    Bursts bursts;
    Synth synth;
    bool showStages;
    float shake, squash;

    float BaseSpeed => RunSpeed * (1f + stageIdx * 0.012f);
    // the web pace: +8% every 10 s, up to 1.4x
    float Pace => 1f + Mathf.Min(5, Mathf.FloorToInt(runTime / 10f)) * 0.08f;
    float Speed => BaseSpeed * Pace;
    int Zone => stageIdx / 5;

    void Awake()
    {
        Application.targetFrameRate = 60;
        SetupScene();
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        LoadStage(stageIdx, false);
    }

    void SetupScene()
    {
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 42f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.04f, 0.04f, 0.12f);
        cam.farClipPlane = 300f;
        cam.fieldOfView = 50f;
        var key = new GameObject("Key").AddComponent<Light>();
        key.type = LightType.Directional;
        key.intensity = 0.8f;
        key.color = new Color(0.85f, 0.85f, 1f);
        key.transform.rotation = Quaternion.Euler(40f, 30f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.4f, 0.38f, 0.55f);
        bursts = new Bursts(transform, 1f);
        synth = new Synth(gameObject);
    }

    // ---------------- Course ----------------
    void BuildCourse()
    {
        var rnd = new System.Random(9000 + stageIdx * 131);
        float R(float a, float b) => a + (float)rnd.NextDouble() * (b - a);
        goal = 90f + stageIdx * 7f;
        things.Clear(); coins.Clear();
        float x = 9f;
        int z = Zone;
        while (x < goal - 6f)
        {
            // the gap needed to land and jump again grows with the speed reached by then
            float t = x / BaseSpeed;
            float sp = BaseSpeed * (1f + Mathf.Min(5, Mathf.FloorToInt(t / 10f)) * 0.08f);
            float minGap = sp * (z >= 5 ? 0.82f : 0.95f) + 1.2f;
            float roll = (float)rnd.NextDouble();
            Kind kind = Kind.Block;
            if (z >= 2 && roll < 0.22f) kind = Kind.Pit;
            else if (z >= 3 && roll < 0.42f) kind = Kind.Bar;
            else if (z >= 4 && roll < 0.58f) kind = Kind.Slider;
            switch (kind)
            {
                case Kind.Block:
                    {
                        bool tall = z >= 1 && rnd.NextDouble() < 0.35;
                        float h = tall ? R(0.95f, 1.2f) : R(0.4f, 0.8f + z * 0.05f);
                        things.Add(new Thing { kind = Kind.Block, x = x, w = 0.4f, h = h });
                        if (z >= 1 && !tall && rnd.NextDouble() < 0.3)
                        {
                            things.Add(new Thing { kind = Kind.Block, x = x + 0.75f, w = 0.4f, h = R(0.4f, 0.7f) });
                            x += 0.75f;
                        }
                        // an arc of coins over the jump
                        for (int k = -2; k <= 2; k++) coins.Add(new Coin { x = x + 0.2f + k * 0.55f, y = 1.75f - Mathf.Abs(k) * 0.35f });
                        break;
                    }
                case Kind.Pit:
                    {
                        float w = R(1.1f, 1.6f + Mathf.Min(0.4f, (z - 2) * 0.1f));
                        things.Add(new Thing { kind = Kind.Pit, x = x, w = w, h = 0f });
                        for (int k = 0; k < 3; k++) coins.Add(new Coin { x = x + w * (0.2f + k * 0.3f), y = 1.4f + (k == 1 ? 0.3f : 0f) });
                        x += w;
                        break;
                    }
                case Kind.Bar:
                    {
                        // a low bridge: stay on the ground and run under it
                        float w = R(1.2f, 2.4f);
                        things.Add(new Thing { kind = Kind.Bar, x = x, w = w, y = 0.62f, h = 0.5f });
                        for (int k = 0; k < 3; k++) coins.Add(new Coin { x = x + w * (0.2f + k * 0.3f), y = 0.22f });
                        x += w;
                        break;
                    }
                case Kind.Slider:
                    {
                        things.Add(new Thing { kind = Kind.Slider, x = x + 3f, w = 0.45f, h = R(0.4f, 0.6f), vx = -R(1.5f, 2.5f) });
                        coins.Add(new Coin { x = x - 1f, y = 0.22f });
                        coins.Add(new Coin { x = x - 0.5f, y = 0.22f });
                        break;
                    }
            }
            // a few loose coins on the run-up
            if (rnd.NextDouble() < 0.5) coins.Add(new Coin { x = x + minGap * 0.55f, y = 0.22f });
            x += minGap + R(0f, 2.6f - z * 0.25f);
        }
    }

    void BuildScene()
    {
        var accent = ZoneColor[Zone];
        sky = OiyoArcade.Prim(PrimitiveType.Quad, "Skyline", OiyoArcade.Transparent(OiyoArcade.Art("DR/skyline"), new Color(0.75f, 0.75f, 0.85f)), root).transform;
        sky.localScale = new Vector3(80f, 40f, 1f);
        var trackMat = OiyoArcade.Lit(Color.white, 0.5f, OiyoArcade.Art("DR/track", true));
        var edgeMat = OiyoArcade.Glow(accent);
        // ground in pieces, leaving the pits open
        var pits = new List<Thing>();
        foreach (var t in things) if (t.kind == Kind.Pit) pits.Add(t);
        float start = -12f;
        foreach (var p in pits) { Ground(start, p.x, trackMat, edgeMat); start = p.x + p.w; }
        Ground(start, goal + 30f, trackMat, edgeMat);
        var blockMat = OiyoArcade.LitGlow(new Color(0.85f, 0.15f, 0.25f), new Color(0.2f, 0.02f, 0.05f), 0.6f);
        var barMat = OiyoArcade.LitGlow(new Color(0.9f, 0.3f, 0.75f), new Color(0.15f, 0.03f, 0.12f), 0.6f);
        var sliderMat = OiyoArcade.LitGlow(new Color(1f, 0.5f, 0.15f), new Color(0.2f, 0.08f, 0f), 0.6f);
        foreach (var t in things)
        {
            if (t.kind == Kind.Pit) continue;
            var mat = t.kind == Kind.Bar ? barMat : t.kind == Kind.Slider ? sliderMat : blockMat;
            var b = OiyoArcade.Prim(PrimitiveType.Cube, t.kind.ToString(), mat, root);
            b.transform.localScale = new Vector3(t.w, t.h, 0.9f);
            t.t = b.transform;
            if (t.kind == Kind.Bar)
            {
                for (int s = 0; s < 2; s++)
                {
                    var post = OiyoArcade.Prim(PrimitiveType.Cube, "Post", OiyoArcade.Lit(new Color(0.3f, 0.25f, 0.4f), 0.3f), b.transform);
                    post.transform.localScale = new Vector3(0.12f / t.w, (t.y + t.h) / t.h, 0.12f / 0.9f);
                    post.transform.localPosition = new Vector3(0f, -(t.y) / t.h * 0.5f - 0.0f, s == 0 ? 0.6f : -0.6f);
                }
            }
            var g = OiyoArcade.GlowQuad("Glow", new Color(mat.color.r, mat.color.g, mat.color.b, 0.35f), 1.4f, root);
            g.transform.SetPositionAndRotation(new Vector3(t.x + t.w * 0.5f, 0.01f, 0f), Quaternion.Euler(90f, 0f, 0f));
        }
        var coinMat = OiyoArcade.Transparent(OiyoArcade.Art("DR/coin"), Color.white);
        foreach (var c in coins)
        {
            var q = OiyoArcade.Prim(PrimitiveType.Quad, "Coin", coinMat, root);
            q.transform.localScale = Vector3.one * 0.32f;
            q.transform.position = new Vector3(c.x, c.y, 0f);
            c.t = q.transform;
        }
        // finish flag
        flag = new GameObject("Flag").transform;
        flag.SetParent(root, false);
        flag.position = new Vector3(goal, 0f, 0f);
        var pole = OiyoArcade.Prim(PrimitiveType.Cylinder, "Pole", OiyoArcade.Lit(new Color(0.9f, 0.9f, 0.95f), 0.8f, null, 0.5f), flag);
        pole.transform.localScale = new Vector3(0.06f, 1.3f, 0.06f);
        pole.transform.localPosition = new Vector3(0f, 1.3f, 0.5f);
        var cloth = OiyoArcade.Prim(PrimitiveType.Cube, "Cloth", OiyoArcade.Glow(accent), flag);
        cloth.transform.localScale = new Vector3(0.7f, 0.45f, 0.02f);
        cloth.transform.localPosition = new Vector3(0.36f, 2.3f, 0.5f);
        var arch = OiyoArcade.Prim(PrimitiveType.Cube, "Line", OiyoArcade.Glow(Color.white), flag);
        arch.transform.localScale = new Vector3(0.1f, 0.02f, 1.3f);
        arch.transform.localPosition = new Vector3(0f, 0.005f, 0f);

        dot = new GameObject("Dot").transform;
        dot.SetParent(root, false);
        dotMat = OiyoArcade.Glow(new Color(0.95f, 1f, 1f));
        var body = OiyoArcade.Prim(PrimitiveType.Cube, "Body", dotMat, dot);
        body.transform.localScale = Vector3.one * Size;
        body.transform.localPosition = new Vector3(0f, Size * 0.5f, 0f);
        var halo = OiyoArcade.GlowQuad("Halo", new Color(accent.r, accent.g, accent.b, 0.55f), 1.3f, dot);
        halo.transform.localPosition = new Vector3(0f, Size * 0.5f, 0.05f);
        trail = body.AddComponent<TrailRenderer>();
        trail.time = 0.25f;
        trail.startWidth = Size * 0.9f;
        trail.endWidth = 0f;
        trail.sharedMaterial = OiyoArcade.Transparent(OiyoArcade.GlowTexture(), new Color(accent.r, accent.g, accent.b, 0.7f));
        trail.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
    }

    void Ground(float from, float to, Material mat, Material edge)
    {
        if (to - from < 0.05f) return;
        var g = OiyoArcade.Prim(PrimitiveType.Cube, "Track", mat, root);
        g.transform.position = new Vector3((from + to) * 0.5f, -0.5f, 0f);
        g.transform.localScale = new Vector3(to - from, 1f, 1.4f);
        g.GetComponent<Renderer>().sharedMaterial.mainTextureScale = new Vector2(1f, 1f);
        var e = OiyoArcade.Prim(PrimitiveType.Cube, "Edge", edge, root);
        e.transform.position = new Vector3((from + to) * 0.5f, 0.005f, -0.71f);
        e.transform.localScale = new Vector3(to - from, 0.03f, 0.04f);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Course").transform;
        BuildCourse();
        BuildScene();
        px = 0f; py = 0f; vy = 0f; grounded = true; jumpHeld = false;
        runTime = 0f; distanceScore = 0f;
        coinCount = score = stars = 0;
        endReason = ""; popup = "";
        showStages = false;
        state = ready ? GameState.Ready : GameState.Menu;
        Sync(0f);
        if (trail != null) trail.Clear();
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("dot-runner", state, score);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        ReadInput();
        if (state == GameState.Playing)
        {
            int n = Mathf.CeilToInt(dt / (1f / 120f));
            for (int i = 0; i < n && state == GameState.Playing; i++) Step(dt / n);
        }
        else if (state == GameState.Menu)
        {
            // the dot runs the first stretch behind the menu, hopping on its own
            px += dt * 4f; if (px > 30f) px = 0f;
            py = Mathf.Max(0f, Mathf.Sin(Time.time * 3f)) * 0.9f;
        }
        Sync(dt);
        UpdateCamera(dt);
    }

    bool PressedJump(out bool released)
    {
        released = Input.GetKeyUp(KeyCode.Space) || Input.GetKeyUp(KeyCode.UpArrow) || Input.GetKeyUp(KeyCode.W);
        bool key = Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.W);
        bool touch = OiyoArcade.Began().Count > 0;
        bool anyHeld = Input.GetKey(KeyCode.Space) || Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.W);
        foreach (var p in OiyoArcade.Held()) if (!OiyoArcade.OverUi(p.pos)) anyHeld = true;
        if (jumpHeld && !anyHeld && !key && !touch) released = true;
        return key || touch;
    }

    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
                // the first tap starts the run and is a jump
                if (PressedJump(out _)) { state = GameState.Playing; Jump(); }
                return;
            case GameState.Playing:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) { state = GameState.Paused; return; }
                bool press = PressedJump(out bool released);
                if (press) Jump();
                if (released && jumpHeld) { jumpHeld = false; if (vy > 0f) vy *= CutJump; }
                return;
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm || Input.GetKeyDown(KeyCode.Space)) LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                return;
            case GameState.Menu:
                if (!showStages && (confirm || Input.GetKeyDown(KeyCode.Space))) LoadStage(stageIdx);
                return;
        }
    }

    float jumpBuffer;
    void Jump()
    {
        if (!grounded) { jumpBuffer = 0.12f; return; }
        vy = JumpV; grounded = false; jumpHeld = true;
        squash = -0.25f;
        synth.Tone(520f, 0.09f, Wave.Square, 0.16f, 900f, 14f);
    }

    bool OverPit(float x)
    {
        foreach (var t in things)
            if (t.kind == Kind.Pit && x + Size * 0.25f > t.x && x + Size * 0.75f < t.x + t.w) return true;
        return false;
    }

    void Step(float dt)
    {
        runTime += dt;
        px += Speed * dt;
        distanceScore += Speed * dt;
        jumpBuffer -= dt;
        float wasY = py;
        vy -= Gravity * dt;
        py += vy * dt;
        bool pit = OverPit(px);
        // land when this step crossed the track top (a fast fall can cross it by more than a hair)
        if (py <= 0f && !pit && wasY >= -0.02f)
        {
            if (!grounded) { squash = 0.25f; bursts.Emit(new Vector3(px + Size * 0.5f, 0.05f, 0f), new Color(0.6f, 0.95f, 1f), 6, 1.2f, 0.1f, 0.3f); }
            py = 0f; vy = 0f; grounded = true;
            if (jumpBuffer > 0f) Jump();
        }
        else if (py < 0f) grounded = false;
        // dropped into a gap: the far wall of the gap, or the bottom, ends the run
        if (py < -1.5f || (wasY < -0.02f && !pit)) { Crash(U("You fell through a gap in the track.")); return; }
        foreach (var t in things)
        {
            if (t.kind == Kind.Slider) t.x += t.vx * dt;
            if (t.kind == Kind.Pit) continue;
            float bottom = t.kind == Kind.Bar ? t.y : 0f;
            const float give = 0.06f;
            if (px + Size - give > t.x && px + give < t.x + t.w && py + give < bottom + t.h && py + Size - give > bottom)
            {
                Crash(t.kind == Kind.Bar ? U("You jumped into a low bridge.") : U("You hit a block."));
                return;
            }
        }
        foreach (var c in coins)
        {
            if (c.taken) continue;
            if (Mathf.Abs(c.x - (px + Size * 0.5f)) < 0.36f && Mathf.Abs(c.y - (py + Size * 0.5f)) < 0.4f)
            {
                c.taken = true; coinCount++;
                c.t.gameObject.SetActive(false);
                bursts.Emit(new Vector3(c.x, c.y, 0f), new Color(1f, 0.85f, 0.3f), 8, 2f, 0.12f, 0.35f);
                synth.Tone(1320f + (coinCount % 5) * 90f, 0.07f, Wave.Square, 0.12f, 0f, 20f);
            }
        }
        if (px >= goal) Win();
    }

    // the web scores survival and coins; here 2 points a metre plus 10 a coin
    int Score => Mathf.FloorToInt(distanceScore * 2f) + coinCount * 10;

    void Crash(string why)
    {
        endReason = why;
        score = Score;
        state = GameState.GameOver;
        shake = 0.35f;
        bursts.Emit(new Vector3(px + Size * 0.5f, py + Size * 0.5f, 0f), Color.white, 30, 4f, 0.2f, 0.7f);
        synth.Tone(160f, 0.4f, Wave.Saw, 0.25f, 60f, 5f);
    }

    void Win()
    {
        int total = coins.Count;
        float share = total > 0 ? coinCount / (float)total : 1f;
        stars = 1 + (share >= 0.45f ? 1 : 0) + (share >= 0.8f ? 1 : 0);
        score = Score + stars * 100 + stageIdx * 10;
        state = GameState.Victory;
        OiyoArcade.Record(Slug, stageIdx, stars, score, StageCount);
        bursts.Emit(flag.position + Vector3.up * 2f, ZoneColor[Zone], 50, 5f, 0.25f, 1f);
        StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
    }

    void Popup(string t, Color c) { popup = t; popupColor = c; popupTimer = 0.9f; }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.2f, Wave.Triangle, 0.3f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    // ---------------- View ----------------
    void Sync(float dt)
    {
        popupTimer -= dt;
        if (dot == null) return;
        squash = Mathf.MoveTowards(squash, 0f, dt * 2f);
        dot.position = new Vector3(px, py, 0f);
        dot.localScale = new Vector3(1f + squash * 0.6f, 1f - squash, 1f);
        if (!grounded && state == GameState.Playing) dot.GetChild(0).Rotate(0f, 0f, -540f * dt);
        else dot.GetChild(0).localRotation = Quaternion.identity;
        foreach (var t in things)
        {
            if (t.t == null) continue;
            float bottom = t.kind == Kind.Bar ? t.y : 0f;
            t.t.position = new Vector3(t.x + t.w * 0.5f, bottom + t.h * 0.5f, 0f);
        }
        foreach (var c in coins) if (c.t != null && !c.taken) c.t.rotation = Quaternion.Euler(0f, Time.time * 160f + c.x * 20f, 0f);
    }

    void UpdateCamera(float dt)
    {
        // a three-quarter chase view: behind and to the side of the dot, looking down the track,
        // so a phone held upright still sees the next few obstacles coming
        bool portrait = cam.aspect < 1f;
        var focus = new Vector3(px + (portrait ? 4f : 5f), portrait ? 0.4f : 0.5f, 0f);
        var pos = portrait ? new Vector3(px - 5f, 2.4f, -2.2f) : new Vector3(px - 4.5f, 2.6f, -4.5f);
        if (shake > 0f) { pos += Random.insideUnitSphere * shake * 0.3f; shake = Mathf.MoveTowards(shake, 0f, dt); }
        cam.transform.position = pos;
        cam.transform.rotation = Quaternion.LookRotation(focus - pos);
        if (sky != null)
        {
            // the skyline is a far backdrop that always faces the camera
            sky.position = pos + cam.transform.forward * 70f + Vector3.up * 6f;
            sky.rotation = cam.transform.rotation;
            sky.localScale = new Vector3(150f, 75f, 1f);
        }
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.2f, 0.7f, 0.85f, 0.97f);
    static readonly Color Dark = new Color(0.03f, 0.03f, 0.1f, 0.84f);
    static readonly Color Gold = new Color(1f, 0.8f, 0.25f, 0.97f);
    static readonly Color Slate = new Color(0.18f, 0.18f, 0.32f, 0.95f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + U(ZoneNames[i / 5]);

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        var bar = new Rect(8f, 8f, w - 16f, 58f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 140f, 24f), "<b>" + StageTitle(stageIdx) + "</b>", 16, new Color(0.7f, 0.95f, 1f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 140f, 24f), $"{U("Coins")} <b>{coinCount}/{coins.Count}</b>  {U("Score")} <b>{Score}</b>  <color=#9ff3ff>»x{Pace:0.00}</color>", 14, Color.white);
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        OiyoArcade.Bar(new Rect(16f, 70f, w - 32f, 8f), px / goal, new Color(0f, 0f, 0f, 0.4f), ZoneColor[Zone]);
        OiyoArcade.Text(new Rect(16f, 80f, w - 32f, 18f), $"{Mathf.FloorToInt(px)} / {Mathf.FloorToInt(goal)} m", 12, new Color(1f, 1f, 1f, 0.7f));
        if (state == GameState.Ready)
        {
            var r = new Rect(w * 0.5f - 175f, h - 150f, 350f, 104f);
            OiyoArcade.Panel(r, Dark);
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 8f, r.width - 24f, r.height - 16f),
                $"<b>{U("Tap, click or press Space to jump")}</b>\n<size=14>{U("A short tap hops, holding jumps higher. Run to the flag.")}</size>", 16, Color.white, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Paused) DrawPause(w, h);
        if (state == GameState.Victory || state == GameState.GameOver) DrawResult(w, h);
    }

    void DrawMenu(float w, float h)
    {
        if (showStages)
        {
            float bw = Mathf.Min(w - 16f, 760f);
            var box = new Rect(w * 0.5f - bw * 0.5f, 12f, bw, h - 24f);
            OiyoArcade.Panel(box, new Color(0.03f, 0.03f, 0.1f, 0.94f));
            OiyoArcade.Text(new Rect(box.x + 16f, box.y + 12f, box.width - 120f, 30f), "<b>" + U("Choose a stage") + "</b>", 20, Color.white);
            OiyoArcade.Text(new Rect(box.x + 16f, box.y + 40f, box.width - 32f, 22f), $"★ {OiyoArcade.TotalStars(Slug, StageCount)}/{StageCount * 3}", 15, Gold);
            if (OiyoArcade.Button(new Rect(box.xMax - 100f, box.y + 12f, 86f, 40f), U("Back"), Slate, 16)) showStages = false;
            int pick = OiyoArcade.StageGrid(new Rect(box.x + 14f, box.y + 70f, box.width - 28f, box.height - 84f), Slug, StageCount, Accent, U("Stage"));
            if (pick >= 0) LoadStage(pick);
            return;
        }
        float cw = Mathf.Min(380f, w - 24f);
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - 170f, cw, 340f);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("Dot Runner 3D"), 30, new Color(0.7f, 0.95f, 1f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 62f, cw - 40f, 46f), U("One button runner. Jump the blocks, grab the coins and reach the flag."), 15, new Color(1f, 1f, 1f, 0.85f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x, card.y + 110f, cw, 24f), StageTitle(stageIdx), 15, Gold, TextAnchor.MiddleCenter);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 142f, cw - 48f, 58f), "<b>▶ " + F("Play stage {0}", stageIdx + 1) + "</b>", Accent, 21)) LoadStage(stageIdx);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 210f, cw - 48f, 46f), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}", Slate, 17)) showStages = true;
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 266f, cw - 48f, 46f), "Aa  " + OiyoArcade.Lang.ToUpperInvariant(), Slate, 17)) OiyoArcade.NextLang();
    }

    void DrawPause(float w, float h)
    {
        float cw = Mathf.Min(340f, w - 24f);
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - 130f, cw, 260f);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 16f, cw, 36f), U("Paused"), 26, Color.white, TextAnchor.MiddleCenter);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 70f, cw - 48f, 52f), "▶ " + U("Resume"), Accent, 19)) state = GameState.Playing;
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 132f, cw - 48f, 46f), U("Restart"), Slate, 17)) LoadStage(stageIdx);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 188f, cw - 48f, 46f), U("Stage list"), Slate, 17)) { LoadStage(stageIdx, false); showStages = true; }
    }

    void DrawResult(float w, float h)
    {
        bool won = state == GameState.Victory;
        float cw = Mathf.Min(360f, w - 24f);
        float ch = 158f + (won ? 58f : 0f) + 52f + 40f + 18f;
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - ch * 0.5f, cw, ch);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 14f, cw, 38f), won ? U("Stage clear!") : U("Game over"), 28, won ? new Color(0.6f, 1f, 0.65f) : new Color(1f, 0.55f, 0.5f), TextAnchor.MiddleCenter);
        string detail = won ? $"<size=30>{OiyoArcade.StarString(stars)}</size>" : endReason;
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 56f, cw - 32f, 44f), detail, 16, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 100f, cw - 32f, 48f),
            $"{U("Score")} <b>{score}</b>   {U("Coins")} <b>{coinCount}/{coins.Count}</b>\n<size=14>{Mathf.FloorToInt(Mathf.Min(px, goal))} / {Mathf.FloorToInt(goal)} m</size>", 16, Color.white, TextAnchor.MiddleCenter);
        float y = card.y + 158f;
        if (won && stageIdx < StageCount - 1)
        {
            if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 50f), "<b>" + U("Next stage") + " ▶</b>", Accent, 19)) LoadStage(stageIdx + 1);
            y += 58f;
        }
        else if (won)
        {
            OiyoArcade.Text(new Rect(card.x, y, cw, 50f), "★ " + U("You cleared all 30 stages!") + " ★", 17, Gold, TextAnchor.MiddleCenter);
            y += 58f;
        }
        if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 44f), U("Retry"), won ? Slate : Accent, 17)) LoadStage(stageIdx);
        y += 52f;
        if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 40f), U("Stage list"), Slate, 16)) { LoadStage(stageIdx, false); showStages = true; }
    }
}
