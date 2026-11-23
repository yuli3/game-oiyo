using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Spin Sumo 3D: the web Spin Sumo (src/components/games/SpinSumo.tsx, src/lib/games/spin-sumo.ts)
// rebuilt as a 30-stage Unity game. One button: hold and the aim arrow sweeps round your top
// while the power swings 0 -> 1 -> 0; let go to dash that way. Knock the computer's top out of
// the ring, into a hole, or outlast its spin. The web engine's rules in the same px units:
// springy top-on-top hits (the faster-spinning top is heavier), bumpers, holes, wind, a
// turning floor, rings that shrink, and after 40 s every ring closes in.
// The 12 web arenas come back across the 30 stages with a sharper computer each time;
// from stage 7 a bout is best of three. Hold anywhere, the mouse button, or Space.
public class SpinSumoPlayer : MonoBehaviour
{
    const string Slug = "spin-sumo";
    const int StageCount = 30;
    const float TopR = 17f, RoundLimit = 40f;
    const float AimSpeed = Mathf.PI * 2f * 0.7f, PowerPeriod = 1.3f, MinDash = 80f, MaxDash = 300f;
    const float K = 0.02f; // world units per px

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, RoundEnd, Paused, Victory, GameOver }
    GameState state = GameState.Menu;
    GameState pausedFrom;

    struct Circle { public float x, y, r; public Circle(float x, float y, float r) { this.x = x; this.y = y; this.r = r; } }
    struct Cpu { public float tolerance, delay, charge, dodge; public Cpu(float t, float d, float c, float o) { tolerance = t; delay = d; charge = c; dodge = o; } }
    class Arena { public string name; public float radius, friction, wind, swirl, shrink; public Circle[] bumpers, pits; public Cpu cpu; }

    static readonly Circle[] None = new Circle[0];
    static readonly Arena[] Arenas =
    {
        new Arena { name = "Dirt yard", radius = 160, friction = 1.1f, bumpers = None, pits = None, cpu = new Cpu(0.55f, 0.9f, 0.45f, 0f) },
        new Arena { name = "Crock terrace", radius = 160, friction = 1.1f, bumpers = new[] { new Circle(-70, 0, 22), new Circle(70, 0, 22) }, pits = None, cpu = new Cpu(0.45f, 0.8f, 0.5f, 0.1f) },
        new Arena { name = "Frozen pond", radius = 160, friction = 0.35f, bumpers = None, pits = None, cpu = new Cpu(0.4f, 0.75f, 0.5f, 0.15f) },
        new Arena { name = "Small straw mat", radius = 125, friction = 1.1f, bumpers = None, pits = None, cpu = new Cpu(0.35f, 0.7f, 0.55f, 0.2f) },
        new Arena { name = "Pillar yard", radius = 165, friction = 1.0f, bumpers = new[] { new Circle(-60, -60, 18), new Circle(60, -60, 18), new Circle(-60, 60, 18), new Circle(60, 60, 18) }, pits = None, cpu = new Cpu(0.32f, 0.65f, 0.6f, 0.25f) },
        new Arena { name = "Shrinking ring", radius = 170, friction = 1.0f, shrink = 2.2f, bumpers = None, pits = None, cpu = new Cpu(0.3f, 0.6f, 0.6f, 0.3f) },
        new Arena { name = "Windy hill", radius = 160, friction = 0.9f, wind = 26, bumpers = None, pits = None, cpu = new Cpu(0.28f, 0.55f, 0.62f, 0.3f) },
        new Arena { name = "Holey floor", radius = 165, friction = 1.0f, bumpers = None, pits = new[] { new Circle(-55, -20, 20), new Circle(55, 20, 20) }, cpu = new Cpu(0.26f, 0.5f, 0.65f, 0.35f) },
        new Arena { name = "Ice pillars", radius = 165, friction = 0.35f, bumpers = new[] { new Circle(-75, 0, 20), new Circle(75, 0, 20) }, pits = None, cpu = new Cpu(0.24f, 0.45f, 0.68f, 0.4f) },
        new Arena { name = "Turntable", radius = 165, friction = 0.9f, swirl = 34, bumpers = None, pits = None, cpu = new Cpu(0.22f, 0.4f, 0.7f, 0.45f) },
        new Arena { name = "Melting ice", radius = 175, friction = 0.4f, shrink = 2.6f, bumpers = None, pits = None, cpu = new Cpu(0.2f, 0.35f, 0.72f, 0.5f) },
        new Arena { name = "Champion's ring", radius = 175, friction = 0.8f, swirl = 18, shrink = 1.6f, bumpers = new[] { new Circle(0, 0, 16) }, pits = new[] { new Circle(-80, 50, 18), new Circle(80, -50, 18) }, cpu = new Cpu(0.18f, 0.3f, 0.75f, 0.55f) },
    };

    struct StageDef { public int arena, wins; public Cpu cpu; }
    StageDef[] stages;
    int stageIdx;
    StageDef S => stages[stageIdx];
    Arena A => Arenas[S.arena];

    class Top { public float x, y, vx, vy, spin, angle, charging, wobble, spinAngle; public bool @out; public Transform t, body, arrow; public Material arrowMat; }
    readonly Top[] tops = { new Top(), new Top() }; // 0 = you, 1 = computer
    float time, radius, cpuWait;
    uint seed = 1;
    readonly int[] wins = new int[2];
    int roundNo, lostRounds, score, stars;
    float minWinSpin = 1f, roundTimer;
    int roundWinner = -1;
    string endReason = "";
    string popup = ""; float popupTimer; Color popupColor;

    Camera cam;
    Transform root, ringT, edgeT;
    Bursts bursts;
    Synth synth;
    bool showStages;
    float shake, menuSpin, hitCooldown;
    readonly List<Transform> windStreaks = new List<Transform>();

    static readonly Color You = new Color(0.95f, 0.3f, 0.3f);
    static readonly Color Rival = new Color(0.25f, 0.55f, 1f);

    void Awake()
    {
        Application.targetFrameRate = 60;
        BuildStages();
        SetupScene();
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        LoadStage(stageIdx, false);
    }

    void BuildStages()
    {
        stages = new StageDef[StageCount];
        for (int i = 0; i < StageCount; i++)
        {
            int a = Mathf.Min(Arenas.Length - 1, Mathf.FloorToInt(i * 0.4f));
            int sub = 0;
            for (int j = i - 1; j >= 0 && Mathf.Min(Arenas.Length - 1, Mathf.FloorToInt(j * 0.4f)) == a; j--) sub++;
            var c = Arenas[a].cpu;
            // a later visit to the same arena brings a sharper computer; the first two bouts are gentle
            float k = i < 2 ? 0.75f + i * 0.12f : 1f + sub * 0.18f + (i >= 27 ? 0.15f : 0f);
            stages[i] = new StageDef
            {
                arena = a,
                wins = i < 6 ? 1 : 2,
                cpu = new Cpu(Mathf.Max(0.12f, c.tolerance / k), Mathf.Max(0.18f, c.delay / k), Mathf.Min(0.9f, c.charge * Mathf.Sqrt(k)), Mathf.Min(0.8f, c.dodge * k + (k > 1f ? 0.05f : 0f))),
            };
        }
    }

    void SetupScene()
    {
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 45f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.12f, 0.09f, 0.08f);
        var key = new GameObject("Key").AddComponent<Light>();
        key.type = LightType.Directional;
        key.intensity = 1.0f;
        key.color = new Color(1f, 0.93f, 0.82f);
        key.transform.rotation = Quaternion.Euler(52f, -30f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.45f, 0.42f, 0.42f);
        bursts = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
    }

    // px (y down, player at +y) -> world (player near the camera at -z)
    static Vector3 W(float x, float y, float h = 0f) => new Vector3(x * K, h, -y * K);

    void BuildArena()
    {
        var a = A;
        var floor = OiyoArcade.Prim(PrimitiveType.Quad, "Boards", OiyoArcade.Lit(Color.white, 0.25f, OiyoArcade.Art("SS/boards", true)), root);
        floor.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        floor.transform.position = new Vector3(0f, -0.4f, 0f);
        floor.transform.localScale = new Vector3(40f, 40f, 1f);
        floor.GetComponent<Renderer>().sharedMaterial.mainTextureScale = new Vector2(8f, 8f);

        // a round raised platform: the clay disc art, darkened, under the ring (a cylinder showed its facets)
        var plinth = OiyoArcade.Prim(PrimitiveType.Quad, "Plinth", OiyoArcade.Transparent(OiyoArcade.Art("SS/clay"), new Color(0.62f, 0.45f, 0.32f)), root);
        plinth.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        plinth.transform.position = new Vector3(0f, -0.002f, 0f);
        plinth.transform.localScale = Vector3.one * (a.radius * 2f * K + 1.3f);
        var shade = OiyoArcade.GlowQuad("Shade", new Color(0f, 0f, 0f, 0.55f), a.radius * 2f * K + 2.6f, root);
        shade.transform.SetPositionAndRotation(new Vector3(0f, -0.3f, 0f), Quaternion.Euler(90f, 0f, 0f));

        ringT = OiyoArcade.Prim(PrimitiveType.Quad, "Ring", OiyoArcade.Transparent(OiyoArcade.Art("SS/clay"), Color.white), root).transform;
        ringT.rotation = Quaternion.Euler(90f, 0f, 0f);
        ringT.position = new Vector3(0f, 0.005f, 0f);
        edgeT = OiyoArcade.GlowQuad("Edge", new Color(1f, 0.45f, 0.2f, 0f), 1f, root).transform;
        edgeT.rotation = Quaternion.Euler(90f, 0f, 0f);
        edgeT.position = new Vector3(0f, -0.01f, 0f);

        var crock = OiyoArcade.Lit(new Color(0.35f, 0.22f, 0.15f), 0.55f);
        var lid = OiyoArcade.Lit(new Color(0.25f, 0.16f, 0.11f), 0.4f);
        var pillar = OiyoArcade.Lit(new Color(0.75f, 0.68f, 0.6f), 0.3f);
        bool jars = a.name == "Crock terrace";
        bool ice = a.friction < 0.5f;
        foreach (var b in a.bumpers)
        {
            if (jars)
            {
                var j = OiyoArcade.Prim(PrimitiveType.Sphere, "Crock", crock, root);
                j.transform.position = W(b.x, b.y, b.r * K * 1.05f);
                j.transform.localScale = new Vector3(b.r * 2.1f * K, b.r * 2.4f * K, b.r * 2.1f * K);
                var l = OiyoArcade.Prim(PrimitiveType.Cylinder, "Lid", lid, root);
                l.transform.position = W(b.x, b.y, b.r * K * 2.25f);
                l.transform.localScale = new Vector3(b.r * 1.3f * K, 0.04f, b.r * 1.3f * K);
            }
            else
            {
                var p = OiyoArcade.Prim(PrimitiveType.Cylinder, "Pillar", ice ? OiyoArcade.Lit(new Color(0.7f, 0.88f, 1f), 0.9f) : pillar, root);
                p.transform.position = W(b.x, b.y, 0.5f);
                p.transform.localScale = new Vector3(b.r * 2f * K, 0.5f, b.r * 2f * K);
            }
        }
        foreach (var h in a.pits)
        {
            var p = OiyoArcade.Prim(PrimitiveType.Cylinder, "Hole", OiyoArcade.Glow(new Color(0.04f, 0.03f, 0.03f)), root);
            p.transform.position = W(h.x, h.y, 0.008f);
            p.transform.localScale = new Vector3(h.r * 2f * K, 0.002f, h.r * 2f * K);
            OiyoArcade.GlowQuad("Lip", new Color(0f, 0f, 0f, 0.5f), h.r * 3f * K, root).transform.SetPositionAndRotation(W(h.x, h.y, 0.006f), Quaternion.Euler(90f, 0f, 0f));
        }
        if (ice)
        {
            var sheen = OiyoArcade.GlowQuad("Ice", new Color(0.7f, 0.9f, 1f, 0.35f), a.radius * 2.2f * K, root);
            sheen.transform.SetPositionAndRotation(new Vector3(0f, 0.012f, 0f), Quaternion.Euler(90f, 0f, 0f));
        }
        windStreaks.Clear();
        if (a.wind > 0f)
            for (int i = 0; i < 14; i++)
            {
                var s = OiyoArcade.Prim(PrimitiveType.Quad, "Wind", OiyoArcade.Transparent(OiyoArcade.GlowTexture(), new Color(1f, 1f, 1f, 0.35f)), root).transform;
                s.rotation = Quaternion.Euler(90f, 0f, 0f);
                s.localScale = new Vector3(1.2f, 0.06f, 1f);
                s.position = new Vector3(Random.Range(-5f, 5f), 0.3f + Random.value * 0.4f, Random.Range(-4f, 4f));
                windStreaks.Add(s);
            }

        for (int i = 0; i < 2; i++) BuildTop(tops[i], i == 0 ? You : Rival, i == 0 ? "You" : "Rival");
    }

    void BuildTop(Top top, Color c, string name)
    {
        top.t = new GameObject(name).transform;
        top.t.SetParent(root, false);
        top.body = new GameObject("Body").transform;
        top.body.SetParent(top.t, false);
        float d = TopR * 2f * K;
        var disc = OiyoArcade.Prim(PrimitiveType.Cylinder, "Disc", OiyoArcade.Lit(c, 0.7f, OiyoArcade.Art("SS/spiral")), top.body);
        disc.transform.localPosition = new Vector3(0f, 0.3f, 0f);
        disc.transform.localScale = new Vector3(d, 0.06f, d);
        var cone = OiyoArcade.Prim(PrimitiveType.Sphere, "Cone", OiyoArcade.Lit(Color.Lerp(c, Color.black, 0.35f), 0.6f), top.body);
        cone.transform.localPosition = new Vector3(0f, 0.17f, 0f);
        cone.transform.localScale = new Vector3(d * 0.72f, 0.32f, d * 0.72f);
        var tip = OiyoArcade.Prim(PrimitiveType.Sphere, "Tip", OiyoArcade.Lit(new Color(0.85f, 0.85f, 0.9f), 0.9f, null, 0.6f), top.body);
        tip.transform.localPosition = new Vector3(0f, 0.03f, 0f);
        tip.transform.localScale = Vector3.one * 0.08f;
        var stem = OiyoArcade.Prim(PrimitiveType.Cylinder, "Stem", OiyoArcade.Lit(Color.Lerp(c, Color.white, 0.5f), 0.8f), top.body);
        stem.transform.localPosition = new Vector3(0f, 0.45f, 0f);
        stem.transform.localScale = new Vector3(0.1f, 0.12f, 0.1f);
        var halo = OiyoArcade.GlowQuad("Shadow", new Color(0f, 0f, 0f, 0.45f), d * 1.5f, top.t);
        halo.transform.localPosition = new Vector3(0f, 0.01f, 0f);
        halo.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
        top.arrowMat = OiyoArcade.Transparent(OiyoArcade.Art("SS/arrow"), new Color(c.r, c.g, c.b, 0f));
        var arrow = OiyoArcade.Prim(PrimitiveType.Quad, "Arrow", top.arrowMat, top.t);
        top.arrow = arrow.transform;
    }

    void ResetRound()
    {
        var a = A;
        float d = a.radius * 0.55f;
        var rnd = Mulberry(seed * 977u + (uint)S.arena + (uint)roundNo * 7919u);
        for (int i = 0; i < 2; i++)
        {
            var t = tops[i];
            float y = i == 0 ? d : -d, ang = i == 0 ? -Mathf.PI / 2f : Mathf.PI / 2f;
            t.x = (rnd() - 0.5f) * 24f; t.y = y; t.vx = t.vy = 0f; t.spin = 1f;
            t.angle = ang + (rnd() - 0.5f) * 0.6f; t.charging = 0f; t.@out = false; t.wobble = 0f;
        }
        time = 0f; radius = a.radius; cpuWait = 0.6f; roundWinner = -1;
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Arena").transform;
        BuildArena();
        seed = (uint)Random.Range(1, 1000000);
        wins[0] = wins[1] = 0;
        roundNo = lostRounds = score = stars = 0;
        minWinSpin = 1f;
        endReason = ""; popup = "";
        ResetRound();
        showStages = false;
        state = ready ? GameState.Ready : GameState.Menu;
        Sync(0f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("spin-sumo", state, score);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        bool hold = ReadInput();
        hitCooldown -= dt;
        if (state == GameState.Playing)
        {
            int n = Mathf.CeilToInt(dt / (1f / 120f));
            for (int i = 0; i < n && state == GameState.Playing; i++)
            {
                bool cpu = CpuHold(1, S.cpu);
                Step(new[] { hold, cpu }, dt / n);
            }
        }
        else if (state == GameState.Menu)
        {
            // the computer spars with itself behind the menu
            var demo = Arenas[0].cpu;
            Step(new[] { CpuHold(0, demo), CpuHold(1, demo) }, dt);
            if (tops[0].@out || tops[1].@out) ResetRound();
        }
        else if (state == GameState.RoundEnd)
        {
            roundTimer -= dt;
            if (roundTimer <= 0f) NextRound();
        }
        Sync(dt);
        UpdateCamera(dt);
    }

    bool keyHeld;
    bool ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return);
        var presses = OiyoArcade.Began();
        switch (state)
        {
            case GameState.Ready:
                if (confirm || presses.Count > 0) { state = GameState.Playing; keyHeld = confirm; }
                return presses.Count > 0 || confirm;
            case GameState.Playing:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) { pausedFrom = state; state = GameState.Paused; return false; }
                bool held = Input.GetKey(KeyCode.Space) || Input.GetKey(KeyCode.Return);
                foreach (var p in OiyoArcade.Held()) if (!OiyoArcade.OverUi(p.pos) || tops[0].charging > 0f) held = true;
                return held;
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = pausedFrom;
                return false;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm) LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                return false;
            case GameState.Menu:
                if (!showStages && confirm) LoadStage(stageIdx);
                return false;
        }
        return false;
    }

    // ---------------- Simulation (port of src/lib/games/spin-sumo.ts) ----------------
    static System.Func<float> Mulberry(uint s)
    {
        uint a = s;
        return () =>
        {
            a += 0x6d2b79f5u;
            uint t = a;
            t = (t ^ (t >> 15)) * (t | 1u);
            t ^= t + (t ^ (t >> 7)) * (t | 61u);
            return (t ^ (t >> 14)) / 4294967296f;
        };
    }

    static float PowerOf(float held)
    {
        float phase = (held / (PowerPeriod / 2f)) % 2f;
        return phase <= 1f ? phase : 2f - phase;
    }

    static float DashSpeed(float power) => MinDash + (MaxDash - MinDash) * Mathf.Clamp01(power);

    static float AngleDiff(float a, float b)
    {
        float d = (a - b) % (Mathf.PI * 2f);
        if (d > Mathf.PI) d -= Mathf.PI * 2f;
        if (d < -Mathf.PI) d += Mathf.PI * 2f;
        return d;
    }

    bool CpuHold(int me, Cpu skill)
    {
        var a = A;
        var self = tops[me];
        var foe = tops[1 - me];
        if (self.charging == 0f) return cpuWait <= 0f;
        var rng = Mulberry((uint)(Mathf.FloorToInt(time * 7f) * 31) + seed + (uint)me);
        float fromCenter = Mathf.Sqrt(self.x * self.x + self.y * self.y);
        float want, travel;
        if (fromCenter > radius * 0.6f && rng() < 0.35f + skill.dodge)
        {
            want = Mathf.Atan2(-self.y, -self.x);
            travel = fromCenter * 0.7f;
        }
        else
        {
            want = Mathf.Atan2(foe.y - self.y, foe.x - self.x);
            travel = Mathf.Sqrt((foe.x - self.x) * (foe.x - self.x) + (foe.y - self.y) * (foe.y - self.y)) + 15f + 35f * skill.charge;
        }
        float ux = Mathf.Cos(want), uy = Mathf.Sin(want);
        float b = self.x * ux + self.y * uy;
        float c = self.x * self.x + self.y * self.y - radius * radius;
        float toEdge = -b + Mathf.Sqrt(Mathf.Max(0f, b * b - c));
        travel = Mathf.Min(travel, toEdge - 30f - (a.wind + a.swirl) * 0.6f);
        for (float d = 10f; d < travel; d += 8f)
        {
            float px = self.x + ux * d, py = self.y + uy * d;
            bool blocked = false;
            foreach (var h in a.pits) if (Mathf.Sqrt((px - h.x) * (px - h.x) + (py - h.y) * (py - h.y)) < h.r + TopR + 6f) blocked = true;
            foreach (var h in a.bumpers) if (Mathf.Sqrt((px - h.x) * (px - h.x) + (py - h.y) * (py - h.y)) < h.r + TopR + 6f) blocked = true;
            if (blocked) { travel = d - 16f; break; }
        }
        float needed = (travel * a.friction - MinDash) / (MaxDash - MinDash);
        float target = Mathf.Clamp(needed, 0.05f, 1f);
        bool aligned = Mathf.Abs(AngleDiff(self.angle, want)) < skill.tolerance;
        bool powered = Mathf.Abs(PowerOf(self.charging) - target) < 0.12f + skill.tolerance * 0.3f;
        if (aligned && powered) { cpuWait = skill.delay * (0.6f + rng() * 0.8f); return false; }
        if (self.charging > PowerPeriod * 4f) { cpuWait = skill.delay; return false; }
        return true;
    }

    void Step(bool[] hold, float dt)
    {
        var a = A;
        if (tops[0].@out || tops[1].@out) return;
        time += dt;
        cpuWait = Mathf.Max(0f, cpuWait - dt);
        radius = Mathf.Max(70f, a.radius - a.shrink * time - (time > RoundLimit ? (time - RoundLimit) * 6f : 0f));
        for (int i = 0; i < 2; i++)
        {
            var t = tops[i];
            if (hold[i])
            {
                if (t.charging == 0f) t.charging = 0.0001f;
                t.charging += dt;
                t.angle += AimSpeed * dt;
            }
            else if (t.charging > 0f)
            {
                float sp = DashSpeed(PowerOf(t.charging));
                t.vx += Mathf.Cos(t.angle) * sp;
                t.vy += Mathf.Sin(t.angle) * sp;
                t.spin -= 0.035f;
                t.charging = 0f;
                if (state == GameState.Playing)
                {
                    synth.Tone(220f + sp, 0.12f, Wave.Triangle, 0.2f, 120f + sp * 1.5f, 10f);
                    bursts.Emit(W(t.x, t.y, 0.1f), new Color(0.85f, 0.7f, 0.5f), 8, 2f, 0.2f, 0.4f, new Vector3(-Mathf.Cos(t.angle), 0.5f, Mathf.Sin(t.angle)) * 1.5f);
                }
            }
            t.vx += a.wind * dt;
            if (a.swirl != 0f)
            {
                float r = Mathf.Sqrt(t.x * t.x + t.y * t.y); if (r == 0f) r = 1f;
                t.vx += (-t.y / r) * a.swirl * dt;
                t.vy += (t.x / r) * a.swirl * dt;
            }
            float decay = Mathf.Exp(-a.friction * dt);
            t.vx *= decay; t.vy *= decay;
            t.x += t.vx * dt; t.y += t.vy * dt;
            t.spin -= dt * 0.012f;
            t.wobble = Mathf.Max(0f, t.wobble - dt * 2f);
        }
        var p = tops[0]; var q = tops[1];
        float dx = q.x - p.x, dy = q.y - p.y;
        float dist = Mathf.Sqrt(dx * dx + dy * dy);
        if (dist < TopR * 2f && dist > 0f)
        {
            float nx = dx / dist, ny = dy / dist;
            float overlap = TopR * 2f - dist;
            float mp = 1f + Mathf.Max(0f, p.spin), mq = 1f + Mathf.Max(0f, q.spin);
            p.x -= nx * overlap * (mq / (mp + mq)); p.y -= ny * overlap * (mq / (mp + mq));
            q.x += nx * overlap * (mp / (mp + mq)); q.y += ny * overlap * (mp / (mp + mq));
            float rel = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny;
            if (rel > 0f)
            {
                const float e = 1.15f;
                float j = (1f + e) * rel / (1f / mp + 1f / mq);
                p.vx -= j / mp * nx; p.vy -= j / mp * ny;
                q.vx += j / mq * nx; q.vy += j / mq * ny;
                p.spin -= rel * 0.00018f * (mq / mp);
                q.spin -= rel * 0.00018f * (mp / mq);
                p.wobble = q.wobble = 0.5f;
                if (state == GameState.Playing && hitCooldown <= 0f)
                {
                    hitCooldown = 0.12f;
                    var at = W((p.x + q.x) / 2f, (p.y + q.y) / 2f, 0.3f);
                    bursts.Emit(at, new Color(1f, 0.9f, 0.5f), Mathf.Clamp(Mathf.RoundToInt(rel / 25f), 6, 24), 3f + rel / 120f, 0.18f, 0.4f);
                    synth.Tone(700f + rel, 0.08f, Wave.Square, Mathf.Clamp(rel / 900f, 0.12f, 0.35f), 300f, 20f);
                    synth.Tone(90f, 0.15f, Wave.Noise, Mathf.Clamp(rel / 1500f, 0.05f, 0.2f), 0f, 12f);
                    shake = Mathf.Max(shake, Mathf.Clamp(rel / 1200f, 0.08f, 0.35f));
                }
            }
        }
        for (int i = 0; i < 2; i++)
        {
            var t = tops[i];
            foreach (var b in a.bumpers)
            {
                float bx = t.x - b.x, by = t.y - b.y;
                float d = Mathf.Sqrt(bx * bx + by * by);
                if (d < b.r + TopR && d > 0f)
                {
                    float nx = bx / d, ny = by / d;
                    t.x = b.x + nx * (b.r + TopR); t.y = b.y + ny * (b.r + TopR);
                    float vn = t.vx * nx + t.vy * ny;
                    if (vn < 0f)
                    {
                        t.vx -= 1.7f * vn * nx; t.vy -= 1.7f * vn * ny;
                        t.wobble = 0.4f;
                        if (state == GameState.Playing && -vn > 60f) synth.Tone(420f, 0.06f, Wave.Triangle, 0.15f, 0f, 25f);
                    }
                }
            }
        }
        for (int i = 0; i < 2; i++)
        {
            var t = tops[i];
            bool off = Mathf.Sqrt(t.x * t.x + t.y * t.y) > radius + TopR * 0.2f;
            bool pit = false;
            foreach (var h in a.pits) if (Mathf.Sqrt((t.x - h.x) * (t.x - h.x) + (t.y - h.y) * (t.y - h.y)) < h.r - 2f) pit = true;
            if (off || pit || t.spin <= 0f) t.@out = true;
        }
        if (state == GameState.Playing && (p.@out || q.@out)) EndRound();
    }

    void EndRound()
    {
        int w = tops[0].@out && tops[1].@out ? 2 : tops[0].@out ? 1 : 0;
        roundWinner = w;
        foreach (var t in tops) if (t.@out) { bursts.Emit(W(t.x, t.y, 0.2f), new Color(0.8f, 0.6f, 0.4f), 26, 4f, 0.3f, 0.7f); }
        shake = 0.4f;
        if (w == 0)
        {
            wins[0]++;
            score += 200 + Mathf.RoundToInt(Mathf.Max(0f, tops[0].spin) * 150f) + Mathf.RoundToInt(Mathf.Max(0f, 40f - time) * 3f);
            minWinSpin = Mathf.Min(minWinSpin, Mathf.Max(0f, tops[0].spin));
            Popup(tops[1].spin <= 0f ? U("It stopped spinning!") : U("Out of the ring!"), new Color(1f, 0.85f, 0.4f));
            StartCoroutine(Arp(new[] { 523f, 659f, 784f }, 0.07f));
        }
        else if (w == 1)
        {
            wins[1]++;
            lostRounds++;
            Popup(tops[0].spin <= 0f ? U("Your top ran out of spin") : U("You were pushed out"), new Color(0.6f, 0.75f, 1f));
            synth.Tone(240f, 0.35f, Wave.Saw, 0.22f, 110f, 5f);
        }
        else Popup(U("Both out! Go again"), Color.white);
        roundNo++;
        state = GameState.RoundEnd;
        roundTimer = 1.4f;
    }

    void NextRound()
    {
        if (wins[0] >= S.wins) { Finish(true); return; }
        if (wins[1] >= S.wins) { Finish(false); return; }
        ResetRound();
        state = GameState.Ready;
    }

    void Finish(bool won)
    {
        if (won)
        {
            score += stageIdx * 20;
            stars = 1 + (lostRounds == 0 ? 1 : 0) + (minWinSpin >= 0.55f ? 1 : 0);
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, stars, score, StageCount);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
        }
        else
        {
            endReason = U("The computer's top won the bout.");
            state = GameState.GameOver;
            synth.Tone(200f, 0.5f, Wave.Saw, 0.25f, 90f, 4f);
        }
    }

    void Popup(string t, Color c) { popup = t; popupColor = c; popupTimer = 1.3f; }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.2f, Wave.Triangle, 0.3f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    // ---------------- View ----------------
    void Sync(float dt)
    {
        popupTimer -= dt;
        if (ringT == null) return;
        float rr = radius * 2f * K;
        ringT.localScale = new Vector3(rr, rr, 1f);
        if (A.swirl != 0f) ringT.rotation = Quaternion.Euler(90f, time * A.swirl * 0.9f, 0f);
        bool closing = time > RoundLimit || A.shrink > 0f;
        edgeT.localScale = Vector3.one * (rr + 0.6f);
        edgeT.GetComponent<Renderer>().sharedMaterial.color = new Color(1f, 0.45f, 0.2f, closing ? 0.35f + 0.2f * Mathf.Sin(Time.time * 6f) : 0f);
        for (int i = 0; i < 2; i++)
        {
            var t = tops[i];
            if (t.t == null) continue;
            float fall = t.@out ? Mathf.Clamp01((t.spin <= 0f ? 0.3f : 1f)) : 0f;
            t.t.position = W(t.x, t.y, t.@out && t.spin > 0f ? -0.25f : 0f);
            float rate = Mathf.Lerp(200f, 1500f, Mathf.Clamp01(t.spin));
            t.spinAngle += rate * dt;
            float lean = t.@out ? 35f * fall : (1f - Mathf.Clamp01(t.spin)) * 18f + t.wobble * 22f;
            t.body.localRotation = Quaternion.Euler(lean * Mathf.Sin(Time.time * 9f + i), 0f, lean * Mathf.Cos(Time.time * 9f + i)) * Quaternion.Euler(0f, t.spinAngle, 0f);
            // aim arrow: lies on the floor and points where a dash would go; its length is the power
            bool show = t.charging > 0f;
            float pw = show ? PowerOf(t.charging) : 0f;
            var c = t.arrowMat.color; c.a = show ? (i == 0 ? 0.95f : 0.55f) : 0f; t.arrowMat.color = c;
            float len = 0.6f + pw * 1.6f;
            var dir = new Vector3(Mathf.Cos(t.angle), 0f, -Mathf.Sin(t.angle));
            t.arrow.position = t.t.position + dir * (TopR * K + len * 0.5f) + Vector3.up * 0.02f;
            t.arrow.rotation = Quaternion.LookRotation(Vector3.down, dir);
            t.arrow.localScale = new Vector3(0.45f, len, 1f);
        }
        foreach (var s in windStreaks)
        {
            s.position += Vector3.right * dt * 4f;
            if (s.position.x > 6f) s.position = new Vector3(-6f, s.position.y, Random.Range(-4f, 4f));
        }
    }

    void UpdateCamera(float dt)
    {
        float yaw = 0f;
        if (state == GameState.Menu) { menuSpin += dt; yaw = Mathf.Sin(menuSpin * 0.25f) * 25f; }
        var rot = Quaternion.Euler(60f, yaw, 0f);
        float r = (A.radius * K) + 0.55f;
        float lo = 3f, hi = 60f;
        float topMargin = Mathf.Min(0.2f, 92f * OiyoArcade.ComputeScale() / Mathf.Max(1f, Screen.height));
        float bottomMargin = Mathf.Min(0.16f, 70f * OiyoArcade.ComputeScale() / Mathf.Max(1f, Screen.height));
        for (int it = 0; it < 22; it++)
        {
            float mid = (lo + hi) * 0.5f;
            cam.transform.SetPositionAndRotation(-(rot * Vector3.forward) * mid, rot);
            bool fits = true;
            for (int k = 0; k < 16 && fits; k++)
            {
                float a = k * Mathf.PI * 2f / 16f;
                var v = cam.WorldToViewportPoint(new Vector3(Mathf.Cos(a) * r, 0.4f, Mathf.Sin(a) * r));
                if (v.z <= 0f || v.x < 0.03f || v.x > 0.97f || v.y < 0.02f + bottomMargin || v.y > 0.98f - topMargin) fits = false;
            }
            if (fits) hi = mid; else lo = mid;
        }
        var pos = -(rot * Vector3.forward) * hi + rot * Vector3.up * ((topMargin - bottomMargin) * hi * 0.35f);
        if (shake > 0f) { pos += Random.insideUnitSphere * shake * 0.3f; shake = Mathf.MoveTowards(shake, 0f, dt * 1.6f); }
        cam.transform.SetPositionAndRotation(pos, rot);
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.88f, 0.32f, 0.25f, 0.97f);
    static readonly Color Dark = new Color(0.08f, 0.05f, 0.04f, 0.86f);
    static readonly Color Gold = new Color(1f, 0.8f, 0.25f, 0.97f);
    static readonly Color Slate = new Color(0.28f, 0.22f, 0.2f, 0.95f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + U(Arenas[stages[i].arena].name);
    string GoalText() => S.wins > 1 ? U("Best of three bouts") : U("One bout");

    string SpinBar(float s)
    {
        int n = Mathf.Clamp(Mathf.CeilToInt(Mathf.Clamp01(s) * 10f), 0, 10);
        return new string('|', n) + "<color=#ffffff33>" + new string('|', 10 - n) + "</color>";
    }

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        var bar = new Rect(8f, 8f, w - 16f, 58f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 140f, 24f), "<b>" + StageTitle(stageIdx) + "</b>", 16, new Color(1f, 0.85f, 0.7f));
        string bouts = S.wins > 1 ? $"  <color=#ff8a80>{U("You")} {wins[0]}</color> : <color=#82b1ff>{wins[1]} {U("CPU")}</color>" : "";
        OiyoArcade.Text(new Rect(20f, 36f, w - 140f, 24f), $"{GoalText()}{bouts}   {U("Time")} <b>{Mathf.FloorToInt(time)}s</b>", 14, Color.white);
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", Slate, 18))
        {
            if (state == GameState.Playing || state == GameState.RoundEnd) { pausedFrom = state; state = GameState.Paused; }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        // spin meters
        float mw = Mathf.Min(170f, (w - 40f) / 2f);
        OiyoArcade.Text(new Rect(16f, 72f, mw, 20f), $"<color=#ff8a80>{U("Your spin")}</color>", 12, Color.white);
        OiyoArcade.Bar(new Rect(16f, 90f, mw, 8f), tops[0].spin, new Color(0f, 0f, 0f, 0.4f), You);
        OiyoArcade.Text(new Rect(w - 16f - mw, 72f, mw, 20f), $"<color=#82b1ff>{U("Rival spin")}</color>", 12, Color.white, TextAnchor.UpperRight);
        OiyoArcade.Bar(new Rect(w - 16f - mw, 90f, mw, 8f), tops[1].spin, new Color(0f, 0f, 0f, 0.4f), Rival);
        if (time > RoundLimit && state == GameState.Playing)
            OiyoArcade.Shadowed(new Rect(0f, 104f, w, 22f), U("The ring is closing in!"), 15, new Color(1f, 0.6f, 0.35f), TextAnchor.MiddleCenter);

        if (state == GameState.Playing)
        {
            float pw = tops[0].charging > 0f ? PowerOf(tops[0].charging) : 0f;
            var pr = new Rect(w * 0.5f - 120f, h - 46f, 240f, 14f);
            OiyoArcade.Shadowed(new Rect(pr.x, pr.y - 22f, pr.width, 20f), tops[0].charging > 0f ? U("Let go to dash") : U("Hold to aim"), 14, Color.white, TextAnchor.MiddleCenter);
            OiyoArcade.Bar(pr, pw, new Color(0f, 0f, 0f, 0.45f), Color.Lerp(new Color(1f, 0.85f, 0.3f), new Color(1f, 0.3f, 0.2f), pw));
        }
        if (popupTimer > 0f && (state == GameState.Playing || state == GameState.RoundEnd))
            OiyoArcade.Shadowed(new Rect(0f, h * 0.36f, w, 50f), popup, Mathf.RoundToInt(22 + Mathf.Min(1f, popupTimer) * 10f), popupColor, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
        {
            var r = new Rect(w * 0.5f - 175f, 108f, 350f, 118f);
            OiyoArcade.Panel(r, Dark);
            string head = roundNo == 0 ? U("Hold anywhere: the arrow sweeps round your red top") : F("Bout {0}", roundNo + 1);
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 8f, r.width - 24f, r.height - 16f),
                $"<b>{head}</b>\n<size=14>{U("Let go when it points at the rival. The power swings up and down while you hold.")}</size>", 16, Color.white, TextAnchor.MiddleCenter);
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
            OiyoArcade.Panel(box, new Color(0.08f, 0.05f, 0.04f, 0.94f));
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
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("Spin Sumo 3D"), 30, new Color(1f, 0.82f, 0.6f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 62f, cw - 40f, 46f), U("One button top wrestling. Aim, charge, let go and knock the rival top out of the ring."), 15, new Color(1f, 1f, 1f, 0.85f), TextAnchor.MiddleCenter);
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
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 70f, cw - 48f, 52f), "▶ " + U("Resume"), Accent, 19)) state = pausedFrom;
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
            $"<color=#ff8a80>{U("You")} <b>{wins[0]}</b></color> : <color=#82b1ff><b>{wins[1]}</b> {U("CPU")}</color>\n<size=14>{U("Score")} <b>{score}</b></size>", 18, Color.white, TextAnchor.MiddleCenter);
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
