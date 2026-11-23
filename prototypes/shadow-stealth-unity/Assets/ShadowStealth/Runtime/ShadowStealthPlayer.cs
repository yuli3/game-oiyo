using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Shadow Stealth 3D: the web Shinobi Shadow Infiltration (src/components/games/ShadowStealth.tsx,
// src/lib/games/shadow-stealth.ts) rebuilt in Unity. The simulation runs in the web's own pixel
// space (an 800 x 480 keep, 40 px = 1 world unit) with the web's rules: the same walls, shadow
// zones and four patrolling guards, view cones of 70-80 degrees whose inner 65% alerts twice as
// fast as the rim, walls and smoke blocking sight, a suspicion gauge that turns into a chase at
// 100, shurikens that send a guard to look where they struck, a 4.5 s smoke bomb, takedowns from
// behind within 32 px, and the scroll-then-escape goal. The web's 10 missions: the keep in its
// four mirror images, guards 3.5% faster with longer, wider sight each mission and only two
// shurikens from mission 7. Score as on the web (1000, +250 takedown, +500 scroll, +1000 escape).
// Stars: escaped; never chased; out within the par time.
public class ShadowStealthPlayer : MonoBehaviour
{
    const string Slug = "shadow-stealth";
    const int StageCount = 10;
    const float AW = 800f, AH = 480f, PX = 40f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    struct Box { public float x, y, w, h; public Box(float x, float y, float w, float h) { this.x = x; this.y = y; this.w = w; this.h = h; } }
    enum GS { Patrol, Suspicious, Chase, Out }
    class Guard
    {
        public int id; public Vector2 p; public float facing, speed, fov, range, gauge, timer; public GS st;
        public Vector2[] wps; public int wp; public Vector2? look;
        public Transform t, body; public Mesh cone; public MeshRenderer coneR; public Transform bar;
    }
    class Star { public Vector2 p, v; public float life; public Transform t; }
    class Smoke { public Vector2 p; public float r, dur; public Transform t; }

    static readonly Box[] BaseWalls =
    {
        new Box(0, 0, 800, 20), new Box(0, 460, 800, 20), new Box(0, 0, 20, 480), new Box(780, 0, 20, 480),
        new Box(180, 80, 20, 200), new Box(180, 340, 20, 120), new Box(360, 20, 20, 180), new Box(360, 260, 20, 200),
        new Box(540, 120, 20, 240), new Box(440, 220, 120, 20),
    };
    static readonly Box[] BaseShadows = { new Box(40, 40, 100, 120), new Box(190, 270, 140, 100), new Box(370, 200, 90, 90), new Box(440, 30, 160, 80), new Box(640, 60, 120, 120) };

    int stageIdx;
    Box[] walls, shadows;
    readonly List<Guard> guards = new List<Guard>();
    readonly List<Star> stars = new List<Star>();
    readonly List<Smoke> smokes = new List<Smoke>();
    Vector2 ninja, scroll, exitP, move;
    float facing, alert, time;
    int shurikens, smokeBombs, takedowns, score, starsWon;
    bool inShadow, hasScroll, everChased;
    string endReason = "";

    Camera cam;
    Transform root, ninjaT, ninjaBody, scrollT, exitT;
    Material ninjaMat, ninjaShade;
    Renderer[] ninjaRends;
    Bursts bursts;
    Synth synth;
    bool showStages;
    float shake, flashScreen, toastT;
    string toast = "";

    bool FlipX => stageIdx % 4 == 1 || stageIdx % 4 == 3;
    bool FlipY => stageIdx % 4 == 2 || stageIdx % 4 == 3;
    float Par => 75f + stageIdx * 3f;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 45f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.03f, 0.04f, 0.07f);
        cam.farClipPlane = 120f;
        var moon = new GameObject("Moon").AddComponent<Light>();
        moon.type = LightType.Directional;
        moon.intensity = 0.7f;
        moon.color = new Color(0.65f, 0.72f, 1f);
        moon.shadows = LightShadows.None;
        moon.transform.rotation = Quaternion.Euler(60f, -30f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.32f, 0.33f, 0.42f);
        bursts = new Bursts(transform, 0.3f);
        synth = new Synth(gameObject);
        ninjaMat = OiyoArcade.Lit(new Color(0.16f, 0.18f, 0.26f), 0.3f);
        ninjaShade = OiyoArcade.Lit(new Color(0.08f, 0.09f, 0.14f), 0.1f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        LoadStage(stageIdx, false);
    }

    // ---------------- Mission ----------------
    Vector2 Mp(float x, float y) => new Vector2(FlipX ? AW - x : x, FlipY ? AH - y : y);
    Box Mb(Box b) => new Box(FlipX ? AW - b.x - b.w : b.x, FlipY ? AH - b.y - b.h : b.y, b.w, b.h);
    float Ma(float a) { if (FlipX) a = Mathf.PI - a; if (FlipY) a = -a; return a; }
    static Vector3 W(Vector2 p, float h = 0f) => new Vector3((p.x - AW * 0.5f) / PX, h, (AH * 0.5f - p.y) / PX);

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Keep").transform;
        guards.Clear(); stars.Clear(); smokes.Clear();
        walls = new Box[BaseWalls.Length];
        for (int i = 0; i < walls.Length; i++) walls[i] = Mb(BaseWalls[i]);
        shadows = new Box[BaseShadows.Length];
        for (int i = 0; i < shadows.Length; i++) shadows[i] = Mb(BaseShadows[i]);
        float step = stageIdx;
        AddGuard(1, 100, 280, Mathf.PI / 2, new[] { Mp(100, 240), Mp(100, 380) }, 45, 70, 160, step);
        AddGuard(2, 270, 160, 0, new[] { Mp(250, 160), Mp(320, 160), Mp(250, 300) }, 50, 75, 170, step);
        AddGuard(3, 460, 120, Mathf.PI, new[] { Mp(460, 80), Mp(460, 380) }, 40, 70, 160, step);
        AddGuard(4, 640, 220, -Mathf.PI / 2, new[] { Mp(640, 140), Mp(720, 240), Mp(640, 360) }, 55, 80, 180, step);
        ninja = Mp(60, 80); facing = Ma(0f); move = Vector2.zero;
        scroll = Mp(720, 120); exitP = Mp(50, 80);
        shurikens = stageIdx >= 6 ? 2 : 3; smokeBombs = 1; takedowns = 0;
        score = 1000; alert = 0f; time = 0f; starsWon = 0;
        inShadow = true; hasScroll = false; everChased = false;
        endReason = ""; showStages = false; toast = ""; toastT = 0f;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Sync(0f);
        UpdateCamera(1f, true);
    }

    void AddGuard(int id, float x, float y, float face, Vector2[] wps, float speed, float fovDeg, float range, float step)
    {
        guards.Add(new Guard
        {
            id = id, p = Mp(x, y), facing = Ma(face), wps = wps, wp = 0, st = GS.Patrol,
            speed = speed * (1f + 0.035f * step), range = range * (1f + 0.02f * step), fov = fovDeg * Mathf.Deg2Rad * (1f + 0.015f * step),
        });
    }

    void BuildScene()
    {
        var floorMat = OiyoArcade.Lit(new Color(0.62f, 0.6f, 0.68f), 0.15f, OiyoArcade.Art("SS/floor", true));
        floorMat.mainTextureScale = new Vector2(10f, 6f);
        var floor = OiyoArcade.Prim(PrimitiveType.Cube, "Floor", floorMat, root);
        floor.transform.position = new Vector3(0f, -0.05f, 0f);
        floor.transform.localScale = new Vector3(AW / PX, 0.1f, AH / PX);
        var grass = OiyoArcade.Prim(PrimitiveType.Plane, "Moat", OiyoArcade.Lit(new Color(0.06f, 0.12f, 0.16f), 0.6f), root);
        grass.transform.position = new Vector3(0f, -0.2f, 0f);
        grass.transform.localScale = new Vector3(8f, 1f, 8f);
        var wallMat = OiyoArcade.Lit(Color.white, 0.1f, OiyoArcade.Art("SS/wall", true));
        var capMat = OiyoArcade.Lit(new Color(0.18f, 0.2f, 0.26f), 0.4f);
        foreach (var b in walls)
        {
            var c = W(new Vector2(b.x + b.w * 0.5f, b.y + b.h * 0.5f));
            var wgo = OiyoArcade.Prim(PrimitiveType.Cube, "Wall", wallMat, root);
            wgo.transform.position = c + Vector3.up * 0.55f;
            wgo.transform.localScale = new Vector3(b.w / PX, 1.1f, b.h / PX);
            var cap = OiyoArcade.Prim(PrimitiveType.Cube, "Roof", capMat, root);
            cap.transform.position = c + Vector3.up * 1.15f;
            cap.transform.localScale = new Vector3(b.w / PX + 0.12f, 0.1f, b.h / PX + 0.12f);
        }
        var shadeMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(0.02f, 0.02f, 0.08f, 0.62f));
        var bamboo = OiyoArcade.Lit(new Color(0.2f, 0.42f, 0.25f), 0.3f);
        var rs = new System.Random(77 + stageIdx);
        foreach (var s in shadows)
        {
            var q = OiyoArcade.Prim(PrimitiveType.Quad, "Shadow", shadeMat, root);
            q.transform.position = W(new Vector2(s.x + s.w * 0.5f, s.y + s.h * 0.5f), 0.02f);
            q.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
            q.transform.localScale = new Vector3(s.w / PX, s.h / PX, 1f);
            // a few bamboo stalks or lantern-less eaves mark the dark corners
            for (int k = 0; k < 3; k++)
            {
                var stalk = OiyoArcade.Prim(PrimitiveType.Cylinder, "Bamboo", bamboo, root);
                var at = new Vector2(s.x + 6f + (float)rs.NextDouble() * (s.w - 12f), (k % 2 == 0 ? s.y + 5f : s.y + s.h - 5f));
                stalk.transform.position = W(at, 0.7f);
                stalk.transform.localScale = new Vector3(0.07f, 0.7f, 0.07f);
            }
        }
        // lanterns in the lit yards
        foreach (var lp in new[] { Mp(280, 60), Mp(470, 420), Mp(720, 420), Mp(110, 430) })
        {
            var post = OiyoArcade.Prim(PrimitiveType.Cube, "Lantern", OiyoArcade.Glow(new Color(1f, 0.75f, 0.4f)), root);
            post.transform.position = W(lp, 0.35f);
            post.transform.localScale = new Vector3(0.18f, 0.25f, 0.18f);
            var g = OiyoArcade.GlowQuad("LanternGlow", new Color(1f, 0.7f, 0.35f, 0.35f), 3.2f, root);
            g.transform.SetPositionAndRotation(W(lp, 0.03f), Quaternion.Euler(90f, 0f, 0f));
        }
        // scroll and the exit boat
        scrollT = new GameObject("Scroll").transform; scrollT.SetParent(root, false);
        var sc = OiyoArcade.Prim(PrimitiveType.Cylinder, "Roll", OiyoArcade.LitGlow(new Color(0.9f, 0.75f, 0.35f), new Color(0.3f, 0.2f, 0f)), scrollT);
        sc.transform.localRotation = Quaternion.Euler(0f, 0f, 90f);
        sc.transform.localScale = new Vector3(0.18f, 0.32f, 0.18f);
        var sg = OiyoArcade.GlowQuad("ScrollGlow", new Color(1f, 0.85f, 0.4f, 0.55f), 1.6f, scrollT);
        sg.transform.localRotation = Quaternion.Euler(90f, 0f, 0f); sg.transform.localPosition = new Vector3(0f, -0.3f, 0f);
        exitT = new GameObject("Boat").transform; exitT.SetParent(root, false);
        var hull = OiyoArcade.Prim(PrimitiveType.Cube, "Hull", OiyoArcade.Lit(new Color(0.42f, 0.26f, 0.16f), 0.2f), exitT);
        hull.transform.localScale = new Vector3(0.9f, 0.18f, 0.4f); hull.transform.localPosition = new Vector3(0f, 0.09f, 0f);
        var ring = OiyoArcade.GlowQuad("ExitRing", new Color(0.4f, 0.9f, 1f, 0.5f), 1.8f, exitT);
        ring.transform.localRotation = Quaternion.Euler(90f, 0f, 0f); ring.transform.localPosition = new Vector3(0f, 0.03f, 0f);
        // ninja
        ninjaT = new GameObject("Ninja").transform; ninjaT.SetParent(root, false);
        ninjaBody = new GameObject("Body").transform; ninjaBody.SetParent(ninjaT, false);
        var torso = OiyoArcade.Prim(PrimitiveType.Capsule, "Torso", ninjaMat, ninjaBody);
        torso.transform.localScale = new Vector3(0.32f, 0.3f, 0.32f); torso.transform.localPosition = new Vector3(0f, 0.3f, 0f);
        var head = OiyoArcade.Prim(PrimitiveType.Sphere, "Head", ninjaMat, ninjaBody);
        head.transform.localScale = Vector3.one * 0.26f; head.transform.localPosition = new Vector3(0f, 0.68f, 0f);
        var band = OiyoArcade.Prim(PrimitiveType.Cube, "Band", OiyoArcade.Glow(new Color(0.9f, 0.2f, 0.25f)), ninjaBody);
        band.transform.localScale = new Vector3(0.27f, 0.05f, 0.27f); band.transform.localPosition = new Vector3(0f, 0.72f, 0f);
        var eyes = OiyoArcade.Prim(PrimitiveType.Cube, "Eyes", OiyoArcade.Glow(new Color(1f, 0.95f, 0.8f)), ninjaBody);
        eyes.transform.localScale = new Vector3(0.16f, 0.035f, 0.04f); eyes.transform.localPosition = new Vector3(0f, 0.67f, 0.12f);
        ninjaRends = ninjaBody.GetComponentsInChildren<Renderer>();
        // guards
        var armor = OiyoArcade.Lit(new Color(0.55f, 0.16f, 0.14f), 0.4f);
        var helm = OiyoArcade.Lit(new Color(0.15f, 0.14f, 0.16f), 0.6f, null, 0.5f);
        var skin = OiyoArcade.Lit(new Color(0.95f, 0.78f, 0.62f), 0.2f);
        foreach (var g in guards)
        {
            g.t = new GameObject("Guard" + g.id).transform; g.t.SetParent(root, false);
            g.body = new GameObject("Body").transform; g.body.SetParent(g.t, false);
            var gb = OiyoArcade.Prim(PrimitiveType.Capsule, "Armor", armor, g.body);
            gb.transform.localScale = new Vector3(0.42f, 0.36f, 0.42f); gb.transform.localPosition = new Vector3(0f, 0.36f, 0f);
            var gh = OiyoArcade.Prim(PrimitiveType.Sphere, "Face", skin, g.body);
            gh.transform.localScale = Vector3.one * 0.26f; gh.transform.localPosition = new Vector3(0f, 0.8f, 0.02f);
            var hat = OiyoArcade.Prim(PrimitiveType.Cylinder, "Helm", helm, g.body);
            hat.transform.localScale = new Vector3(0.42f, 0.04f, 0.42f); hat.transform.localPosition = new Vector3(0f, 0.93f, 0f);
            var spear = OiyoArcade.Prim(PrimitiveType.Cylinder, "Spear", helm, g.body);
            spear.transform.localScale = new Vector3(0.04f, 0.6f, 0.04f); spear.transform.localPosition = new Vector3(0.26f, 0.6f, 0.05f);
            var coneGo = new GameObject("Cone");
            coneGo.transform.SetParent(root, false);
            g.cone = new Mesh(); g.cone.MarkDynamic();
            coneGo.AddComponent<MeshFilter>().sharedMesh = g.cone;
            g.coneR = coneGo.AddComponent<MeshRenderer>();
            g.coneR.sharedMaterial = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(1f, 0.9f, 0.4f, 0.25f));
            g.coneR.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            var bar = OiyoArcade.Prim(PrimitiveType.Quad, "Gauge", OiyoArcade.Glow(new Color(1f, 0.5f, 0.2f)), g.t);
            g.bar = bar.transform;
        }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("shadow-stealth", state, score);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        int actions = ReadInput();
        if (state == GameState.Playing)
        {
            int n = Mathf.CeilToInt(dt / (1f / 60f));
            for (int i = 0; i < n && state == GameState.Playing; i++) { Step(dt / n, i == 0 ? actions : 0); }
        }
        toastT = Mathf.Max(0f, toastT - dt);
        Sync(dt);
        UpdateCamera(dt, false);
    }

    int stickId = int.MinValue;
    Vector2 stickStart, stickNow;
    bool wantStar, wantSmoke, wantTakedown;

    const int AStar = 1, ASmoke = 2, ATake = 4;

    int ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        var kd = new Vector2((Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D) ? 1f : 0f) - (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A) ? 1f : 0f),
                             (Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.W) ? 1f : 0f) - (Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.S) ? 1f : 0f));
        int act = 0;
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; return 0; }
                    var began = OiyoArcade.Began();
                    foreach (var b in began) if (stickId == int.MinValue) { stickId = b.id; stickStart = stickNow = b.pos; }
                    bool held = false;
                    if (stickId != int.MinValue)
                    {
                        foreach (var h in OiyoArcade.Held()) if (h.id == stickId) { held = true; stickNow = h.pos; }
                        if (!held) stickId = int.MinValue;
                    }
                    // screen direction (y up) -> keep direction via the camera's ground axes
                    Vector2 screenDir = kd;
                    if (held)
                    {
                        var d = (stickNow - stickStart) / OiyoArcade.ComputeScale();
                        if (d.magnitude > 10f) screenDir = d.normalized;
                    }
                    move = screenDir.sqrMagnitude > 0.01f ? ScreenToKeep(screenDir.normalized) : Vector2.zero;
                    if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.F)) act |= AStar;
                    if (Input.GetKeyDown(KeyCode.E)) act |= ASmoke;
                    if (Input.GetKeyDown(KeyCode.Q)) act |= ATake;
                    if (wantStar) act |= AStar; if (wantSmoke) act |= ASmoke; if (wantTakedown) act |= ATake;
                    wantStar = wantSmoke = wantTakedown = false;
                    if (state == GameState.Ready && (began.Count > 0 || kd != Vector2.zero || act != 0 || Input.anyKeyDown)) state = GameState.Playing;
                    return state == GameState.Playing ? act : 0;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return 0;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm) LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                return 0;
            case GameState.Menu:
                if (!showStages && (confirm || Input.GetKeyDown(KeyCode.Space))) LoadStage(stageIdx);
                return 0;
        }
        return 0;
    }

    Vector2 ScreenToKeep(Vector2 s)
    {
        var r = cam.transform.right; r.y = 0f; r.Normalize();
        var f = cam.transform.forward; f.y = 0f; f.Normalize();
        var w = r * s.x + f * s.y;
        return new Vector2(w.x, -w.z); // world z up = web y down
    }

    void Step(float dt, int act)
    {
        time += dt;
        // move with the web's per-axis wall blocking (an 8 px half-size)
        if (move.sqrMagnitude > 0.0001f)
        {
            facing = Mathf.Atan2(move.y, move.x);
            float nx = ninja.x + move.x * 95f * dt, ny = ninja.y + move.y * 95f * dt;
            bool bx = false, by = false;
            foreach (var w in walls)
            {
                if (nx + 8 > w.x && nx - 8 < w.x + w.w && ninja.y + 8 > w.y && ninja.y - 8 < w.y + w.h) bx = true;
                if (ninja.x + 8 > w.x && ninja.x - 8 < w.x + w.w && ny + 8 > w.y && ny - 8 < w.y + w.h) by = true;
            }
            if (!bx) ninja.x = nx;
            if (!by) ninja.y = ny;
        }
        inShadow = InShadow(ninja);
        if ((act & AStar) != 0 && shurikens > 0)
        {
            shurikens--;
            var st = new Star { p = ninja, v = new Vector2(Mathf.Cos(facing), Mathf.Sin(facing)) * 320f, life = 0.6f };
            var go = OiyoArcade.Prim(PrimitiveType.Cube, "Shuriken", OiyoArcade.Lit(new Color(0.8f, 0.82f, 0.9f), 0.9f, null, 0.8f), root);
            go.transform.localScale = new Vector3(0.22f, 0.03f, 0.22f);
            st.t = go.transform;
            stars.Add(st);
            synth.Tone(1800f, 0.08f, Wave.Noise, 0.08f, 0f, 20f);
        }
        if ((act & ASmoke) != 0 && smokeBombs > 0)
        {
            smokeBombs--;
            var sm = new Smoke { p = ninja, r = 65f, dur = 4.5f };
            var go = OiyoArcade.GlowQuad("Smoke", new Color(0.75f, 0.78f, 0.85f, 0.75f), 65f * 2f / PX * 1.15f, root);
            sm.t = go.transform;
            smokes.Add(sm);
            bursts.Emit(W(ninja, 0.4f), new Color(0.8f, 0.82f, 0.88f), 40, 2.2f, 0.6f, 1.2f);
            synth.Tone(160f, 0.5f, Wave.Noise, 0.12f, 0f, 4f);
        }
        if ((act & ATake) != 0)
        {
            foreach (var g in guards)
            {
                if (g.st == GS.Out) continue;
                if (CanTakeDown(g))
                {
                    g.st = GS.Out; g.timer = 999f; takedowns++; score += 250;
                    bursts.Emit(W(g.p, 0.6f), new Color(1f, 0.95f, 0.7f), 18, 2.5f, 0.2f, 0.5f);
                    synth.Tone(220f, 0.18f, Wave.Square, 0.16f, 90f, 10f);
                    Toast(U("Takedown!"));
                }
            }
        }
        for (int i = stars.Count - 1; i >= 0; i--)
        {
            var s = stars[i];
            s.p += s.v * dt; s.life -= dt;
            foreach (var g in guards)
            {
                if (g.st == GS.Out) continue;
                if ((s.p - g.p).magnitude < 16f) { g.st = GS.Suspicious; g.look = s.p; g.timer = 3f; s.life = 0f; }
            }
            if (s.life <= 0f) { Destroy(s.t.gameObject); stars.RemoveAt(i); }
        }
        for (int i = smokes.Count - 1; i >= 0; i--)
        {
            smokes[i].dur -= dt;
            if (smokes[i].dur <= 0f) { Destroy(smokes[i].t.gameObject); smokes.RemoveAt(i); }
        }
        bool anyAlert = false;
        foreach (var g in guards)
        {
            if (g.st == GS.Out) continue;
            int zone = Vision(g, ninja);
            if (zone > 0 && !inShadow)
            {
                float rate = zone == 2 ? 140f : 60f;
                g.gauge = Mathf.Min(100f, g.gauge + rate * dt);
                if (g.gauge >= 100f)
                {
                    if (g.st != GS.Chase) { synth.Tone(880f, 0.25f, Wave.Square, 0.18f, 660f, 6f); Toast(U("Spotted!")); }
                    g.st = GS.Chase; g.timer = 5f; anyAlert = true;
                }
                else { g.st = GS.Suspicious; g.look = ninja; g.timer = 2.5f; }
            }
            else
            {
                g.gauge = Mathf.Max(0f, g.gauge - 40f * dt);
                if (g.gauge <= 0f && g.st == GS.Suspicious) g.st = GS.Patrol;
            }
            if (g.st == GS.Chase)
            {
                var d = ninja - g.p; float dist = d.magnitude;
                g.facing = Mathf.Atan2(d.y, d.x);
                if (dist > 18f) g.p += d / dist * g.speed * 1.5f * dt;
                else { Lose(); return; }
            }
            else if (g.st == GS.Suspicious)
            {
                if (g.look.HasValue)
                {
                    var d = g.look.Value - g.p; float dist = d.magnitude;
                    if (dist > 0.001f) g.facing = Mathf.Atan2(d.y, d.x);
                    if (dist > 10f) g.p += d / dist * g.speed * dt;
                }
                g.timer -= dt;
                if (g.timer <= 0f) g.st = GS.Patrol;
            }
            else
            {
                var tw = g.wps[g.wp]; var d = tw - g.p; float dist = d.magnitude;
                if (dist > 0.001f) g.facing = Mathf.Atan2(d.y, d.x);
                if (dist < 8f) g.wp = (g.wp + 1) % g.wps.Length;
                else g.p += d / dist * g.speed * dt;
            }
        }
        if (anyAlert) { alert = Mathf.Min(100f, alert + 120f * dt); everChased = true; }
        else alert = Mathf.Max(0f, alert - 20f * dt);
        if (!hasScroll)
        {
            if ((ninja - scroll).magnitude < 24f)
            {
                hasScroll = true; score += 500;
                Toast(U("Scroll taken! Back to the boat."));
                StartCoroutine(Arp(new[] { 660f, 880f }, 0.08f));
                bursts.Emit(W(scroll, 0.5f), new Color(1f, 0.85f, 0.4f), 24, 2.5f, 0.2f, 0.6f, Vector3.up);
            }
        }
        else if ((ninja - exitP).magnitude < 28f) Win();
    }

    bool CanTakeDown(Guard g)
    {
        float d = (ninja - g.p).magnitude;
        float a = Mathf.Atan2(ninja.y - g.p.y, ninja.x - g.p.x);
        float diff = Mathf.Abs(a - g.facing);
        while (diff > Mathf.PI) diff -= Mathf.PI * 2f;
        diff = Mathf.Abs(diff);
        return d < 32f && diff > Mathf.PI * 0.45f;
    }

    bool InShadow(Vector2 p)
    {
        foreach (var s in shadows) if (p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h) return true;
        return false;
    }

    // 0 none, 1 suspicion (outer 35%), 2 alert (inner 65%)
    int Vision(Guard g, Vector2 target)
    {
        var d = target - g.p; float dist = d.magnitude;
        if (dist > g.range) return 0;
        float diff = Mathf.Atan2(d.y, d.x) - g.facing;
        while (diff > Mathf.PI) diff -= Mathf.PI * 2f;
        while (diff < -Mathf.PI) diff += Mathf.PI * 2f;
        if (Mathf.Abs(diff) > g.fov * 0.5f) return 0;
        if (Occluded(g.p, target)) return 0;
        return dist / g.range <= 0.65f ? 2 : 1;
    }

    bool Occluded(Vector2 a, Vector2 b)
    {
        var mid = (a + b) * 0.5f;
        foreach (var s in smokes) if (s.dur > 0f && (mid - s.p).magnitude < s.r) return true;
        foreach (var w in walls) if (SegBox(a, b, w)) return true;
        return false;
    }

    static bool Ccw(Vector2 a, Vector2 b, Vector2 c) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
    static bool Cross(Vector2 a, Vector2 b, Vector2 c, Vector2 d) => Ccw(a, c, d) != Ccw(b, c, d) && Ccw(a, b, c) != Ccw(a, b, d);
    static bool SegBox(Vector2 a, Vector2 b, Box w)
    {
        if (Mathf.Max(a.x, b.x) < w.x || Mathf.Min(a.x, b.x) > w.x + w.w || Mathf.Max(a.y, b.y) < w.y || Mathf.Min(a.y, b.y) > w.y + w.h) return false;
        var tl = new Vector2(w.x, w.y); var tr = new Vector2(w.x + w.w, w.y); var br = new Vector2(w.x + w.w, w.y + w.h); var bl = new Vector2(w.x, w.y + w.h);
        return Cross(a, b, tl, tr) || Cross(a, b, tr, br) || Cross(a, b, br, bl) || Cross(a, b, bl, tl);
    }

    // distance along a ray to the first wall (slab test), for drawing the cone
    float RayWalls(Vector2 o, Vector2 dir, float max)
    {
        float best = max;
        foreach (var w in walls)
        {
            float tmin = 0f, tmax = best;
            if (!Slab(o.x, dir.x, w.x, w.x + w.w, ref tmin, ref tmax)) continue;
            if (!Slab(o.y, dir.y, w.y, w.y + w.h, ref tmin, ref tmax)) continue;
            if (tmin < best) best = tmin;
        }
        return best;
    }
    static bool Slab(float o, float d, float lo, float hi, ref float tmin, ref float tmax)
    {
        if (Mathf.Abs(d) < 1e-6f) return o >= lo && o <= hi;
        float t1 = (lo - o) / d, t2 = (hi - o) / d;
        if (t1 > t2) { var t = t1; t1 = t2; t2 = t; }
        tmin = Mathf.Max(tmin, t1); tmax = Mathf.Min(tmax, t2);
        return tmin <= tmax;
    }

    void Toast(string s) { toast = s; toastT = 1.8f; }

    void Win()
    {
        score += 1000;
        starsWon = 1 + (everChased ? 0 : 1) + (time <= Par ? 1 : 0);
        score += starsWon * 100;
        state = GameState.Victory;
        OiyoArcade.Record(Slug, stageIdx, starsWon, score, StageCount);
        bursts.Emit(W(ninja, 1f), new Color(0.6f, 0.9f, 1f), 50, 4f, 0.25f, 1f, Vector3.up * 2f);
        StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f }, 0.09f));
    }

    void Lose()
    {
        endReason = U("A guard caught you.");
        state = GameState.GameOver;
        shake = 0.4f; flashScreen = 0.4f;
        synth.Tone(160f, 0.7f, Wave.Saw, 0.22f, 60f, 3f);
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.18f, Wave.Triangle, 0.25f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    // ---------------- View ----------------
    static readonly List<Vector3> verts = new List<Vector3>();
    static readonly List<int> tris = new List<int>();

    void Sync(float dt)
    {
        if (ninjaT == null) return;
        ninjaT.position = W(ninja);
        ninjaBody.rotation = Quaternion.Euler(0f, 90f - (-facing) * Mathf.Rad2Deg, 0f);
        bool moving = move.sqrMagnitude > 0.01f && state == GameState.Playing;
        ninjaBody.localPosition = new Vector3(0f, moving ? Mathf.Abs(Mathf.Sin(Time.time * 14f)) * 0.05f : 0f, 0f);
        foreach (var r in ninjaRends) r.sharedMaterial = inShadow && r.name != "Eyes" && r.name != "Band" ? ninjaShade : (r.name == "Torso" || r.name == "Head" ? ninjaMat : r.sharedMaterial);
        scrollT.gameObject.SetActive(!hasScroll);
        scrollT.position = W(scroll, 0.45f + Mathf.Sin(Time.time * 3f) * 0.06f);
        scrollT.rotation = Quaternion.Euler(0f, Time.time * 60f, 0f);
        exitT.position = W(exitP);
        exitT.GetChild(1).gameObject.SetActive(hasScroll);
        foreach (var g in guards)
        {
            g.t.position = W(g.p);
            if (g.st == GS.Out)
            {
                g.body.localRotation = Quaternion.Slerp(g.body.localRotation, Quaternion.Euler(0f, 90f + g.facing * Mathf.Rad2Deg, 85f), dt * 8f);
                g.coneR.enabled = false; g.bar.gameObject.SetActive(false);
                continue;
            }
            g.body.localRotation = Quaternion.Euler(0f, 90f - (-g.facing) * Mathf.Rad2Deg, 0f);
            // cone fan clipped by walls
            verts.Clear(); tris.Clear();
            verts.Add(W(g.p, 0.04f));
            const int seg = 22;
            for (int i = 0; i <= seg; i++)
            {
                float a = g.facing - g.fov * 0.5f + g.fov * i / seg;
                var dir = new Vector2(Mathf.Cos(a), Mathf.Sin(a));
                float d = RayWalls(g.p, dir, g.range);
                verts.Add(W(g.p + dir * d, 0.04f));
                if (i > 0) { tris.Add(0); tris.Add(i + 1); tris.Add(i); }
            }
            g.cone.Clear(); g.cone.SetVertices(verts); g.cone.SetTriangles(tris, 0);
            g.coneR.enabled = true;
            var col = g.st == GS.Chase ? new Color(1f, 0.2f, 0.15f, 0.38f) : g.st == GS.Suspicious ? new Color(1f, 0.6f, 0.15f, 0.32f) : new Color(1f, 0.92f, 0.5f, 0.2f);
            g.coneR.sharedMaterial.color = col;
            bool show = g.gauge > 1f;
            g.bar.gameObject.SetActive(show);
            if (show)
            {
                g.bar.position = W(g.p, 1.25f);
                g.bar.rotation = cam.transform.rotation;
                g.bar.localScale = new Vector3(0.7f * g.gauge / 100f, 0.09f, 1f);
            }
        }
        foreach (var s in stars) { s.t.position = W(s.p, 0.45f); s.t.rotation = Quaternion.Euler(0f, Time.time * 900f, 0f); }
        foreach (var s in smokes)
        {
            s.t.position = W(s.p, 0.6f);
            s.t.rotation = cam.transform.rotation;
            var rr = s.t.GetComponent<Renderer>();
            rr.sharedMaterial.color = new Color(0.75f, 0.78f, 0.85f, Mathf.Clamp01(s.dur / 1.2f) * 0.8f);
        }
        flashScreen = Mathf.MoveTowards(flashScreen, 0f, dt);
    }

    void UpdateCamera(float dt, bool snap)
    {
        bool portrait = cam.aspect < 1f;
        // portrait phones see the keep turned a quarter so its long side runs up the screen
        float yaw = portrait ? -90f : 0f;
        float pitch = portrait ? 62f : 58f;
        float dist = portrait ? Mathf.Lerp(17f, 22f, Mathf.InverseLerp(0.62f, 0.45f, cam.aspect)) : Mathf.Lerp(16.5f, 13f, Mathf.InverseLerp(1.2f, 1.9f, cam.aspect));
        // follow the ninja a little so the keep stays readable on small screens
        var focus = Vector3.Lerp(Vector3.zero, W(ninja), portrait ? 0.55f : 0.25f) + new Vector3(0f, 0f, portrait ? 0f : -0.6f);
        var rot = Quaternion.Euler(pitch, yaw, 0f);
        var p = focus - rot * Vector3.forward * dist;
        var cur = snap ? p : Vector3.Lerp(cam.transform.position, p, 1f - Mathf.Exp(-dt * 5f));
        if (shake > 0f) { cur += Random.insideUnitSphere * shake * 0.25f; shake = Mathf.MoveTowards(shake, 0f, dt); }
        cam.transform.position = cur;
        cam.transform.rotation = rot;
    }

    // ?oiyotest=1 prints the run state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.2f;
        Debug.Log("OIYOTEST " + TestState());
    }
    string TestState() { var sb = new System.Text.StringBuilder(); foreach (var g in guards) sb.Append($"[{g.p.x:F0},{g.p.y:F0},{(int)g.st}],"); return $"{{\"s\":\"{state}\",\"x\":{ninja.x:F1},\"y\":{ninja.y:F1},\"sc\":{(hasScroll ? 1 : 0)},\"yaw\":{cam.transform.eulerAngles.y:F0},\"fx\":{(FlipX ? 1 : 0)},\"fy\":{(FlipY ? 1 : 0)},\"g\":[{sb.ToString().TrimEnd(',')}]}}"; }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.85f, 0.2f, 0.28f, 0.97f);
    static readonly Color Dark = new Color(0.03f, 0.03f, 0.07f, 0.86f);
    static readonly Color Gold = new Color(1f, 0.8f, 0.3f, 0.97f);
    static readonly Color Slate = new Color(0.16f, 0.17f, 0.26f, 0.95f);

    // i18n
    static readonly string[] Gates = { "East gate", "West gate", "North gate", "Moat gate" };
    string StageTitle(int i) => F("Mission {0}", i + 1) + " · " + U(Gates[i % 4]);
    static string Mmss(float s) => $"{Mathf.FloorToInt(s / 60f)}:{Mathf.FloorToInt(s % 60f):00}";

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (flashScreen > 0f) OiyoArcade.Fill(new Rect(0f, 0f, w, h), new Color(0.8f, 0f, 0.1f, flashScreen * 0.5f));
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 140f, 24f), "<b>" + StageTitle(stageIdx) + "</b>", 16, new Color(1f, 0.85f, 0.85f));
        string goal = hasScroll ? "<color=#7fe8ff>" + U("Escape to the boat") + "</color>" : "<color=#ffd36b>" + U("Steal the scroll") + "</color>";
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 22f), $"{goal}   {Mmss(time)}   {(inShadow ? "<color=#a9b4ff>" + U("Hidden") + "</color>" : "")}", 14, Color.white);
        OiyoArcade.Bar(new Rect(20f, 60f, w - 96f, 5f), alert / 100f, new Color(0f, 0f, 0f, 0.5f), new Color(1f, 0.3f, 0.25f));
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (toastT > 0f) OiyoArcade.Shadowed(new Rect(0f, 80f, w, 30f), toast, 20, Gold, TextAnchor.MiddleCenter);
        if (state == GameState.Playing || state == GameState.Ready)
        {
            // action buttons on the right, clear of the page's exit button in the bottom-left
            float bs = 64f, x = w - bs - 14f, y = h - bs - 18f;
            if (OiyoArcade.Button(new Rect(x, y, bs, bs), $"<b>{U("Strike")}</b>", NearTakedown() ? Accent : Slate, 14)) wantTakedown = true;
            if (OiyoArcade.Button(new Rect(x - bs - 10f, y, bs, bs), $"◆\n<size=13>{shurikens}</size>", shurikens > 0 ? new Color(0.25f, 0.3f, 0.45f, 0.95f) : Slate, 20, null, shurikens > 0)) wantStar = true;
            if (OiyoArcade.Button(new Rect(x, y - bs - 10f, bs, bs), $"☁\n<size=13>{smokeBombs}</size>", smokeBombs > 0 ? new Color(0.35f, 0.37f, 0.45f, 0.95f) : Slate, 20, null, smokeBombs > 0)) wantSmoke = true;
        }
        if (stickId != int.MinValue && state == GameState.Playing)
        {
            var c0 = OiyoArcade.ToGui(stickStart); var c1 = OiyoArcade.ToGui(stickNow);
            var d = c1 - c0; if (d.magnitude > 40f) d = d.normalized * 40f;
            OiyoArcade.Panel(new Rect(c0.x - 44f, c0.y - 44f, 88f, 88f), new Color(1f, 1f, 1f, 0.12f));
            OiyoArcade.Panel(new Rect(c0.x + d.x - 20f, c0.y + d.y - 20f, 40f, 40f), new Color(1f, 1f, 1f, 0.35f));
        }
        if (state == GameState.Ready)
        {
            var r = new Rect(w * 0.5f - 175f, h * 0.5f + 30f, 350f, 124f);
            OiyoArcade.Panel(r, Dark);
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 8f, r.width - 24f, r.height - 16f),
                $"<b>{U("Steal the scroll and escape unseen")}</b>\n<size=14>{U("Drag anywhere to move. Shadows hide you. Strike guards from behind.")}</size>\n<size=12>{U("Keys: arrows/WASD, Space shuriken, E smoke, Q strike")}</size>", 16, Color.white, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Paused) DrawPause(w, h);
        if (state == GameState.Victory || state == GameState.GameOver) DrawResult(w, h);
    }

    bool NearTakedown()
    {
        foreach (var g in guards) if (g.st != GS.Out && CanTakeDown(g)) return true;
        return false;
    }

    void DrawMenu(float w, float h)
    {
        if (showStages)
        {
            float bw = Mathf.Min(w - 16f, 760f);
            var box = new Rect(w * 0.5f - bw * 0.5f, 12f, bw, Mathf.Min(h - 24f, 360f));
            OiyoArcade.Panel(box, new Color(0.03f, 0.03f, 0.07f, 0.94f));
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
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("Shadow Stealth 3D"), 30, new Color(1f, 0.85f, 0.85f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 62f, cw - 40f, 46f), U("Slip past the keep's guards, steal the secret scroll and get back to your boat."), 15, new Color(1f, 1f, 1f, 0.85f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x, card.y + 110f, cw, 24f), StageTitle(stageIdx), 15, Gold, TextAnchor.MiddleCenter);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 142f, cw - 48f, 58f), "<b>▶ " + F("Play stage {0}", stageIdx + 1) + "</b>", Accent, 21)) LoadStage(stageIdx);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 210f, cw - 48f, 46f), U("All 10 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}", Slate, 17)) showStages = true;
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
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 14f, cw, 38f), won ? U("Mission complete!") : U("Caught!"), 28, won ? new Color(0.6f, 1f, 0.75f) : new Color(1f, 0.55f, 0.5f), TextAnchor.MiddleCenter);
        string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : endReason;
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 56f, cw - 32f, 44f), detail, 16, Color.white, TextAnchor.MiddleCenter);
        string notes = won ? $"<size=13>{(everChased ? U("You were chased") : U("Never chased"))} · {F("Par {0}", Mmss(Par))}</size>" : "";
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 100f, cw - 32f, 52f),
            $"{U("Score")} <b>{score}</b>   {U("Time")} <b>{Mmss(time)}</b>\n{notes}", 16, Color.white, TextAnchor.MiddleCenter);
        float y = card.y + 158f;
        if (won && stageIdx < StageCount - 1)
        {
            if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 50f), "<b>" + U("Next stage") + " ▶</b>", Accent, 19)) LoadStage(stageIdx + 1);
            y += 58f;
        }
        else if (won)
        {
            OiyoArcade.Text(new Rect(card.x, y, cw, 50f), "★ " + U("You cleared all 10 stages!") + " ★", 17, Gold, TextAnchor.MiddleCenter);
            y += 58f;
        }
        if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 44f), U("Retry"), won ? Slate : Accent, 17)) LoadStage(stageIdx);
        y += 52f;
        if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 40f), U("Stage list"), Slate, 16)) { LoadStage(stageIdx, false); showStages = true; }
    }
}
