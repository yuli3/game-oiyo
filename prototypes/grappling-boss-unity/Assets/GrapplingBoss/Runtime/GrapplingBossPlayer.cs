using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Grappling Boss 3D: the web Grappling Boss Arena (src/components/games/GrapplingBoss.tsx,
// src/lib/games/grappling-boss.ts) rebuilt as a 30-stage Unity boss fight. Press to fire the
// hook at the anchor nearest the point you pressed, swing on the rope, let go to slingshot
// along the swing; drag sideways for the jets, flick up to jump off the floor. The blaster
// fires at the Iron Gazer on its own while you are off the floor (on the web it fired all the
// time; here standing still would win the early fights, so the floor reloads). Every hit
// restores a little shield. The Gazer hovers, fires plasma bolts (fans of three later) and
// whips four jointed tentacles toward you; under half health it enrages.
// The web arena in world units (1 unit = 50 px): 16 x 10, gravity 460 px/s^2, jets 620/480
// px/s^2, jump 380 px/s, slingshot +120 px/s, bolts 640 px/s for 28, the web's 20 boss tiers
// spread over 30 stages. Every five stages the hall changes: high rafters, a burning floor,
// anchors that swing on their chains, a shield that comes and goes, then all of it.
// Stars come from the shield left at the end.
public class GrapplingBossPlayer : MonoBehaviour
{
    const string Slug = "grappling-boss";
    const int StageCount = 30;
    const float WallX = 7.4f, Ceil = 9.8f, G = 9.2f, JetFree = 12.4f, JetHooked = 9.6f, JumpV = 7.6f, Sling = 2.4f;
    const float Drag = 0.2f, WireDamp = 0.35f, HookRange = 9.6f, BoltSpeed = 12.8f, BoltDamage = 28f, FireGap = 0.15f;
    const float BossR = 0.9f, PlayerR = 0.22f, SegLen = 0.56f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    static readonly string[] ZoneNames = { "Gazer's hall", "High rafters", "Burning floor", "Swinging anchors", "Shield cycles", "Last stand" };
    static readonly Color[] ZoneColor = { new Color(0.4f, 0.9f, 1f), new Color(0.6f, 1f, 0.6f), new Color(1f, 0.55f, 0.25f), new Color(0.9f, 0.75f, 1f), new Color(0.45f, 0.75f, 1f), new Color(1f, 0.4f, 0.4f) };

    class Anchor { public Vector2 basePos, pos; public float phase; public Transform t, chain; }
    class Bolt { public Vector2 p, v; public float life, dmg; public bool hostile; public Transform t; }
    class Tentacle { public Vector2 root; public Vector2[] j = new Vector2[5]; public float timer; public Transform[] balls = new Transform[5]; public Transform[] links = new Transform[4]; }

    int stageIdx, tier;
    readonly List<Anchor> anchors = new List<Anchor>();
    readonly List<Bolt> bolts = new List<Bolt>();
    readonly List<Tentacle> tentacles = new List<Tentacle>();
    Vector2 p, v;
    bool hooked, grounded;
    Anchor hookAnchor;
    float rope, ropeMin, hp, iframes, fireTimer, time;
    float bossHp, bossMax, bossCool;
    Vector2 boss;
    bool enraged;
    int score, stars, hits;
    string endReason = "";
    int facing = 1;

    // stats of the web's boss tier
    float tCool, tBoltSpeed, tBoltDmg, tTentDps; int tVolley1, tVolley2;

    Camera cam;
    Transform root, player, playerBody, bossT, eye, iris, shield, floorGlow;
    LineRenderer ropeLine;
    Material bossEyeMat, shieldMat;
    Bursts bursts;
    Synth synth;
    bool showStages;
    float shake, flash;

    int Zone => stageIdx / 5;
    bool HotFloor => Zone == 2 || Zone == 5;
    bool MovingAnchors => Zone == 3 || Zone == 5;
    bool HasShield => Zone >= 4;
    bool ShieldUp => HasShield && Mathf.Repeat(time, 6f) > 3.8f;

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
        cam.fieldOfView = 50f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.05f, 0.05f, 0.09f);
        cam.farClipPlane = 120f;
        var key = new GameObject("Key").AddComponent<Light>();
        key.type = LightType.Directional;
        key.intensity = 0.9f;
        key.color = new Color(0.95f, 0.92f, 1f);
        key.transform.rotation = Quaternion.Euler(30f, 20f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.4f, 0.4f, 0.5f);
        bursts = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
    }

    // ---------------- Arena ----------------
    void TierStats()
    {
        // the web's 20 tiers over 30 stages
        tier = 1 + Mathf.RoundToInt(stageIdx * 19f / (StageCount - 1));
        int t = tier - 1;
        // the blaster here fires about seven times a second, so the Gazer carries 1.8x the web's armour
        bossMax = Mathf.Round(1800f * (1f + 0.12f * t));
        tCool = Mathf.Max(0.55f, 1f - 0.025f * t);
        tBoltSpeed = (220f + 6f * t) / 50f;
        tBoltDmg = Mathf.Round(18f + 0.8f * t);
        tVolley1 = t >= 14 ? 3 : 1;
        tVolley2 = t >= 7 ? 3 : 1;
        tTentDps = 12f + 0.5f * t;
    }

    Vector2[] Layout()
    {
        if (Zone == 1 || Zone == 5)
            return new[] { new Vector2(-5.5f, 7.8f), new Vector2(-2.2f, 8.4f), new Vector2(2.2f, 8.4f), new Vector2(5.5f, 7.8f), new Vector2(-6.6f, 5.4f), new Vector2(6.6f, 5.4f) };
        return new[] { new Vector2(-5f, 7.5f), new Vector2(-2f, 7.8f), new Vector2(2f, 7.8f), new Vector2(5f, 7.5f), new Vector2(0f, 8.7f), new Vector2(-4f, 4.7f), new Vector2(4f, 4.7f) };
    }

    void BuildScene()
    {
        var accent = ZoneColor[Zone];
        var hall = OiyoArcade.Prim(PrimitiveType.Quad, "Hall", OiyoArcade.Lit(new Color(0.7f, 0.72f, 0.85f), 0.1f, OiyoArcade.Art("GB/hall")), root);
        hall.transform.position = new Vector3(0f, 4.6f, 2.2f);
        hall.transform.localScale = new Vector3(19f, 12.5f, 1f);
        var floorMat = OiyoArcade.Lit(HotFloor ? new Color(1f, 0.6f, 0.4f) : new Color(0.75f, 0.78f, 0.85f), 0.45f, OiyoArcade.Art("GB/grate", true), 0.3f);
        var floor = OiyoArcade.Prim(PrimitiveType.Cube, "Floor", floorMat, root);
        // deep floor and roof blocks fill an upright phone's tall view
        floor.transform.position = new Vector3(0f, -4f, 0.4f);
        floor.transform.localScale = new Vector3(WallX * 2f + 1.2f, 8f, 3.6f);
        floorMat.mainTextureScale = new Vector2(8f, 4f);
        floorGlow = OiyoArcade.Prim(PrimitiveType.Cube, "FloorEdge", OiyoArcade.Glow(HotFloor ? new Color(1f, 0.45f, 0.1f) : accent), root).transform;
        floorGlow.position = new Vector3(0f, 0.01f, -1.38f);
        floorGlow.localScale = new Vector3(WallX * 2f + 1.2f, 0.05f, 0.05f);
        if (HotFloor)
            for (int i = 0; i < 6; i++)
            {
                var g = OiyoArcade.GlowQuad("Heat", new Color(1f, 0.45f, 0.1f, 0.35f), 4f, root);
                g.transform.SetPositionAndRotation(new Vector3(-6.5f + i * 2.6f, 0.02f, 0.2f), Quaternion.Euler(90f, 0f, 0f));
            }
        var beamMat = OiyoArcade.Lit(new Color(0.35f, 0.36f, 0.45f), 0.4f, null, 0.5f);
        var beam = OiyoArcade.Prim(PrimitiveType.Cube, "Rafter", OiyoArcade.Lit(new Color(0.16f, 0.17f, 0.24f), 0.3f, OiyoArcade.Art("GB/iron", true), 0.4f), root);
        beam.transform.position = new Vector3(0f, Ceil + 4.2f, 0.4f);
        beam.transform.localScale = new Vector3(WallX * 2f + 1.2f, 8f, 1.6f);
        var trim = OiyoArcade.Prim(PrimitiveType.Cube, "Trim", OiyoArcade.Glow(accent * 0.7f), root);
        trim.transform.position = new Vector3(0f, Ceil + 0.2f, -0.42f);
        trim.transform.localScale = new Vector3(WallX * 2f + 1.2f, 0.04f, 0.04f);
        for (int s = -1; s <= 1; s += 2)
        {
            var wall = OiyoArcade.Prim(PrimitiveType.Cube, "Wall", beamMat, root);
            wall.transform.position = new Vector3(s * (WallX + 0.6f), 5f, 0.4f);
            wall.transform.localScale = new Vector3(0.5f, 30f, 1.6f);
            var rim = OiyoArcade.Prim(PrimitiveType.Cube, "Rim", OiyoArcade.Glow(accent * 0.8f), root);
            rim.transform.position = new Vector3(s * (WallX + 0.33f), 5f, -0.42f);
            rim.transform.localScale = new Vector3(0.04f, 11f, 0.04f);
        }
        // anchors: a ring on a chain from the rafters
        anchors.Clear();
        var ringMat = OiyoArcade.Transparent(OiyoArcade.Art("GB/ring"), Color.white);
        var chainMat = OiyoArcade.Lit(new Color(0.5f, 0.5f, 0.58f), 0.6f, null, 0.6f);
        int k = 0;
        foreach (var a in Layout())
        {
            var an = new Anchor { basePos = a, pos = a, phase = k++ * 1.3f };
            var t = new GameObject("Anchor").transform;
            t.SetParent(root, false);
            var ring = OiyoArcade.Prim(PrimitiveType.Quad, "Ring", ringMat, t);
            ring.transform.localScale = Vector3.one * 0.8f;
            ring.transform.localPosition = new Vector3(0f, 0f, -0.05f);
            var core = OiyoArcade.GlowQuad("Core", new Color(accent.r, accent.g, accent.b, 0.6f), 1.2f, t);
            core.transform.localPosition = new Vector3(0f, 0f, 0.05f);
            an.t = t;
            an.chain = OiyoArcade.Prim(PrimitiveType.Cube, "Chain", chainMat, root).transform;
            anchors.Add(an);
        }
        // the Iron Gazer
        bossT = new GameObject("Gazer").transform;
        bossT.SetParent(root, false);
        var shell = OiyoArcade.Prim(PrimitiveType.Sphere, "Shell", OiyoArcade.Lit(new Color(0.62f, 0.6f, 0.68f), 0.7f, OiyoArcade.Art("GB/iron", true), 0.6f), bossT);
        shell.transform.localScale = Vector3.one * BossR * 2f;
        for (int i = 0; i < 8; i++)
        {
            var plate = OiyoArcade.Prim(PrimitiveType.Cube, "Plate", OiyoArcade.Lit(new Color(0.3f, 0.3f, 0.38f), 0.5f, null, 0.7f), bossT);
            float ang = i * 45f;
            plate.transform.localRotation = Quaternion.Euler(0f, 0f, ang);
            plate.transform.localPosition = Quaternion.Euler(0f, 0f, ang) * new Vector3(0f, BossR * 1.05f, 0.2f);
            plate.transform.localScale = new Vector3(0.36f, 0.32f, 0.5f);
        }
        bossEyeMat = OiyoArcade.Glow(new Color(0.95f, 0.95f, 0.9f));
        eye = OiyoArcade.Prim(PrimitiveType.Sphere, "Eye", bossEyeMat, bossT).transform;
        eye.localScale = Vector3.one * 0.9f;
        eye.localPosition = new Vector3(0f, 0f, -0.55f);
        iris = OiyoArcade.Prim(PrimitiveType.Sphere, "Iris", OiyoArcade.Glow(new Color(0.15f, 0.8f, 1f)), bossT).transform;
        iris.localScale = new Vector3(0.38f, 0.38f, 0.2f);
        var pupil = OiyoArcade.Prim(PrimitiveType.Sphere, "Pupil", OiyoArcade.Glow(new Color(0.03f, 0.03f, 0.06f)), iris);
        pupil.transform.localScale = new Vector3(0.5f, 0.5f, 0.6f);
        pupil.transform.localPosition = new Vector3(0f, 0f, -0.35f);
        var bglow = OiyoArcade.GlowQuad("Aura", new Color(accent.r, accent.g, accent.b, 0.35f), 4f, bossT);
        bglow.transform.localPosition = new Vector3(0f, 0f, 0.9f);
        shieldMat = OiyoArcade.Transparent(OiyoArcade.GlowTexture(), new Color(0.4f, 0.85f, 1f, 0.5f));
        shield = OiyoArcade.Prim(PrimitiveType.Quad, "Shield", shieldMat, bossT).transform;
        shield.localScale = Vector3.one * 3.4f;
        shield.localPosition = new Vector3(0f, 0f, -1.1f);
        // tentacles
        tentacles.Clear();
        var tentMat = OiyoArcade.Lit(new Color(0.45f, 0.42f, 0.55f), 0.6f, null, 0.5f);
        var tipMat = OiyoArcade.Glow(new Color(1f, 0.35f, 0.5f));
        Vector2[] roots = { new Vector2(-0.7f, 0.4f), new Vector2(0.7f, 0.4f), new Vector2(-0.9f, -0.5f), new Vector2(0.9f, -0.5f) };
        for (int i = 0; i < roots.Length; i++)
        {
            var tn = new Tentacle { root = roots[i], timer = i * 0.6f };
            for (int j = 0; j < 5; j++)
            {
                tn.j[j] = boss + roots[i] + roots[i].normalized * j * SegLen * 0.7f;
                var b = OiyoArcade.Prim(PrimitiveType.Sphere, "Joint", j == 4 ? tipMat : tentMat, root);
                b.transform.localScale = Vector3.one * (0.34f - j * 0.045f);
                tn.balls[j] = b.transform;
                if (j < 4)
                {
                    var l = OiyoArcade.Prim(PrimitiveType.Cylinder, "Link", tentMat, root);
                    tn.links[j] = l.transform;
                }
            }
            tentacles.Add(tn);
        }

        // the player: a small jet-climber
        player = new GameObject("Player").transform;
        player.SetParent(root, false);
        playerBody = new GameObject("Body").transform;
        playerBody.SetParent(player, false);
        var suit = OiyoArcade.Prim(PrimitiveType.Capsule, "Suit", OiyoArcade.LitGlow(new Color(0.2f, 0.85f, 0.75f), new Color(0.03f, 0.12f, 0.1f), 0.5f), playerBody);
        suit.transform.localScale = new Vector3(0.36f, 0.26f, 0.36f);
        var visor = OiyoArcade.Prim(PrimitiveType.Sphere, "Visor", OiyoArcade.Glow(new Color(1f, 0.9f, 0.45f)), playerBody);
        visor.transform.localScale = new Vector3(0.22f, 0.12f, 0.12f);
        visor.transform.localPosition = new Vector3(0.08f, 0.12f, -0.12f);
        var pack = OiyoArcade.Prim(PrimitiveType.Cube, "Pack", OiyoArcade.Lit(new Color(0.3f, 0.32f, 0.4f), 0.5f, null, 0.5f), playerBody);
        pack.transform.localScale = new Vector3(0.14f, 0.28f, 0.22f);
        pack.transform.localPosition = new Vector3(-0.17f, 0.02f, 0f);
        var halo = OiyoArcade.GlowQuad("Halo", new Color(0.3f, 1f, 0.85f, 0.4f), 1.1f, player);
        halo.transform.localPosition = new Vector3(0f, 0f, 0.3f);
        ropeLine = new GameObject("Rope").AddComponent<LineRenderer>();
        ropeLine.transform.SetParent(root, false);
        ropeLine.positionCount = 2;
        ropeLine.startWidth = ropeLine.endWidth = 0.06f;
        ropeLine.sharedMaterial = OiyoArcade.Glow(new Color(1f, 0.9f, 0.6f));
        ropeLine.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        ropeLine.enabled = false;
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Arena").transform;
        foreach (var b in bolts) if (b.t != null) Destroy(b.t.gameObject);
        bolts.Clear();
        TierStats();
        boss = new Vector2(0f, 5.9f);
        BuildScene();
        p = new Vector2(-5.6f, 0f); v = Vector2.zero; hooked = false; grounded = true; hookAnchor = null;
        hp = 100f; iframes = 0f; fireTimer = 0f; time = 0f;
        bossHp = bossMax; bossCool = 1.8f; enraged = false;
        score = 0; stars = 0; hits = 0; endReason = ""; facing = 1;
        showStages = false; heldPointer = int.MinValue; jumpedThisDrag = false;
        state = ready ? GameState.Ready : GameState.Menu;
        MoveAnchors();
        StepTentacles(0f);
        Sync(0f);
        UpdateCamera(1f, true);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("grappling-boss", state, score);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        ReadInput();
        if (state == GameState.Playing)
        {
            int n = Mathf.CeilToInt(dt / (1f / 120f));
            for (int i = 0; i < n && state == GameState.Playing; i++) Step(dt / n);
        }
        else if (state == GameState.Menu || state == GameState.Ready)
        {
            time += dt;
            Hover(dt);
            StepTentacles(dt);
        }
        Sync(dt);
        UpdateCamera(dt, false);
    }

    // ---------------- Input ----------------
    int heldPointer = int.MinValue;
    Vector2 heldStart, heldNow;
    bool jumpedThisDrag;
    int axis;
    bool wantJump;

    Vector2 ScreenToWorld(Vector2 screen)
    {
        var ray = cam.ScreenPointToRay(new Vector3(screen.x, screen.y, 0f));
        if (Mathf.Abs(ray.direction.z) < 1e-4f) return p;
        float t = -ray.origin.z / ray.direction.z;
        var w = ray.origin + ray.direction * t;
        return new Vector2(w.x, w.y);
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
                    bool hookKeyDown = Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.J) || Input.GetKeyDown(KeyCode.Z);
                    bool hookKeyUp = Input.GetKeyUp(KeyCode.Space) || Input.GetKeyUp(KeyCode.J) || Input.GetKeyUp(KeyCode.Z);
                    var began = OiyoArcade.Began();
                    if (state == GameState.Ready)
                    {
                        // the first press starts the fight and already fires the hook
                        if (began.Count == 0 && !hookKeyDown) return;
                        state = GameState.Playing;
                    }
                    foreach (var b in began)
                    {
                        if (heldPointer != int.MinValue) continue;
                        heldPointer = b.id; heldStart = heldNow = b.pos; jumpedThisDrag = false;
                        FireHook(ScreenToWorld(b.pos), true);
                    }
                    if (hookKeyDown) FireHook(Vector2.zero, false);
                    if (hookKeyUp && hooked) Slingshot();
                    axis = 0;
                    if (heldPointer != int.MinValue)
                    {
                        bool still = false;
                        foreach (var h in OiyoArcade.Held()) if (h.id == heldPointer) { still = true; heldNow = h.pos; }
                        if (!still)
                        {
                            heldPointer = int.MinValue;
                            if (hooked) Slingshot();
                        }
                        else
                        {
                            float s = OiyoArcade.ComputeScale();
                            float dx = (heldNow.x - heldStart.x) / s, dy = (heldNow.y - heldStart.y) / s;
                            if (dx < -14f) axis = -1; else if (dx > 14f) axis = 1;
                            if (dy > 26f && !jumpedThisDrag) { jumpedThisDrag = true; wantJump = true; }
                        }
                    }
                    if (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A)) axis = -1;
                    if (Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D)) axis = 1;
                    if (Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.W)) wantJump = true;
                    return;
                }
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

    void FireHook(Vector2 aim, bool aimed)
    {
        Anchor best = null; float bestScore = float.MaxValue;
        var vdir = v.sqrMagnitude > 0.01f ? v.normalized : new Vector2(facing, 0f);
        foreach (var a in anchors)
        {
            var d = a.pos - p;
            float dist = d.magnitude;
            if (dist > HookRange || dist < 0.4f) continue;
            float sc;
            // aimed: the anchor nearest the point pressed; keys: ahead of the motion and above
            if (aimed) sc = (a.pos - aim).magnitude;
            else sc = dist - 2.2f * Vector2.Dot(vdir, d / dist) + (a.pos.y < p.y ? 3f : 0f);
            if (sc < bestScore) { bestScore = sc; best = a; }
        }
        if (best == null) { synth.Tone(180f, 0.08f, Wave.Square, 0.08f, 0f, 20f); return; }
        hooked = true; hookAnchor = best; grounded = false;
        rope = Mathf.Max(0.6f, (best.pos - p).magnitude);
        // the hook reels in a little, lifting you off the floor into the swing
        ropeMin = Mathf.Max(0.8f, rope * 0.65f);
        v.y = Mathf.Max(v.y, 1.8f);
        synth.Tone(880f, 0.07f, Wave.Square, 0.12f, 1400f, 18f);
        bursts.Emit(best.pos, new Color(1f, 0.9f, 0.6f), 8, 2f, 0.12f, 0.3f);
    }

    void Slingshot()
    {
        if (!hooked) return;
        hooked = false; hookAnchor = null;
        if (v.magnitude > 0.2f) v += v.normalized * Sling;
        synth.Tone(520f, 0.09f, Wave.Triangle, 0.14f, 980f, 12f);
    }

    // ---------------- Simulation ----------------
    void MoveAnchors()
    {
        foreach (var a in anchors)
        {
            a.pos = a.basePos;
            if (MovingAnchors) a.pos += new Vector2(Mathf.Sin(time * 0.9f + a.phase) * 0.9f, Mathf.Cos(time * 0.9f + a.phase) * 0.35f);
        }
    }

    void Hover(float dt)
    {
        float hy = 5.9f + Mathf.Sin(time * 1.5f) * 0.9f;
        float hx = Mathf.Cos(time * 0.8f) * (enraged ? 2.8f : (Zone == 1 || Zone == 5 ? 2.2f : 1.6f));
        boss.x += (hx - boss.x) * 1.8f * dt;
        boss.y += (hy - boss.y) * 1.8f * dt;
    }

    void Step(float dt)
    {
        time += dt;
        MoveAnchors();
        // jets and the jump / slingshot
        float thrust = axis * (hooked ? JetHooked : JetFree);
        if (axis != 0) facing = axis;
        if (wantJump)
        {
            wantJump = false;
            if (hooked) Slingshot();
            else if (grounded) { v.y = JumpV; grounded = false; synth.Tone(420f, 0.08f, Wave.Square, 0.12f, 700f, 14f); }
        }
        if (hooked && hookAnchor != null)
        {
            rope = Mathf.MoveTowards(rope, ropeMin, 3f * dt);
            var rel = p - hookAnchor.pos;
            float dist = rel.magnitude;
            if (dist >= rope && dist > 1e-4f)
            {
                var n = rel / dist;
                var tan = new Vector2(-n.y, n.x);
                float vt = Vector2.Dot(v, tan);
                vt += (Vector2.Dot(new Vector2(0f, -G), tan) + thrust * tan.x) * dt;
                vt *= Mathf.Max(0f, 1f - WireDamp * dt);
                v = vt * tan;
                p += v * dt;
                var r2 = p - hookAnchor.pos;
                p = hookAnchor.pos + r2.normalized * rope;
            }
            else FreeFlight(dt, thrust);
        }
        else FreeFlight(dt, thrust);
        // floor, walls and rafters
        if (p.y <= PlayerR)
        {
            p.y = PlayerR;
            if (v.y < 0f) { if (v.y < -4f) bursts.Emit(new Vector3(p.x, 0.05f, -0.2f), new Color(0.8f, 0.85f, 0.9f), 6, 1.2f, 0.1f, 0.3f); v.y = 0f; }
            grounded = true;
            v.x *= Mathf.Max(0f, 1f - 6f * dt);
        }
        else grounded = false;
        if (p.x < -WallX) { p.x = -WallX; v.x = Mathf.Abs(v.x) * 0.4f; }
        if (p.x > WallX) { p.x = WallX; v.x = -Mathf.Abs(v.x) * 0.4f; }
        if (p.y > Ceil) { p.y = Ceil; v.y = Mathf.Min(0f, v.y); }
        if (HotFloor && grounded) { hp -= 10f * dt; if (Random.value < dt * 20f) bursts.Emit(new Vector3(p.x, 0.1f, -0.2f), new Color(1f, 0.5f, 0.1f), 1, 1.5f, 0.12f, 0.4f, Vector3.up * 1.5f); }
        // the boss body pushes you away
        var fromBoss = p - boss;
        if (fromBoss.magnitude < BossR + PlayerR) { p = boss + fromBoss.normalized * (BossR + PlayerR); v += fromBoss.normalized * 3f; }

        // the blaster fires on its own while you are off the floor
        fireTimer += dt;
        if (!grounded && fireTimer > FireGap)
        {
            fireTimer = 0f;
            var d = (boss - p).normalized;
            var jitter = new Vector2(Random.Range(-0.35f, 0.35f), Random.Range(-0.35f, 0.35f));
            SpawnBolt(p + d * 0.3f, d * BoltSpeed + jitter, BoltDamage, false);
            synth.Tone(1500f, 0.03f, Wave.Square, 0.04f, 900f, 40f);
        }

        // the Gazer: hover, enrage, plasma volleys
        Hover(dt);
        if (!enraged && bossHp <= bossMax * 0.5f)
        {
            enraged = true;
            bossEyeMat.color = new Color(1f, 0.5f, 0.45f);
            shake = 0.4f;
            synth.Tone(90f, 0.6f, Wave.Saw, 0.25f, 50f, 3f);
        }
        bossCool -= dt;
        if (bossCool <= 0f)
        {
            bossCool = (enraged ? 1f : 1.8f) * tCool;
            float aimAng = Mathf.Atan2(p.y - boss.y, p.x - boss.x);
            int volley = enraged ? tVolley2 : tVolley1;
            for (int i = 0; i < volley; i++)
            {
                float a = aimAng + (i - (volley - 1) * 0.5f) * 0.28f;
                SpawnBolt(boss, new Vector2(Mathf.Cos(a), Mathf.Sin(a)) * tBoltSpeed, tBoltDmg, true);
            }
            synth.Tone(300f, 0.15f, Wave.Saw, 0.1f, 160f, 8f);
        }
        StepTentacles(dt);
        foreach (var tn in tentacles)
        {
            var tip = tn.j[4];
            if ((tip - p).magnitude < 0.48f)
            {
                hp -= tTentDps * dt;
                var away = (p - tip).sqrMagnitude > 1e-6f ? (p - tip).normalized : Vector2.up;
                v += away * 14f * dt;
                if (Random.value < dt * 10f) { flash = 0.15f; synth.Tone(200f, 0.05f, Wave.Noise, 0.1f, 0f, 20f); }
            }
        }
        StepBolts(dt);
        iframes -= dt;

        if (bossHp <= 0f) { Win(); return; }
        if (hp <= 0f) { Lose(HotFloor && grounded ? U("The burning floor wore your shield down.") : U("The Gazer broke your shield.")); return; }
    }

    void FreeFlight(float dt, float thrust)
    {
        float speed = v.magnitude;
        float k = Mathf.Max(0f, 1f - Drag * speed * dt);
        v.x = (v.x + thrust * dt) * k;
        v.y = (v.y - G * dt) * k;
        p += v * dt;
    }

    void StepTentacles(float dt)
    {
        foreach (var tn in tentacles)
        {
            tn.timer += dt;
            var target = p + new Vector2(Mathf.Sin(tn.timer * 2.5f), Mathf.Cos(tn.timer * 2.5f)) * 0.8f;
            var rootPos = boss + tn.root;
            // FABRIK: reach from the tip, then pull back to the root
            for (int it = 0; it < 6; it++)
            {
                tn.j[4] = target;
                for (int j = 3; j >= 0; j--) tn.j[j] = tn.j[j + 1] + (tn.j[j] - tn.j[j + 1]).normalized * SegLen;
                tn.j[0] = rootPos;
                for (int j = 1; j < 5; j++) tn.j[j] = tn.j[j - 1] + (tn.j[j] - tn.j[j - 1]).normalized * SegLen;
            }
        }
    }

    void SpawnBolt(Vector2 at, Vector2 vel, float dmg, bool hostile)
    {
        var b = new Bolt { p = at, v = vel, dmg = dmg, hostile = hostile, life = hostile ? 3.5f : 2f };
        var g = OiyoArcade.GlowQuad(hostile ? "Plasma" : "Shot", hostile ? new Color(1f, 0.3f, 0.85f, 0.95f) : new Color(0.4f, 1f, 0.95f, 0.9f), hostile ? 0.55f : 0.3f, root);
        if (hostile)
        {
            var core = OiyoArcade.Prim(PrimitiveType.Sphere, "Core", OiyoArcade.Glow(new Color(1f, 0.85f, 0.95f)), g.transform);
            core.transform.localScale = Vector3.one * 0.35f;
        }
        b.t = g.transform;
        bolts.Add(b);
    }

    void StepBolts(float dt)
    {
        for (int i = bolts.Count - 1; i >= 0; i--)
        {
            var b = bolts[i];
            b.p += b.v * dt;
            b.life -= dt;
            bool dead = b.life <= 0f || b.p.x < -WallX - 1f || b.p.x > WallX + 1f || b.p.y < -0.5f || b.p.y > Ceil + 1f;
            if (!dead && !b.hostile && (b.p - boss).magnitude < BossR)
            {
                dead = true;
                if (ShieldUp)
                {
                    bursts.Emit(new Vector3(b.p.x, b.p.y, -0.6f), new Color(0.5f, 0.85f, 1f), 3, 2f, 0.1f, 0.25f);
                }
                else
                {
                    bossHp = Mathf.Max(0f, bossHp - b.dmg);
                    hp = Mathf.Min(100f, hp + 2f);
                    score += Mathf.FloorToInt(b.dmg * 10f);
                    hits++;
                    bursts.Emit(new Vector3(b.p.x, b.p.y, -0.6f), new Color(1f, 0.8f, 0.4f), 4, 2.5f, 0.12f, 0.3f);
                    if (hits % 3 == 0) synth.Tone(240f, 0.05f, Wave.Noise, 0.07f, 0f, 30f);
                }
            }
            if (!dead && b.hostile && iframes <= 0f && (b.p - p).magnitude < PlayerR + 0.12f)
            {
                dead = true;
                hp = Mathf.Max(0f, hp - b.dmg);
                iframes = 0.5f; flash = 0.25f; shake = 0.25f;
                bursts.Emit(new Vector3(p.x, p.y, -0.4f), new Color(1f, 0.4f, 0.8f), 14, 3f, 0.15f, 0.4f);
                synth.Tone(160f, 0.2f, Wave.Saw, 0.2f, 70f, 8f);
            }
            if (dead) { if (b.t != null) Destroy(b.t.gameObject); bolts.RemoveAt(i); }
        }
    }

    void Win()
    {
        score += 5000;
        stars = 1 + (hp >= 30f ? 1 : 0) + (hp >= 60f ? 1 : 0);
        score += stars * 100 + stageIdx * 10;
        hooked = false;
        state = GameState.Victory;
        OiyoArcade.Record(Slug, stageIdx, stars, score, StageCount);
        bursts.Emit(new Vector3(boss.x, boss.y, -0.8f), new Color(1f, 0.75f, 0.3f), 70, 6f, 0.3f, 1.2f);
        shake = 0.6f;
        StartCoroutine(Arp(new[] { 392f, 523f, 659f, 784f, 1047f }, 0.1f));
    }

    void Lose(string why)
    {
        endReason = why;
        hooked = false;
        state = GameState.GameOver;
        shake = 0.4f;
        bursts.Emit(new Vector3(p.x, p.y, -0.4f), Color.white, 30, 4f, 0.2f, 0.7f);
        synth.Tone(200f, 0.6f, Wave.Saw, 0.22f, 50f, 3f);
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.2f, Wave.Triangle, 0.3f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    // ---------------- View ----------------
    void Sync(float dt)
    {
        if (player == null) return;
        player.position = new Vector3(p.x, p.y, 0f);
        float tilt = Mathf.Clamp(-v.x * 3f, -35f, 35f);
        playerBody.localRotation = Quaternion.Euler(0f, facing < 0 ? 180f : 0f, facing < 0 ? -tilt : tilt);
        bool blink = iframes > 0f && Mathf.Repeat(Time.time * 20f, 1f) < 0.5f;
        playerBody.gameObject.SetActive(!blink || state != GameState.Playing);
        foreach (var a in anchors)
        {
            a.t.position = new Vector3(a.pos.x, a.pos.y, 0f);
            float len = Ceil + 0.3f - a.pos.y;
            a.chain.position = new Vector3(a.pos.x, a.pos.y + 0.35f + len * 0.5f - 0.2f, 0.15f);
            a.chain.localScale = new Vector3(0.05f, Mathf.Max(0.05f, len - 0.3f), 0.05f);
            a.t.localScale = Vector3.one * (a == hookAnchor ? 1.25f : 1f);
        }
        ropeLine.enabled = hooked && hookAnchor != null && state == GameState.Playing;
        if (ropeLine.enabled)
        {
            ropeLine.SetPosition(0, new Vector3(p.x, p.y, -0.05f));
            ropeLine.SetPosition(1, new Vector3(hookAnchor.pos.x, hookAnchor.pos.y, -0.05f));
        }
        bossT.position = new Vector3(boss.x, boss.y, 0f);
        bossT.rotation = Quaternion.Euler(0f, 0f, Mathf.Sin(time * 0.7f) * 8f);
        var look = new Vector3(p.x - boss.x, p.y - boss.y, 0f);
        look = look.sqrMagnitude > 0.01f ? look.normalized : Vector3.down;
        iris.position = bossT.position + look * 0.26f + new Vector3(0f, 0f, -0.88f);
        shield.gameObject.SetActive(ShieldUp && state != GameState.Victory);
        if (shield.gameObject.activeSelf) shield.localScale = Vector3.one * (3.3f + Mathf.Sin(Time.time * 6f) * 0.15f);
        foreach (var tn in tentacles)
        {
            for (int j = 0; j < 5; j++) tn.balls[j].position = new Vector3(tn.j[j].x, tn.j[j].y, -0.1f);
            for (int j = 0; j < 4; j++)
            {
                var a = tn.j[j]; var b = tn.j[j + 1];
                var mid = (a + b) * 0.5f;
                var d = b - a;
                tn.links[j].position = new Vector3(mid.x, mid.y, -0.1f);
                tn.links[j].rotation = Quaternion.Euler(0f, 0f, Mathf.Atan2(d.y, d.x) * Mathf.Rad2Deg - 90f);
                tn.links[j].localScale = new Vector3(0.16f - j * 0.025f, d.magnitude * 0.5f, 0.16f - j * 0.025f);
            }
        }
        foreach (var b in bolts) if (b.t != null) b.t.position = new Vector3(b.p.x, b.p.y, -0.5f);
        if (floorGlow != null && HotFloor) floorGlow.localScale = new Vector3(WallX * 2f + 1.2f, 0.05f + Mathf.Sin(Time.time * 5f) * 0.02f, 0.05f);
        flash = Mathf.MoveTowards(flash, 0f, dt);
    }

    void UpdateCamera(float dt, bool snap)
    {
        float aspect = Mathf.Max(0.3f, cam.aspect);
        float tan = Mathf.Tan(cam.fieldOfView * 0.5f * Mathf.Deg2Rad);
        // a wide screen sees the whole hall; an upright phone sees about 11 units across and follows the fight
        float dist = Mathf.Max(8.4f / (tan * aspect), 5.7f / tan);
        bool portrait = aspect < 1.2f;
        if (portrait) dist = 4.8f / (tan * aspect);
        float halfW = tan * aspect * dist;
        float cx = portrait ? Mathf.Clamp(Mathf.Lerp(p.x, boss.x, 0.45f), -(WallX + 0.9f) + halfW, (WallX + 0.9f) - halfW) : 0f;
        if (halfW > WallX + 0.9f) cx = 0f;
        float cy = portrait ? 4.2f : 4.9f;
        var target = new Vector3(cx, cy, -dist);
        var pos = snap ? target : Vector3.Lerp(cam.transform.position, target, 1f - Mathf.Exp(-dt * 5f));
        var shakeOff = Vector3.zero;
        if (shake > 0f) { shakeOff = Random.insideUnitSphere * shake * 0.3f; shake = Mathf.MoveTowards(shake, 0f, dt); }
        cam.transform.position = pos + shakeOff;
        cam.transform.rotation = Quaternion.LookRotation(new Vector3(pos.x, cy + 0.3f, 0f) - pos);
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.15f, 0.65f, 0.75f, 0.97f);
    static readonly Color Dark = new Color(0.03f, 0.04f, 0.08f, 0.84f);
    static readonly Color Gold = new Color(1f, 0.8f, 0.25f, 0.97f);
    static readonly Color Slate = new Color(0.17f, 0.2f, 0.3f, 0.95f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + U(ZoneNames[i / 5]);

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (flash > 0f && state == GameState.Playing) OiyoArcade.Fill(new Rect(0f, 0f, w, h), new Color(1f, 0.2f, 0.4f, flash * 0.6f));
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        var bar = new Rect(8f, 8f, w - 16f, 86f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 140f, 24f), "<b>" + StageTitle(stageIdx) + "</b>", 16, new Color(0.7f, 0.95f, 1f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 20f), F("Iron Gazer MK-{0}", tier) + (ShieldUp && state == GameState.Playing ? "  <color=#7fdcff>" + U("Shield up!") + "</color>" : enraged ? "  <color=#ff8a80>" + U("Enraged") + "</color>" : ""), 13, new Color(1f, 0.8f, 0.85f));
        OiyoArcade.Bar(new Rect(20f, 56f, w - 96f, 9f), bossHp / bossMax, new Color(0f, 0f, 0f, 0.5f), enraged ? new Color(1f, 0.35f, 0.35f) : new Color(1f, 0.45f, 0.75f));
        OiyoArcade.Text(new Rect(20f, 68f, 120f, 20f), U("Shield"), 12, new Color(1f, 1f, 1f, 0.8f));
        OiyoArcade.Bar(new Rect(80f, 74f, w - 156f, 7f), hp / 100f, new Color(0f, 0f, 0f, 0.5f), hp > 30f ? new Color(0.35f, 1f, 0.8f) : new Color(1f, 0.6f, 0.3f));
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        OiyoArcade.Text(new Rect(w - 160f, 96f, 148f, 20f), $"{U("Score")} <b>{score}</b>", 13, Color.white, TextAnchor.UpperRight);
        if (state == GameState.Ready)
        {
            var r = new Rect(w * 0.5f - 175f, h - 190f, 350f, 128f);
            OiyoArcade.Panel(r, Dark);
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 8f, r.width - 24f, r.height - 16f),
                $"<b>{U("Press near a ring to hook it, let go to slingshot")}</b>\n<size=14>{U("Drag sideways for the jets, flick up to jump. The blaster fires while you are off the floor. Keys: Space hooks, arrows move.")}</size>", 16, Color.white, TextAnchor.MiddleCenter);
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
            OiyoArcade.Panel(box, new Color(0.03f, 0.04f, 0.08f, 0.94f));
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
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("Grappling Boss 3D"), 30, new Color(0.7f, 0.95f, 1f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 62f, cw - 40f, 46f), U("Swing on your grappling hook and blast the Iron Gazer before it breaks your shield."), 15, new Color(1f, 1f, 1f, 0.85f), TextAnchor.MiddleCenter);
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
            $"{U("Score")} <b>{score}</b>   {U("Shield")} <b>{Mathf.CeilToInt(hp)}%</b>\n<size=14>{F("Iron Gazer MK-{0}", tier)} · {Mathf.RoundToInt(100f * (1f - bossHp / bossMax))}%</size>", 16, Color.white, TextAnchor.MiddleCenter);
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
