using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Finger Air Hockey 3D: the web Finger Air Hockey (src/components/games/FingerHockey.tsx,
// src/lib/games/finger-hockey.ts) rebuilt as a 30-stage Unity game against the computer.
// The table physics are the web engine's, step for step, in the same 300x520 table units:
// mallets chase a target at a capped speed, the puck keeps a fraction of its speed per second
// (ice keeps more), a mallet always sends the puck, a parked puck is handed back after 4 s.
// The 12 web tables (posts, ice, sliding gate, pinball, two pucks, wind...) return across the
// 30 stages with a faster, sharper computer each time. First to the stage's goal count, or the
// leader after 90 s; a tie plays 30 s of golden-goal overtime.
// Drag anywhere on the table (the mallet sits a little above your finger so it stays visible),
// or use WASD/arrows. Space starts, Esc/P pauses.
public class FingerHockeyPlayer : MonoBehaviour
{
    const string Slug = "finger-hockey";
    const int StageCount = 30;
    const float TW = 300f, TH = 520f, MalletR = 24f, PuckR = 13f;
    const float MaxPuck = 900f, MalletSpeed = 1500f, CpuSpeedScale = 1.6f, KeySpeed = 520f;
    const float MatchSeconds = 90f, OvertimeSeconds = 30f;
    const float GateHalf = 34f, GateThick = 8f;
    const float K = 0.025f; // world units per table unit

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    struct Circle { public float x, y, r; public Circle(float x, float y, float r) { this.x = x; this.y = y; this.r = r; } }
    struct Cpu { public float speed, reaction, aim; public Cpu(float s, float r, float a) { speed = s; reaction = r; aim = a; } }
    class Table { public string name; public float goal, friction, wind; public Circle[] bumpers; public bool gate; public int pucks; public Cpu cpu; }

    static readonly Table[] Tables =
    {
        new Table { name = "Classic", goal = 120, friction = 0.75f, bumpers = new Circle[0], pucks = 1, cpu = new Cpu(380, 0.22f, 0.35f) },
        new Table { name = "Wide goals", goal = 150, friction = 0.75f, bumpers = new Circle[0], pucks = 1, cpu = new Cpu(430, 0.2f, 0.4f) },
        new Table { name = "Two posts", goal = 120, friction = 0.75f, bumpers = new[] { new Circle(90, 260, 16), new Circle(210, 260, 16) }, pucks = 1, cpu = new Cpu(470, 0.19f, 0.45f) },
        new Table { name = "Slick ice", goal = 110, friction = 0.93f, bumpers = new Circle[0], pucks = 1, cpu = new Cpu(500, 0.18f, 0.5f) },
        new Table { name = "Narrow goals", goal = 90, friction = 0.75f, bumpers = new Circle[0], pucks = 1, cpu = new Cpu(520, 0.17f, 0.55f) },
        new Table { name = "Sliding gate", goal = 120, friction = 0.78f, bumpers = new Circle[0], gate = true, pucks = 1, cpu = new Cpu(540, 0.16f, 0.55f) },
        new Table { name = "Pinball", goal = 115, friction = 0.8f, bumpers = new[] { new Circle(150, 170, 14), new Circle(75, 260, 14), new Circle(225, 260, 14), new Circle(150, 350, 14) }, pucks = 1, cpu = new Cpu(560, 0.15f, 0.6f) },
        new Table { name = "Two pucks", goal = 120, friction = 0.78f, bumpers = new Circle[0], pucks = 2, cpu = new Cpu(580, 0.15f, 0.6f) },
        new Table { name = "Windy", goal = 115, friction = 0.82f, bumpers = new Circle[0], pucks = 1, wind = 140, cpu = new Cpu(600, 0.14f, 0.65f) },
        new Table { name = "Ice gate", goal = 105, friction = 0.92f, bumpers = new Circle[0], gate = true, pucks = 1, cpu = new Cpu(620, 0.13f, 0.65f) },
        new Table { name = "Chaos", goal = 115, friction = 0.82f, bumpers = new[] { new Circle(70, 200, 14), new Circle(230, 320, 14) }, pucks = 2, cpu = new Cpu(650, 0.12f, 0.7f) },
        new Table { name = "Final", goal = 95, friction = 0.88f, bumpers = new[] { new Circle(150, 140, 12), new Circle(150, 380, 12) }, gate = true, pucks = 1, cpu = new Cpu(700, 0.1f, 0.75f) },
    };

    struct StageDef { public int table, goals; public Cpu cpu; }
    StageDef[] stages;
    int stageIdx;
    StageDef S => stages[stageIdx];
    Table T => Tables[S.table];

    class Body { public float x, y, vx, vy; public Transform t; }
    readonly Body[] mallets = { new Body(), new Body() }; // 0 = you (bottom), 1 = computer (top)
    readonly Vector2[] targets = new Vector2[2];
    readonly List<Body> pucks = new List<Body>();
    readonly List<float> idle = new List<float>();
    readonly int[] goals = new int[2];
    float time, pause, cpuThink;
    uint rng = 1;
    int score, stars;
    string endReason = "";
    string popup = ""; float popupTimer; Color popupColor;

    Camera cam;
    Transform root, gateT;
    Material puckMat;
    Bursts bursts;
    Synth synth;
    bool showStages;
    float shake, goalFlash, menuSpin;
    int dragId = int.MinValue;
    Vector3 camFocus;

    static readonly Color Red = new Color(0.92f, 0.25f, 0.3f);
    static readonly Color Blue = new Color(0.22f, 0.5f, 0.95f);

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
            int t = Mathf.Min(Tables.Length - 1, Mathf.FloorToInt(i * 0.4f));
            int sub = 0;
            for (int j = i - 1; j >= 0 && Mathf.Min(Tables.Length - 1, Mathf.FloorToInt(j * 0.4f)) == t; j--) sub++;
            var b = Tables[t].cpu;
            // the first stages are a warm-up: a slower, sleepier computer than the web table 1
            float k = i < 3 ? 0.7f + i * 0.1f : 1f + sub * 0.07f + (i >= 26 ? 0.05f : 0f);
            stages[i] = new StageDef
            {
                table = t,
                goals = i < 4 ? 3 : i < 12 ? 4 : 5,
                cpu = new Cpu(b.speed * k, Mathf.Max(0.07f, b.reaction / k), Mathf.Min(0.9f, b.aim + sub * 0.04f)),
            };
        }
    }

    void SetupScene()
    {
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 45f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.05f, 0.05f, 0.1f);
        var key = new GameObject("Key").AddComponent<Light>();
        key.type = LightType.Directional;
        key.intensity = 0.9f;
        key.color = new Color(1f, 0.97f, 0.92f);
        key.transform.rotation = Quaternion.Euler(55f, 25f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.45f, 0.47f, 0.58f);
        puckMat = OiyoArcade.Lit(new Color(0.12f, 0.12f, 0.16f), 0.7f);
        bursts = new Bursts(transform, 0.3f);
        synth = new Synth(gameObject);
    }

    // table units -> world
    static Vector3 W(float x, float y, float h = 0f) => new Vector3((x - TW / 2f) * K, h, (TH / 2f - y) * K);

    void BuildTable()
    {
        var t = T;
        var floor = OiyoArcade.Prim(PrimitiveType.Quad, "Floor", OiyoArcade.Lit(Color.white, 0.2f, OiyoArcade.Art("FH/floor", true)), root);
        floor.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        floor.transform.position = new Vector3(0f, -1.2f, 0f);
        floor.transform.localScale = new Vector3(60f, 60f, 1f);
        floor.GetComponent<Renderer>().sharedMaterial.mainTextureScale = new Vector2(10f, 10f);

        var body = OiyoArcade.Prim(PrimitiveType.Cube, "Cabinet", OiyoArcade.Lit(new Color(0.16f, 0.18f, 0.3f), 0.4f), root);
        body.transform.position = new Vector3(0f, -0.62f, 0f);
        body.transform.localScale = new Vector3(TW * K + 0.9f, 1.2f, TH * K + 1.3f);
        var trim = OiyoArcade.Prim(PrimitiveType.Cube, "Trim", OiyoArcade.Glow(new Color(0.35f, 0.75f, 1f)), root);
        trim.transform.position = new Vector3(0f, -0.08f, 0f);
        trim.transform.localScale = new Vector3(TW * K + 0.95f, 0.04f, TH * K + 1.35f);

        var deck = OiyoArcade.Prim(PrimitiveType.Quad, "Deck", OiyoArcade.Lit(Color.white, 0.85f, OiyoArcade.Art("FH/table")), root);
        deck.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        deck.transform.position = new Vector3(0f, 0.001f, 0f);
        deck.transform.localScale = new Vector3(TW * K, TH * K, 1f);

        // rails, leaving the goal mouths open
        var railMat = OiyoArcade.Lit(Color.white, 0.6f, OiyoArcade.Art("FH/rail"), 0.4f);
        float rh = 0.22f, rw = 0.22f;
        Rail(railMat, new Vector3(-(TW / 2f) * K - rw / 2f, rh / 2f, 0f), new Vector3(rw, rh, TH * K + rw * 2f));
        Rail(railMat, new Vector3((TW / 2f) * K + rw / 2f, rh / 2f, 0f), new Vector3(rw, rh, TH * K + rw * 2f));
        float side = (TW - t.goal) / 2f * K;
        foreach (float zs in new[] { 1f, -1f })
        {
            float z = zs * ((TH / 2f) * K + rw / 2f);
            Rail(railMat, new Vector3(-(TW / 2f) * K + side / 2f, rh / 2f, z), new Vector3(side, rh, rw));
            Rail(railMat, new Vector3((TW / 2f) * K - side / 2f, rh / 2f, z), new Vector3(side, rh, rw));
            var mouth = OiyoArcade.Prim(PrimitiveType.Cube, "Goal", OiyoArcade.Lit(new Color(0.03f, 0.03f, 0.05f), 0.1f), root);
            mouth.transform.position = new Vector3(0f, 0.02f, z + zs * 0.05f);
            mouth.transform.localScale = new Vector3(t.goal * K, 0.06f, rw + 0.1f);
            var glow = OiyoArcade.Prim(PrimitiveType.Cube, "GoalGlow", OiyoArcade.Glow(zs > 0 ? Blue : Red), root);
            glow.transform.position = new Vector3(0f, 0.12f, z + zs * 0.2f);
            glow.transform.localScale = new Vector3(t.goal * K + 0.1f, 0.05f, 0.05f);
        }

        var postMat = OiyoArcade.Lit(new Color(1f, 0.72f, 0.2f), 0.7f, null, 0.3f);
        foreach (var b in t.bumpers)
        {
            var p = OiyoArcade.Prim(PrimitiveType.Cylinder, "Bumper", postMat, root);
            p.transform.position = W(b.x, b.y, 0.15f);
            p.transform.localScale = new Vector3(b.r * 2f * K, 0.15f, b.r * 2f * K);
            OiyoArcade.GlowQuad("Glow", new Color(1f, 0.75f, 0.3f, 0.45f), b.r * 5f * K, root).transform.SetPositionAndRotation(W(b.x, b.y, 0.01f), Quaternion.Euler(90f, 0f, 0f));
        }
        gateT = null;
        if (t.gate)
        {
            gateT = OiyoArcade.Prim(PrimitiveType.Cube, "Gate", OiyoArcade.Lit(new Color(0.55f, 0.35f, 0.95f), 0.6f), root).transform;
            gateT.localScale = new Vector3(GateHalf * 2f * K, 0.24f, GateThick * K * 1.6f);
        }

        for (int s = 0; s < 2; s++)
        {
            var c = s == 0 ? Red : Blue;
            var m = mallets[s];
            m.t = new GameObject(s == 0 ? "You" : "Computer").transform;
            m.t.SetParent(root, false);
            var bodyMat = OiyoArcade.Lit(c, 0.75f);
            var disc = OiyoArcade.Prim(PrimitiveType.Cylinder, "Base", bodyMat, m.t);
            disc.transform.localPosition = new Vector3(0f, 0.08f, 0f);
            disc.transform.localScale = new Vector3(MalletR * 2f * K, 0.08f, MalletR * 2f * K);
            var ring = OiyoArcade.Prim(PrimitiveType.Cylinder, "Ring", OiyoArcade.Lit(Color.Lerp(c, Color.white, 0.55f), 0.8f), m.t);
            ring.transform.localPosition = new Vector3(0f, 0.17f, 0f);
            ring.transform.localScale = new Vector3(MalletR * 1.4f * K, 0.03f, MalletR * 1.4f * K);
            var knob = OiyoArcade.Prim(PrimitiveType.Sphere, "Knob", bodyMat, m.t);
            knob.transform.localPosition = new Vector3(0f, 0.34f, 0f);
            knob.transform.localScale = new Vector3(0.42f, 0.36f, 0.42f);
            var g = OiyoArcade.GlowQuad("Glow", new Color(c.r, c.g, c.b, 0.4f), MalletR * 4.2f * K, m.t);
            g.transform.localPosition = new Vector3(0f, 0.01f, 0f);
            g.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
        }
    }

    void Rail(Material mat, Vector3 pos, Vector3 size)
    {
        if (size.x <= 0.01f || size.z <= 0.01f) return;
        var r = OiyoArcade.Prim(PrimitiveType.Cube, "Rail", mat, root);
        r.transform.position = pos;
        r.transform.localScale = size;
    }

    Body MakePuck(float x, float y)
    {
        var b = new Body { x = x, y = y };
        b.t = new GameObject("Puck").transform;
        b.t.SetParent(root, false);
        var disc = OiyoArcade.Prim(PrimitiveType.Cylinder, "Disc", puckMat, b.t);
        disc.transform.localPosition = new Vector3(0f, 0.06f, 0f);
        disc.transform.localScale = new Vector3(PuckR * 2f * K, 0.06f, PuckR * 2f * K);
        var top = OiyoArcade.Prim(PrimitiveType.Cylinder, "Top", OiyoArcade.Glow(new Color(1f, 0.85f, 0.3f)), b.t);
        top.transform.localPosition = new Vector3(0f, 0.121f, 0f);
        top.transform.localScale = new Vector3(PuckR * 1.1f * K, 0.002f, PuckR * 1.1f * K);
        var halo = OiyoArcade.Prim(PrimitiveType.Quad, "Halo", OiyoArcade.Transparent(OiyoArcade.Art("FH/ring"), new Color(1f, 0.85f, 0.3f, 0.7f)), b.t);
        halo.transform.localPosition = new Vector3(0f, 0.01f, 0f);
        halo.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
        halo.transform.localScale = Vector3.one * PuckR * 3.4f * K;
        return b;
    }

    void ServePucks(int to)
    {
        foreach (var p in pucks) if (p.t != null) Destroy(p.t.gameObject);
        pucks.Clear(); idle.Clear();
        for (int k = 0; k < T.pucks; k++)
        {
            float x = T.pucks == 1 ? TW / 2f : TW / 2f + (k == 1 ? 60f : -60f);
            pucks.Add(MakePuck(x, TH / 2f + (to == 0 ? 40f : -40f)));
            idle.Add(0f);
        }
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Table").transform;
        pucks.Clear(); idle.Clear();
        BuildTable();
        mallets[0].x = TW / 2f; mallets[0].y = TH - 70f;
        mallets[1].x = TW / 2f; mallets[1].y = 70f;
        for (int s = 0; s < 2; s++) { mallets[s].vx = mallets[s].vy = 0f; targets[s] = new Vector2(mallets[s].x, mallets[s].y); }
        rng = (uint)(Random.Range(1, 1000000) * 2654435761u);
        goals[0] = goals[1] = 0;
        time = 0f; pause = 0.8f; cpuThink = 0f;
        score = stars = 0;
        endReason = ""; popup = ""; goalFlash = 0f;
        ServePucks(Random.value < 0.5f ? 0 : 1);
        dragId = int.MinValue;
        showStages = false;
        state = ready ? GameState.Ready : GameState.Menu;
        SyncVisuals(0f);
    }

    float Rand() { rng = rng * 1664525u + 1013904223u; return rng / 4294967296f; }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("finger-hockey", state, score);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        ReadInput(dt);
        if (state == GameState.Playing)
        {
            int n = Mathf.CeilToInt(dt / (1f / 120f));
            for (int i = 0; i < n && state == GameState.Playing; i++) Step(dt / n);
        }
        else if (state == GameState.Menu) DemoStep(dt);
        SyncVisuals(dt);
        UpdateCamera(dt);
    }

    // The menu shows the computer playing itself so the table is alive behind the card.
    void DemoStep(float dt)
    {
        cpuThink -= dt;
        if (cpuThink <= 0f) { cpuThink = 0.2f; targets[0] = CpuTarget(0, T.cpu); targets[1] = CpuTarget(1, T.cpu); }
        time += dt;
        Physics(dt, true);
        if (goals[0] + goals[1] > 0) { goals[0] = goals[1] = 0; }
    }

    // ---------------- Input ----------------
    Vector2 TableAt(Vector2 screen)
    {
        var ray = cam.ScreenPointToRay(screen);
        var plane = new Plane(Vector3.up, Vector3.zero);
        if (!plane.Raycast(ray, out float d)) return targets[0];
        var p = ray.GetPoint(d);
        return new Vector2(p.x / K + TW / 2f, TH / 2f - p.z / K);
    }

    static Vector2 Clamp(int side, Vector2 p)
    {
        float x = Mathf.Clamp(p.x, MalletR, TW - MalletR);
        float lo = side == 0 ? TH / 2f + MalletR : MalletR;
        float hi = side == 0 ? TH - MalletR : TH / 2f - MalletR;
        return new Vector2(x, Mathf.Clamp(p.y, lo, hi));
    }

    void ReadInput(float dt)
    {
        bool confirm = Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return);
        var presses = OiyoArcade.Began();
        Vector2 key = new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
        switch (state)
        {
            case GameState.Ready:
                if (confirm || presses.Count > 0 || key.sqrMagnitude > 0.01f) state = GameState.Playing;
                if (presses.Count > 0) dragId = presses[0].id;
                return;
            case GameState.Playing:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) { state = GameState.Paused; return; }
                if (presses.Count > 0) dragId = presses[0].id;
                bool held = false;
                foreach (var p in OiyoArcade.Held())
                    if (p.id == dragId)
                    {
                        held = true;
                        // the mallet sits a little above the finger so the thumb never hides it
                        var at = TableAt(p.pos + new Vector2(0f, Screen.height * 0.045f));
                        targets[0] = Clamp(0, at);
                    }
                foreach (var p in OiyoArcade.Ended()) if (p.id == dragId) dragId = int.MinValue;
                if (!held && key.sqrMagnitude > 0.01f)
                {
                    // arrows move the mallet in screen directions, whichever way the table is turned
                    var right = cam.transform.right; right.y = 0f; right.Normalize();
                    var fwd = Vector3.Cross(right, Vector3.up);
                    var dir = right * key.x + fwd * key.y;
                    var move = new Vector2(dir.x, -dir.z).normalized * KeySpeed * dt;
                    targets[0] = Clamp(0, new Vector2(mallets[0].x, mallets[0].y) + move * 1.5f);
                }
                return;
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm) LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                return;
            case GameState.Menu:
                if (!showStages && confirm) LoadStage(stageIdx);
                return;
        }
    }

    // ---------------- Simulation (port of src/lib/games/finger-hockey.ts) ----------------
    Vector2 CpuTarget(int side, Cpu skill)
    {
        float own = side == 1 ? 0f : TH;
        float dir = side == 1 ? 1f : -1f;
        var mal = mallets[side];
        var p = pucks[0];
        foreach (var q in pucks) if (Mathf.Abs(q.y - own) < Mathf.Abs(p.y - own)) p = q;
        bool inHalf = side == 1 ? p.y < TH / 2f : p.y > TH / 2f;
        bool coming = p.vy * dir < 0f;
        float homeY = own + dir * 60f;
        if (inHalf && (!coming || Mathf.Abs(p.vy) < 260f))
        {
            float goalW = T.goal;
            float corner = (Rand() < 0.5f ? -1f : 1f) * goalW * 0.3f;
            float aimX = TW / 2f + corner + (Rand() - 0.5f) * (TW - 40f) * (1f - skill.aim);
            float aimY = side == 1 ? TH : 0f;
            float ux = aimX - p.x, uy = aimY - p.y;
            float ud = Mathf.Sqrt(ux * ux + uy * uy); if (ud == 0f) ud = 1f;
            ux /= ud; uy /= ud;
            float reach = MalletR + PuckR;
            float relX = mal.x - p.x, relY = mal.y - p.y;
            float along = relX * ux + relY * uy;
            float across = Mathf.Abs(relX * -uy + relY * ux);
            if (along < -reach * 0.5f && across < reach * 0.8f) return Clamp(side, new Vector2(p.x + ux * 45f, p.y + uy * 45f));
            float bx = p.x - ux * (reach + 8f), by = p.y - uy * (reach + 8f);
            if (along > -reach * 0.5f)
            {
                float sideSign = relX * -uy + relY * ux >= 0f ? 1f : -1f;
                return Clamp(side, new Vector2(bx + -uy * sideSign * (reach + 10f), by + ux * sideSign * (reach + 10f)));
            }
            return Clamp(side, new Vector2(bx, by));
        }
        float gx = TW / 2f;
        float tt = Mathf.Min(1f, 60f / Mathf.Max(1f, Mathf.Abs(p.y - own)));
        return Clamp(side, new Vector2(gx + (p.x - gx) * (0.55f + tt * 0.3f), homeY));
    }

    static bool CollideCircle(Body p, float cx, float cy, float cr, float cvx, float cvy, float bounce)
    {
        float dx = p.x - cx, dy = p.y - cy;
        float d = Mathf.Sqrt(dx * dx + dy * dy);
        float min = PuckR + cr;
        if (d >= min || d == 0f) return false;
        float nx = dx / d, ny = dy / d;
        p.x = cx + nx * min; p.y = cy + ny * min;
        float rvx = p.vx - cvx, rvy = p.vy - cvy;
        float vn = rvx * nx + rvy * ny;
        if (vn < 0f) { p.vx -= (1f + bounce) * vn * nx; p.vy -= (1f + bounce) * vn * ny; }
        return true;
    }

    float GateX(float t) => TW / 2f + Mathf.Sin(t * 1.1f) * (TW / 2f - 50f);

    void Step(float dt)
    {
        time += dt;
        cpuThink -= dt;
        if (cpuThink <= 0f) { cpuThink = S.cpu.reaction; targets[1] = CpuTarget(1, S.cpu); }
        var ev = Physics(dt, false);
        if (ev.hit) { synth.Tone(320f + Random.value * 60f, 0.07f, Wave.Square, 0.22f, 160f, 18f); }
        else if (ev.wall) synth.Tone(900f, 0.04f, Wave.Triangle, 0.1f, 0f, 30f);
        if (ev.goal >= 0) OnGoal(ev.goal);
        int w = Winner();
        if (w >= 0) Finish(w);
    }

    struct Ev { public bool hit, wall; public int goal; }

    Ev Physics(float dt, bool demo)
    {
        var ev = new Ev { goal = -1 };
        var t = T;
        for (int s = 0; s < 2; s++)
        {
            var mal = mallets[s];
            var tgt = targets[s];
            float maxSpeed = (demo || s == 1) ? (demo ? t.cpu.speed : S.cpu.speed) * CpuSpeedScale : MalletSpeed;
            float dx = tgt.x - mal.x, dy = tgt.y - mal.y;
            float d = Mathf.Sqrt(dx * dx + dy * dy);
            float step = Mathf.Min(d, maxSpeed * dt);
            float nx = d > 0f ? dx / d * step : 0f, ny = d > 0f ? dy / d * step : 0f;
            mal.vx = nx / dt; mal.vy = ny / dt;
            mal.x += nx; mal.y += ny;
        }
        if (pause > 0f) { pause -= dt; return ev; }
        float keep = Mathf.Pow(t.friction, dt);
        float gx = GateX(time);
        for (int k = 0; k < pucks.Count; k++)
        {
            var p = pucks[k];
            p.vx += t.wind * Mathf.Sin(time * 0.5f) * dt;
            p.vx *= keep; p.vy *= keep;
            float sp = Mathf.Sqrt(p.vx * p.vx + p.vy * p.vy);
            if (sp > MaxPuck) { p.vx *= MaxPuck / sp; p.vy *= MaxPuck / sp; }
            p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.x < PuckR) { p.x = PuckR; p.vx = Mathf.Abs(p.vx) * 0.9f; ev.wall = true; }
            if (p.x > TW - PuckR) { p.x = TW - PuckR; p.vx = -Mathf.Abs(p.vx) * 0.9f; ev.wall = true; }
            bool inMouth = Mathf.Abs(p.x - TW / 2f) < t.goal / 2f - PuckR * 0.3f;
            if (p.y < PuckR)
            {
                if (inMouth && p.y < -PuckR) { ev.goal = 0; break; }
                if (!inMouth) { p.y = PuckR; p.vy = Mathf.Abs(p.vy) * 0.9f; ev.wall = true; }
            }
            if (p.y > TH - PuckR)
            {
                if (inMouth && p.y > TH + PuckR) { ev.goal = 1; break; }
                if (!inMouth) { p.y = TH - PuckR; p.vy = -Mathf.Abs(p.vy) * 0.9f; ev.wall = true; }
            }
            foreach (var b in t.bumpers) if (CollideCircle(p, b.x, b.y, b.r, 0f, 0f, 0.95f)) ev.wall = true;
            if (t.gate)
            {
                float top = TH / 2f - GateThick / 2f - PuckR, bottom = TH / 2f + GateThick / 2f + PuckR;
                if (Mathf.Abs(p.x - gx) < GateHalf && p.y > top && p.y < bottom)
                {
                    if (p.vy > 0f) { p.y = top; p.vy = -Mathf.Abs(p.vy) * 0.9f; } else { p.y = bottom; p.vy = Mathf.Abs(p.vy) * 0.9f; }
                    ev.wall = true;
                }
            }
            foreach (var mal in mallets)
            {
                if (!CollideCircle(p, mal.x, mal.y, MalletR, mal.vx, mal.vy, 0.85f)) continue;
                ev.hit = true;
                float s = Mathf.Sqrt(p.vx * p.vx + p.vy * p.vy);
                float ms = Mathf.Sqrt(mal.vx * mal.vx + mal.vy * mal.vy);
                if (ms > 150f && s < ms * 1.6f) { float k2 = ms * 1.6f / (s > 0f ? s : 1f); p.vx *= k2; p.vy *= k2; }
                else if (s < 140f)
                {
                    float dx = p.x - mal.x, dy = p.y - mal.y;
                    float d = Mathf.Sqrt(dx * dx + dy * dy); if (d == 0f) d = 1f;
                    p.vx = dx / d * 140f; p.vy = dy / d * 140f;
                }
                if (!demo) bursts.Emit(W(p.x, p.y, 0.1f), Color.white, 5, 2f, 0.12f, 0.25f);
            }
            for (int j = k + 1; j < pucks.Count; j++)
            {
                var q = pucks[j];
                float dx = q.x - p.x, dy = q.y - p.y;
                float d = Mathf.Sqrt(dx * dx + dy * dy);
                if (d > 0f && d < PuckR * 2f)
                {
                    float nx = dx / d, ny = dy / d, push = (PuckR * 2f - d) / 2f;
                    p.x -= nx * push; p.y -= ny * push; q.x += nx * push; q.y += ny * push;
                    float rv = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
                    if (rv < 0f) { p.vx += rv * nx; p.vy += rv * ny; q.vx -= rv * nx; q.vy -= rv * ny; }
                }
            }
            idle[k] = Mathf.Sqrt(p.vx * p.vx + p.vy * p.vy) < 25f ? idle[k] + dt : 0f;
            if (idle[k] > 4f)
            {
                p.x = TW / 2f; p.y = TH / 2f + (p.y > TH / 2f ? -40f : 40f);
                p.vx = p.vy = 0f; idle[k] = 0f;
            }
        }
        if (ev.goal >= 0)
        {
            goals[ev.goal]++;
            pause = 1.1f;
            var at = pucks.Count > 0 ? W(pucks[0].x, ev.goal == 0 ? 0f : TH, 0.2f) : Vector3.zero;
            if (!demo) bursts.Emit(at, ev.goal == 0 ? Red : Blue, 40, 6f, 0.3f, 0.8f);
            ServePucks(ev.goal == 0 ? 1 : 0);
        }
        return ev;
    }

    void OnGoal(int who)
    {
        shake = 0.35f;
        goalFlash = 1f;
        if (who == 0)
        {
            Popup(U("GOAL!"), new Color(1f, 0.85f, 0.4f));
            StartCoroutine(Arp(new[] { 523f, 659f, 784f }, 0.07f));
        }
        else
        {
            Popup(U("Computer scores"), new Color(0.6f, 0.75f, 1f));
            synth.Tone(240f, 0.35f, Wave.Saw, 0.22f, 110f, 5f);
        }
    }

    int Winner()
    {
        if (goals[0] >= S.goals) return 0;
        if (goals[1] >= S.goals) return 1;
        if (time >= MatchSeconds)
        {
            if (goals[0] != goals[1]) return goals[0] > goals[1] ? 0 : 1;
            if (time >= MatchSeconds + OvertimeSeconds) return 2;
        }
        return -1;
    }

    void Finish(int w)
    {
        int margin = goals[0] - goals[1];
        score = goals[0] * 100 + Mathf.Max(0, margin) * 50;
        if (w == 0)
        {
            score += Mathf.RoundToInt(Mathf.Max(0f, MatchSeconds - time) * 2f) + stageIdx * 10;
            stars = goals[1] <= 1 ? 3 : margin >= 2 ? 2 : 1;
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, stars, score, StageCount);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
        }
        else
        {
            endReason = w == 2 ? U("Overtime ended level. A draw does not clear the table.") : U("The computer got there first.");
            state = GameState.GameOver;
            synth.Tone(200f, 0.5f, Wave.Saw, 0.25f, 90f, 4f);
        }
    }

    void Popup(string t, Color c) { popup = t; popupColor = c; popupTimer = 0.9f; }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.2f, Wave.Triangle, 0.3f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    // ---------------- View ----------------
    void SyncVisuals(float dt)
    {
        popupTimer -= dt;
        goalFlash = Mathf.MoveTowards(goalFlash, 0f, dt * 1.5f);
        for (int s = 0; s < 2; s++) if (mallets[s].t != null) mallets[s].t.position = W(mallets[s].x, mallets[s].y);
        foreach (var p in pucks)
        {
            if (p.t == null) continue;
            p.t.position = W(p.x, p.y);
            p.t.Rotate(0f, (p.vx - p.vy) * dt * 0.6f, 0f, Space.Self);
            // a freshly served puck pulses until play resumes
            p.t.localScale = Vector3.one * (pause > 0f ? Mathf.Lerp(1f, 1.15f, Mathf.Abs(Mathf.Sin(Time.time * 7f))) : 1f);
        }
        if (gateT != null) gateT.position = W(GateX(time), TH / 2f, 0.12f);
    }

    void UpdateCamera(float dt)
    {
        bool land = cam.aspect > 1.05f;
        float yaw = land ? -90f : 0f;
        if (state == GameState.Menu) { menuSpin += dt; yaw += Mathf.Sin(menuSpin * 0.3f) * 12f; }
        float pitch = land ? 58f : 62f;
        var rot = Quaternion.Euler(pitch, yaw, 0f);
        // find the closest distance at which the whole table (plus rails) fits under the HUD
        float lo = 4f, hi = 60f;
        var center = new Vector3(0f, 0f, 0f);
        float hx = TW / 2f * K + 0.35f, hz = TH / 2f * K + 0.45f;
        var corners = new[] { new Vector3(-hx, 0.25f, -hz), new Vector3(hx, 0.25f, -hz), new Vector3(-hx, 0.25f, hz), new Vector3(hx, 0.25f, hz) };
        float topMargin = Mathf.Min(0.2f, 92f * OiyoArcade.ComputeScale() / Mathf.Max(1f, Screen.height));
        // room for the page frame's round exit button in the bottom-left corner on phones
        float bottomMargin = Mathf.Min(0.12f, 60f * OiyoArcade.ComputeScale() / Mathf.Max(1f, Screen.height));
        for (int it = 0; it < 22; it++)
        {
            float mid = (lo + hi) * 0.5f;
            cam.transform.SetPositionAndRotation(center - rot * Vector3.forward * mid, rot);
            bool fits = true;
            foreach (var c in corners)
            {
                var v = cam.WorldToViewportPoint(c);
                if (v.z <= 0f || v.x < 0.02f || v.x > 0.98f || v.y < 0.02f + bottomMargin || v.y > 0.98f - topMargin) { fits = false; break; }
            }
            if (fits) hi = mid; else lo = mid;
        }
        var pos = center - rot * Vector3.forward * hi;
        // nudge the view down a little so the table sits under the HUD bar
        pos += rot * Vector3.up * ((topMargin - bottomMargin) * hi * 0.35f);
        if (shake > 0f) { pos += Random.insideUnitSphere * shake * 0.25f; shake = Mathf.MoveTowards(shake, 0f, dt * 1.5f); }
        cam.transform.SetPositionAndRotation(pos, rot);
        cam.backgroundColor = Color.Lerp(new Color(0.05f, 0.05f, 0.1f), new Color(0.25f, 0.2f, 0.08f), goalFlash * 0.6f);
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.9f, 0.27f, 0.33f, 0.97f);
    static readonly Color Dark = new Color(0.04f, 0.05f, 0.1f, 0.86f);
    static readonly Color Gold = new Color(1f, 0.8f, 0.25f, 0.97f);
    static readonly Color Slate = new Color(0.2f, 0.22f, 0.34f, 0.95f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + U(Tables[stages[i].table].name);
    string GoalText() => F("First to {0} goals", S.goals);

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        var bar = new Rect(8f, 8f, w - 16f, 58f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 140f, 24f), "<b>" + StageTitle(stageIdx) + "</b>", 16, new Color(0.75f, 0.85f, 1f));
        float left = time < MatchSeconds ? MatchSeconds - time : Mathf.Max(0f, MatchSeconds + OvertimeSeconds - time);
        string clock = time < MatchSeconds ? $"{U("Time")} <b>{Mathf.CeilToInt(left)}s</b>" : $"<color=#ffd54a>{F("Overtime {0}s", Mathf.CeilToInt(left))}</color>";
        OiyoArcade.Text(new Rect(20f, 36f, w - 140f, 24f),
            $"<color=#ff7a85>{U("You")} <b>{goals[0]}</b></color> : <color=#7fb0ff><b>{goals[1]}</b> {U("CPU")}</color>   {clock}   <size=12>{GoalText()}</size>", 15, Color.white);
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        OiyoArcade.Bar(new Rect(16f, 70f, w - 32f, 6f), time < MatchSeconds ? time / MatchSeconds : (time - MatchSeconds) / OvertimeSeconds, new Color(0f, 0f, 0f, 0.35f), time < MatchSeconds ? Gold : new Color(1f, 0.45f, 0.3f));
        if (T.wind > 0f && state == GameState.Playing)
        {
            float wv = Mathf.Sin(time * 0.5f);
            string arrow = wv > 0.15f ? "→→" : wv < -0.15f ? "←←" : "·";
            OiyoArcade.Shadowed(new Rect(0f, 80f, w, 22f), $"{U("Wind")} {arrow}", 14, new Color(0.7f, 0.9f, 1f), TextAnchor.MiddleCenter);
        }
        if (popupTimer > 0f && state == GameState.Playing)
            OiyoArcade.Shadowed(new Rect(0f, h * 0.42f, w, 50f), popup, Mathf.RoundToInt(26 + popupTimer * 14f), popupColor, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
        {
            var r = new Rect(w * 0.5f - 175f, h * 0.58f, 350f, 110f);
            OiyoArcade.Panel(r, Dark);
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 8f, r.width - 24f, r.height - 16f),
                $"<b>{U("Drag on the table to move your red mallet")}</b>\n<size=14>{GoalText()} · {U("arrow keys work too")}</size>", 16, Color.white, TextAnchor.MiddleCenter);
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
            OiyoArcade.Panel(box, new Color(0.04f, 0.05f, 0.1f, 0.94f));
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
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("Finger Air Hockey 3D"), 28, new Color(1f, 0.8f, 0.82f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 62f, cw - 40f, 46f), U("Slide your mallet, bank the puck off the rails and beat the computer on 30 tables."), 15, new Color(1f, 1f, 1f, 0.85f), TextAnchor.MiddleCenter);
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
            $"<color=#ff7a85>{U("You")} <b>{goals[0]}</b></color> : <color=#7fb0ff><b>{goals[1]}</b> {U("CPU")}</color>\n<size=14>{U("Score")} <b>{score}</b></size>", 18, Color.white, TextAnchor.MiddleCenter);
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
