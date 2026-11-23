using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Urban Strike 3D: the web Urban Strike FPS (src/components/games/UrbanStrike.tsx,
// UrbanStrikeScene.tsx, src/lib/games/urban-strike.ts) rebuilt in Unity. Same city block (the
// eight buildings, barriers, blockers and the central objective ring), same 120 s team match to 40,
// same three rifles (magazine, reserve, damage, head multiplier, rate, reload and tactical reload,
// hip/ADS spread, ADS zoom, move speed and the twelve-shot recoil patterns), the web's hit-scan
// against head and body spheres with damage falloff, armour that soaks 58% of a hit, six enemy
// bots that keep their range, strafe and shoot with the web's hit chance, the capture tick every
// 4 s on the ring, the simulated rest-of-team feed, and scoreForElimination. The web's 20
// operations are the 20 stages (bots up to 60% more accurate, 35% faster to fire and move,
// +4 damage). One change: bots only fire with a clear line of sight (the web's could shoot
// through walls). Win: blue ahead when the match ends. Stars: won; won by 8+; 2 deaths or fewer.
public class UrbanStrikePlayer : MonoBehaviour
{
    const string Slug = "urban-strike";
    const int StageCount = 20;
    const float MatchSeconds = 120f;
    const int ScoreLimit = 40;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    class Weapon
    {
        public string id, name; public int mag, reserve0; public float dmg, headMul, rpm, reload, tacReload, hip, ads, adsFov, speed; public float[,] recoil;
    }
    static readonly Weapon[] Weapons =
    {
        new Weapon { id = "m4", name = "VX-4 Carbine", mag = 30, reserve0 = 120, dmg = 29, headMul = 2.25f, rpm = 760, reload = 2.32f, tacReload = 1.92f, hip = 0.021f, ads = 0.0032f, adsFov = 54, speed = 6.6f,
            recoil = new float[,] { { 0.70f, 0.02f }, { 0.82f, -0.08f }, { 0.91f, 0.10f }, { 1.05f, -0.16f }, { 1.11f, -0.08f }, { 1.18f, 0.18f }, { 1.20f, 0.25f }, { 1.16f, 0.18f }, { 1.10f, -0.12f }, { 1.04f, -0.24f }, { 1.00f, -0.28f }, { 0.96f, 0.14f } } },
        new Weapon { id = "ak", name = "KR-7 Rifle", mag = 30, reserve0 = 90, dmg = 36, headMul = 2.1f, rpm = 610, reload = 2.72f, tacReload = 2.28f, hip = 0.026f, ads = 0.0042f, adsFov = 51, speed = 6.15f,
            recoil = new float[,] { { 1.05f, 0.04f }, { 1.24f, -0.18f }, { 1.38f, 0.22f }, { 1.48f, 0.30f }, { 1.52f, -0.28f }, { 1.55f, -0.38f }, { 1.48f, 0.34f }, { 1.40f, 0.45f }, { 1.34f, 0.22f }, { 1.28f, -0.42f }, { 1.22f, -0.36f }, { 1.18f, 0.28f } } },
        new Weapon { id = "mp5", name = "PX-9 SMG", mag = 30, reserve0 = 150, dmg = 23, headMul = 2f, rpm = 860, reload = 2.1f, tacReload = 1.68f, hip = 0.018f, ads = 0.0048f, adsFov = 57, speed = 7.2f,
            recoil = new float[,] { { 0.48f, -0.03f }, { 0.54f, 0.06f }, { 0.61f, -0.08f }, { 0.66f, 0.10f }, { 0.69f, 0.13f }, { 0.72f, -0.16f }, { 0.71f, -0.20f }, { 0.68f, 0.18f }, { 0.64f, 0.14f }, { 0.61f, -0.12f }, { 0.58f, -0.08f }, { 0.55f, 0.10f } } },
    };

    static readonly Vector2[] EnemySpawns = { new Vector2(-18, -23), new Vector2(2, -29), new Vector2(21, -19), new Vector2(-24, -2), new Vector2(25, 7), new Vector2(10, -16) };
    static readonly Vector2[] PlayerSpawns = { new Vector2(0, 18), new Vector2(-8, 20), new Vector2(9, 18) };
    static readonly string[] EnemyNames = { "VIPER", "NOMAD", "KILO", "RAZOR", "GHOST", "MERCURY" };
    static readonly string[] AllyNames = { "ECHO", "ATLAS", "ROOK", "MIRA", "BISHOP" };
    // minX, minZ, maxX, maxZ
    static readonly float[,] Blockers =
    {
        { -35, -35, -13, -18 }, { -8, -35, 7, -22 }, { 14, -35, 35, -14 }, { -35, -11, -22, 7 }, { 21, -8, 35, 11 },
        { -35, 16, -17, 35 }, { -10, 23, 8, 35 }, { 16, 17, 35, 35 }, { -8, -8, -3, -1 }, { 4, 5, 9, 10 },
    };
    // x, z, w, d, h
    static readonly float[,] Buildings =
    {
        { -24, -27, 22, 17, 18 }, { -0.5f, -28.5f, 15, 13, 27 }, { 24.5f, -24.5f, 21, 21, 22 }, { -28.5f, -2, 13, 18, 14 },
        { 28, 1.5f, 14, 19, 20 }, { -26, 25.5f, 18, 19, 25 }, { -1, 29, 18, 12, 16 }, { 25.5f, 26, 19, 18, 30 },
    };

    class Bot { public int idx; public string name; public Vector3 pos; public float hp, deadUntil, nextShot, strafe, phase, strafeFlip; public Transform t; }
    class Feed { public string text; public float t; }

    int stageIdx;
    readonly List<Bot> bots = new List<Bot>();
    readonly List<Feed> feed = new List<Feed>();
    Vector3 player;
    float yaw, pitch, recoilP, recoilY, jumpH, vy, stance = 1.72f;
    float health, armor, respawnAt, elapsed, nextSim, objTick, lastShot, reloadEnd, hitMarkT, headMarkT, damageT, muzzleT;
    int weapon, streak, kills, deaths, blue, red, score, starsWon, shots, hits, shotIndex;
    readonly int[] magazine = new int[3], reserve = new int[3];
    bool reloading, ads, crouch, sprint, objContested, objCapturing;
    float fov = 72f;
    Opstats op;

    struct Opstats { public float acc, interval, dmg, speed; }

    Camera cam;
    Transform root, viewGun, muzzleFlash;
    readonly List<Transform> tracers = new List<Transform>();
    Bursts bursts;
    Synth synth;
    bool showStages;
    bool mobile;

    void Awake()
    {
        Application.targetFrameRate = 60;
        mobile = Application.isMobilePlatform;
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.nearClipPlane = 0.06f; cam.farClipPlane = 180f; cam.fieldOfView = 72f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.62f, 0.7f, 0.78f);
        var sun = new GameObject("Sun").AddComponent<Light>();
        sun.type = LightType.Directional; sun.intensity = 1.05f; sun.color = new Color(1f, 0.95f, 0.86f);
        sun.shadows = LightShadows.None;
        sun.transform.rotation = Quaternion.Euler(48f, -35f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.5f, 0.53f, 0.58f);
        RenderSettings.fog = true; RenderSettings.fogMode = FogMode.Linear;
        RenderSettings.fogColor = cam.backgroundColor; RenderSettings.fogStartDistance = 40f; RenderSettings.fogEndDistance = 120f;
        bursts = new Bursts(transform, 0.4f);
        synth = new Synth(gameObject);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        LoadStage(stageIdx, false);
    }

    // ---------------- Match ----------------
    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("City").transform;
        bots.Clear(); feed.Clear(); tracers.Clear();
        float t = stageIdx / (float)(StageCount - 1);
        op = new Opstats { acc = 1f + 0.6f * t, interval = 1f - 0.35f * t, dmg = Mathf.Round(4f * t), speed = 1f + 0.35f * t };
        for (int i = 0; i < 3; i++) { magazine[i] = Weapons[i].mag; reserve[i] = Weapons[i].reserve0; }
        weapon = 0;
        player = new Vector3(0f, 1.72f, 18f); yaw = 180f; pitch = 0f; recoilP = recoilY = 0f; jumpH = 0f; vy = 0f; stance = 1.72f;
        health = 100f; armor = 50f; respawnAt = -1f; elapsed = 0f; nextSim = 4f; objTick = 0f; lastShot = -9f; reloading = false;
        streak = kills = deaths = blue = red = score = starsWon = shots = hits = shotIndex = 0;
        ads = crouch = sprint = false; hitMarkT = headMarkT = damageT = muzzleT = 0f;
        showStages = false;
        BuildScene();
        for (int i = 0; i < 6; i++)
            bots.Add(new Bot { idx = i, name = EnemyNames[i], pos = new Vector3(EnemySpawns[i].x, 0f, EnemySpawns[i].y), hp = 100f, nextShot = 1.8f + i * 0.35f, strafe = i % 2 == 1 ? 1f : -1f, phase = i * 1.37f, t = BuildBot(i) });
        state = ready ? GameState.Ready : GameState.Menu;
        if (!ready) LockWant(false);
        SyncView(0f);
    }

    void BuildScene()
    {
        var asphalt = OiyoArcade.Lit(new Color(0.42f, 0.45f, 0.47f), 0.08f, OiyoArcade.Art("US/asphalt", true));
        asphalt.mainTextureScale = new Vector2(22f, 22f);
        var ground = OiyoArcade.Prim(PrimitiveType.Plane, "Ground", asphalt, root);
        ground.transform.localScale = new Vector3(11f, 1f, 11f);
        var ring = OiyoArcade.Prim(PrimitiveType.Cylinder, "Objective", OiyoArcade.LitGlow(new Color(0.75f, 0.65f, 0.25f), new Color(0.2f, 0.15f, 0f)), root);
        ring.transform.position = new Vector3(0f, 0.01f, 0f); ring.transform.localScale = new Vector3(10f, 0.01f, 10f);
        var inner = OiyoArcade.Prim(PrimitiveType.Cylinder, "ObjectiveInner", OiyoArcade.Lit(new Color(0.2f, 0.23f, 0.24f), 0.1f), root);
        inner.transform.position = new Vector3(0f, 0.015f, 0f); inner.transform.localScale = new Vector3(9.1f, 0.01f, 9.1f);
        var facade = OiyoArcade.Art("US/facade", true);
        var roof = OiyoArcade.Lit(new Color(0.25f, 0.26f, 0.27f), 0.2f);
        Color[] tints = { new Color(0.62f, 0.66f, 0.64f), new Color(0.7f, 0.66f, 0.6f), new Color(0.56f, 0.6f, 0.62f), new Color(0.76f, 0.64f, 0.54f), new Color(0.52f, 0.58f, 0.6f), new Color(0.64f, 0.66f, 0.6f), new Color(0.74f, 0.68f, 0.6f), new Color(0.54f, 0.58f, 0.6f) };
        for (int i = 0; i < Buildings.GetLength(0); i++)
        {
            float x = Buildings[i, 0], z = Buildings[i, 1], w = Buildings[i, 2], d = Buildings[i, 3], h = Buildings[i, 4];
            var m = OiyoArcade.Lit(tints[i], 0.15f, facade);
            m.mainTextureScale = new Vector2(Mathf.Round(w / 4f), Mathf.Round(h / 4f));
            var b = OiyoArcade.Prim(PrimitiveType.Cube, "Building", m, root, true);
            b.transform.position = new Vector3(x, h * 0.5f, z); b.transform.localScale = new Vector3(w, h, d);
            var top = OiyoArcade.Prim(PrimitiveType.Cube, "Roof", roof, root);
            top.transform.position = new Vector3(x, h + 0.2f, z); top.transform.localScale = new Vector3(w + 0.4f, 0.4f, d + 0.4f);
        }
        var concrete = OiyoArcade.Lit(new Color(0.7f, 0.69f, 0.65f), 0.1f);
        float[,] barriers = { { -10, -4, 0 }, { -5, -4, 0 }, { 7, 12, 90 }, { 11, 12, 90 }, { -16, 12, 0 }, { 17, -11, 0 } };
        for (int i = 0; i < barriers.GetLength(0); i++)
        {
            var br = OiyoArcade.Prim(PrimitiveType.Cube, "Barrier", concrete, root, true);
            br.transform.position = new Vector3(barriers[i, 0], 0.55f, barriers[i, 1]);
            br.transform.rotation = Quaternion.Euler(0f, barriers[i, 2], 0f);
            br.transform.localScale = new Vector3(3.6f, 1.1f, 0.6f);
        }
        // the two blocker crates in the middle of the web map
        var crate = OiyoArcade.Lit(new Color(0.45f, 0.38f, 0.28f), 0.2f);
        foreach (var c in new[] { new Vector4(-5.5f, -4.5f, 5f, 7f), new Vector4(6.5f, 7.5f, 5f, 5f) })
        {
            var cr = OiyoArcade.Prim(PrimitiveType.Cube, "Crates", crate, root, true);
            cr.transform.position = new Vector3(c.x, 1.1f, c.y); cr.transform.localScale = new Vector3(c.z, 2.2f, c.w);
        }
        // team lights: blue side south, red side north
        foreach (var l in new[] { (new Vector3(-17f, 3.2f, 5f), new Color(0.38f, 0.65f, 0.98f)), (new Vector3(17f, 3.2f, -5f), new Color(0.94f, 0.27f, 0.27f)), (new Vector3(0f, 5f, 0f), new Color(0.66f, 0.84f, 0.63f)) })
        {
            var g = OiyoArcade.GlowQuad("TeamGlow", new Color(l.Item2.r, l.Item2.g, l.Item2.b, 0.35f), 9f, root);
            g.transform.SetPositionAndRotation(new Vector3(l.Item1.x, 0.03f, l.Item1.z), Quaternion.Euler(90f, 0f, 0f));
        }
        // view model: the rifle at the bottom right of the view
        viewGun = new GameObject("ViewGun").transform;
        viewGun.SetParent(cam.transform, false);
        var dark = OiyoArcade.Lit(new Color(0.12f, 0.13f, 0.14f), 0.6f, null, 0.5f);
        var recv = OiyoArcade.Prim(PrimitiveType.Cube, "Receiver", dark, viewGun);
        recv.transform.localScale = new Vector3(0.05f, 0.065f, 0.32f);
        var barrel = OiyoArcade.Prim(PrimitiveType.Cube, "Barrel", dark, viewGun);
        barrel.transform.localPosition = new Vector3(0f, 0.012f, 0.24f); barrel.transform.localScale = new Vector3(0.022f, 0.022f, 0.2f);
        var magGo = OiyoArcade.Prim(PrimitiveType.Cube, "Mag", OiyoArcade.Lit(new Color(0.3f, 0.26f, 0.2f), 0.3f), viewGun);
        magGo.transform.localPosition = new Vector3(0f, -0.065f, 0.05f); magGo.transform.localScale = new Vector3(0.035f, 0.09f, 0.05f);
        var sight = OiyoArcade.Prim(PrimitiveType.Cube, "Sight", dark, viewGun);
        sight.transform.localPosition = new Vector3(0f, 0.048f, -0.04f); sight.transform.localScale = new Vector3(0.03f, 0.03f, 0.08f);
        foreach (var r in viewGun.GetComponentsInChildren<Renderer>()) r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        muzzleFlash = OiyoArcade.GlowQuad("Muzzle", new Color(1f, 0.85f, 0.4f, 0.95f), 0.22f, viewGun).transform;
        muzzleFlash.localPosition = new Vector3(0f, 0.012f, 0.36f);
        for (int i = 0; i < 6; i++)
        {
            var tr = OiyoArcade.Prim(PrimitiveType.Cube, "Tracer", OiyoArcade.Glow(new Color(1f, 0.92f, 0.6f)), root);
            tr.SetActive(false);
            tracers.Add(tr.transform);
        }
    }

    Transform BuildBot(int i)
    {
        var t = new GameObject("Bot" + i).transform; t.SetParent(root, false);
        var red = OiyoArcade.Lit(new Color(0.62f, 0.2f, 0.18f), 0.3f);
        var gear = OiyoArcade.Lit(new Color(0.2f, 0.2f, 0.2f), 0.4f);
        var skin = OiyoArcade.Lit(new Color(0.85f, 0.68f, 0.52f), 0.2f);
        var legs = OiyoArcade.Prim(PrimitiveType.Cube, "Legs", gear, t);
        legs.transform.localPosition = new Vector3(0f, 0.42f, 0f); legs.transform.localScale = new Vector3(0.44f, 0.84f, 0.3f);
        var body = OiyoArcade.Prim(PrimitiveType.Cube, "Body", red, t);
        body.transform.localPosition = new Vector3(0f, 1.08f, 0f); body.transform.localScale = new Vector3(0.6f, 0.62f, 0.36f);
        var head = OiyoArcade.Prim(PrimitiveType.Sphere, "Head", skin, t);
        head.transform.localPosition = new Vector3(0f, 1.69f, 0f); head.transform.localScale = Vector3.one * 0.36f;
        var helm = OiyoArcade.Prim(PrimitiveType.Sphere, "Helmet", gear, t);
        helm.transform.localPosition = new Vector3(0f, 1.78f, 0f); helm.transform.localScale = new Vector3(0.42f, 0.24f, 0.42f);
        var gun = OiyoArcade.Prim(PrimitiveType.Cube, "Gun", gear, t);
        gun.transform.localPosition = new Vector3(0.18f, 1.15f, 0.35f); gun.transform.localScale = new Vector3(0.08f, 0.1f, 0.6f);
        var tag = OiyoArcade.GlowQuad("Tag", new Color(1f, 0.3f, 0.25f, 0.9f), 0.25f, t);
        tag.transform.localPosition = new Vector3(0f, 2.15f, 0f);
        return t;
    }

    // ---------------- Input ----------------
    Rect BtnFire, BtnAds, BtnReload, BtnSwap, BtnJump, BtnCrouch;
    void Layout(float w, float h)
    {
        float s = Mathf.Clamp(Mathf.Min(w, h) * 0.16f, 54f, 80f);
        BtnFire = new Rect(w - s * 1.4f - 16f, h - s * 1.4f - 24f, s * 1.4f, s * 1.4f);
        BtnAds = new Rect(BtnFire.x - s - 12f, h - s - 30f, s, s);
        BtnReload = new Rect(BtnFire.x + s * 0.4f, BtnFire.y - s * 0.75f - 12f, s, s * 0.75f);
        BtnJump = new Rect(BtnAds.x, BtnAds.y - s * 0.75f - 12f, s, s * 0.75f);
        BtnSwap = new Rect(w - s - 16f, BtnReload.y - s * 0.7f - 12f, s, s * 0.7f);
        BtnCrouch = new Rect(BtnJump.x - s - 12f, h - s * 0.75f - 30f, s, s * 0.75f);
    }

    int stickId = int.MinValue, lookId = int.MinValue, fireId = int.MinValue;
    Vector2 stickStart, stickNow, lookLast, fireLast;
    Vector2 moveIn;
    bool fireHeld, jumpPressed;

    bool In(Rect r, Vector2 screen) => r.Contains(OiyoArcade.ToGui(screen));

    void ReadInput(float dt)
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { Pause(); return; }
                    float w = OiyoArcade.W, h = OiyoArcade.H;
                    Layout(w, h);
                    var began = OiyoArcade.Began();
                    var held = OiyoArcade.Held();
                    bool touchy = false;
                    foreach (var b in began)
                    {
                        if (b.id >= 0 || Input.touchCount > 0) touchy = true;
                        var g = OiyoArcade.ToGui(b.pos);
                        if (mobile || b.id >= 0 && Input.mousePresent == false)
                        {
                            if (BtnFire.Contains(g)) { fireId = b.id; fireLast = b.pos; }
                            else if (BtnAds.Contains(g)) ads = !ads;
                            else if (BtnReload.Contains(g)) StartReload();
                            else if (BtnSwap.Contains(g)) Swap((weapon + 1) % 3);
                            else if (BtnJump.Contains(g)) jumpPressed = true;
                            else if (BtnCrouch.Contains(g)) crouch = !crouch;
                            else if (g.x < w * 0.45f && stickId == int.MinValue) { stickId = b.id; stickStart = stickNow = b.pos; }
                            else if (lookId == int.MinValue) { lookId = b.id; lookLast = b.pos; }
                        }

                    }
                    bool stickHeld = false, lookHeld = false; fireHeld = false;
                    float lookScale = 0.22f / OiyoArcade.ComputeScale() * (ads ? 0.55f : 1f);
                    foreach (var hp in held)
                    {
                        if (hp.id == stickId) { stickHeld = true; stickNow = hp.pos; }
                        if (hp.id == lookId) { lookHeld = true; var d = hp.pos - lookLast; lookLast = hp.pos; yaw += d.x * lookScale * 1.2f; pitch = Mathf.Clamp(pitch + d.y * lookScale, -70f, 70f); }
                        if (hp.id == fireId) { fireHeld = true; var d = hp.pos - fireLast; fireLast = hp.pos; yaw += d.x * lookScale; pitch = Mathf.Clamp(pitch + d.y * lookScale, -70f, 70f); }
                    }
                    if (!stickHeld) stickId = int.MinValue;
                    if (!lookHeld) lookId = int.MinValue;
                    if (!fireHeld) fireId = int.MinValue;
                    // keyboard and mouse
                    var kd = new Vector2((Input.GetKey(KeyCode.D) ? 1f : 0f) - (Input.GetKey(KeyCode.A) ? 1f : 0f), (Input.GetKey(KeyCode.W) ? 1f : 0f) - (Input.GetKey(KeyCode.S) ? 1f : 0f));
                    if (Input.GetKey(KeyCode.LeftArrow)) yaw -= 120f * dt;
                    if (Input.GetKey(KeyCode.RightArrow)) yaw += 120f * dt;
                    if (Input.GetKey(KeyCode.UpArrow)) pitch = Mathf.Clamp(pitch + 70f * dt, -70f, 70f);
                    if (Input.GetKey(KeyCode.DownArrow)) pitch = Mathf.Clamp(pitch - 70f * dt, -70f, 70f);
                    // desktop mouse look: a left click on the game locks the pointer (Plugins/WebGL/OiyoLock.jslib)
                    LockWant(!mobile);
                    var lk = LockRead();
                    mouseLocked = lk.z > 0.5f;
                    if (mouseLocked)
                    {
                        float ms = ads ? 0.07f : 0.13f;
                        yaw += lk.x * ms;
                        pitch = Mathf.Clamp(pitch - lk.y * ms, -70f, 70f);
                        if (Input.GetMouseButton(0)) fireHeld = true;
                        if (Input.GetMouseButtonDown(1)) ads = true;
                        if (Input.GetMouseButtonUp(1)) ads = false;
                    }
                    moveIn = kd;
                    if (stickId != int.MinValue)
                    {
                        var d = (stickNow - stickStart) / OiyoArcade.ComputeScale();
                        if (d.magnitude > 8f) moveIn = d / Mathf.Max(d.magnitude, 46f);
                    }
                    sprint = (Input.GetKey(KeyCode.LeftShift) && moveIn.y > 0.3f) || (stickId != int.MinValue && moveIn.y > 0.95f && !ads);
                    if (Input.GetKeyDown(KeyCode.Space)) jumpPressed = true;
                    if (Input.GetKeyDown(KeyCode.C) || Input.GetKeyDown(KeyCode.LeftControl)) crouch = !crouch;
                    if (Input.GetKeyDown(KeyCode.R)) StartReload();
                    if (Input.GetKeyDown(KeyCode.Alpha1)) Swap(0);
                    if (Input.GetKeyDown(KeyCode.Alpha2)) Swap(1);
                    if (Input.GetKeyDown(KeyCode.Alpha3)) Swap(2);
                    if (Input.GetKey(KeyCode.F) || Input.GetKey(KeyCode.J)) fireHeld = true;
                    if (fireHeld) sprint = false; // firing always wins over a full stick
                    if (state == GameState.Ready && (began.Count > 0 || Input.anyKeyDown)) state = GameState.Playing;
                    return;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm) LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                return;
            case GameState.Menu:
                if (!showStages && (confirm || Input.GetKeyDown(KeyCode.Space))) LoadStage(stageIdx);
                return;
        }
    }

    void Pause() { state = GameState.Paused; LockWant(false); }

#if UNITY_WEBGL && !UNITY_EDITOR
    [System.Runtime.InteropServices.DllImport("__Internal")] static extern void OiyoLockInit();
    [System.Runtime.InteropServices.DllImport("__Internal")] static extern void OiyoLockWant(int want);
    [System.Runtime.InteropServices.DllImport("__Internal")] static extern void OiyoLockRead(float[] buf);
#else
    static void OiyoLockInit() { }
    static void OiyoLockWant(int want) { }
    static void OiyoLockRead(float[] buf) { buf[0] = buf[1] = buf[2] = 0f; }
#endif
    bool lockInit, mouseLocked; int lockWanted = -1;
    readonly float[] lockBuf = new float[3];
    void LockWant(bool want)
    {
        if (!lockInit) { lockInit = true; OiyoLockInit(); }
        int w = want ? 1 : 0;
        if (w != lockWanted) { lockWanted = w; OiyoLockWant(w); }
    }
    Vector3 LockRead()
    {
        if (!lockInit) return Vector3.zero;
        OiyoLockRead(lockBuf);
        return new Vector3(lockBuf[0], lockBuf[1], lockBuf[2]);
    }

    void Swap(int i)
    {
        if (i == weapon) return;
        weapon = i; reloading = false; shotIndex = 0; recoilP = recoilY = 0f;
        synth.Tone(400f, 0.06f, Wave.Square, 0.06f, 300f, 20f);
    }

    void StartReload()
    {
        var w = Weapons[weapon];
        if (reloading || magazine[weapon] >= w.mag || reserve[weapon] <= 0 || respawnAt > elapsed) return;
        reloading = true;
        reloadEnd = elapsed + (magazine[weapon] > 0 ? w.tacReload : w.reload);
        synth.Tone(260f, 0.1f, Wave.Noise, 0.06f, 0f, 20f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("urban-strike", state, score);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput(dt);
        if (state == GameState.Playing) Step(dt);
        else if (state == GameState.Menu) { yaw += dt * 6f; pitch = -4f; }
        SyncView(dt);
    }

    static bool Collides(float x, float z, float r)
    {
        for (int i = 0; i < Blockers.GetLength(0); i++)
            if (x + r > Blockers[i, 0] && x - r < Blockers[i, 2] && z + r > Blockers[i, 1] && z - r < Blockers[i, 3]) return true;
        return false;
    }
    static void MoveWithCollision(ref Vector3 p, float dx, float dz, float r)
    {
        float nx = Mathf.Clamp(p.x + dx, -43f, 43f);
        if (!Collides(nx, p.z, r)) p.x = nx;
        float nz = Mathf.Clamp(p.z + dz, -43f, 43f);
        if (!Collides(p.x, nz, r)) p.z = nz;
    }

    void Step(float dt)
    {
        elapsed += dt;
        float remaining = MatchSeconds - elapsed;
        hitMarkT = Mathf.Max(0f, hitMarkT - dt); headMarkT = Mathf.Max(0f, headMarkT - dt); damageT = Mathf.Max(0f, damageT - dt); muzzleT = Mathf.Max(0f, muzzleT - dt);
        bool dead = respawnAt > elapsed;
        if (respawnAt > 0f && !dead)
        {
            respawnAt = -1f;
            var sp = PlayerSpawns[deaths % PlayerSpawns.Length];
            player = new Vector3(sp.x, 1.72f, sp.y); yaw = 180f; pitch = 0f;
            health = 100f; armor = 50f;
            for (int i = 0; i < 3; i++) { magazine[i] = Weapons[i].mag; reserve[i] = Mathf.Max(reserve[i], Weapons[i].reserve0 / 2); }
        }
        if (!dead)
        {
            var w = Weapons[weapon];
            if (reloading && elapsed >= reloadEnd)
            {
                int need = w.mag - magazine[weapon], load = Mathf.Min(need, reserve[weapon]);
                magazine[weapon] += load; reserve[weapon] -= load; reloading = false;
            }
            float speed = w.speed * (sprint ? 1.52f : crouch ? 0.55f : ads ? 0.72f : 1f);
            if (moveIn.sqrMagnitude > 0.0001f)
            {
                float yr = yaw * Mathf.Deg2Rad;
                var fwd = new Vector2(Mathf.Sin(yr), Mathf.Cos(yr)); var right = new Vector2(fwd.y, -fwd.x);
                var mv = fwd * moveIn.y + right * moveIn.x;
                if (mv.magnitude > 1f) mv.Normalize();
                MoveWithCollision(ref player, mv.x * speed * dt, mv.y * speed * dt, 0.34f);
            }
            if (jumpPressed && jumpH <= 0.001f && !crouch) { vy = 4.8f; synth.Tone(200f, 0.05f, Wave.Noise, 0.04f, 0f, 30f); }
            vy -= 13f * dt; jumpH = Mathf.Max(0f, jumpH + vy * dt); if (jumpH <= 0f) vy = 0f;
            stance = Mathf.Lerp(stance, crouch ? 1.12f : 1.72f, Mathf.Min(1f, dt * 15f));
            player.y = stance + jumpH;
            if (fireHeld) Fire();
            else shotIndex = 0;
            // aim assist on touch screens: a light pull towards a bot close to the crosshair while firing
            if (mobile && fireHeld) Assist(dt);
        }
        jumpPressed = false;
        recoilP = Mathf.MoveTowards(recoilP, 0f, dt * 9f);
        recoilY = Mathf.MoveTowards(recoilY, 0f, dt * 6f);

        int atObjective = 0;
        var flat = new Vector3(player.x, 0f, player.z);
        for (int i = 0; i < bots.Count; i++)
        {
            var b = bots[i];
            if (b.deadUntil > elapsed) { b.t.gameObject.SetActive(false); continue; }
            if (b.hp <= 0f)
            {
                var sp = EnemySpawns[(i + Mathf.FloorToInt(elapsed)) % EnemySpawns.Length];
                b.pos = new Vector3(sp.x, 0f, sp.y); b.hp = 100f; b.t.gameObject.SetActive(true);
            }
            float dist = Vector3.Distance(b.pos, flat);
            float dx = player.x - b.pos.x, dz = player.z - b.pos.z;
            float ang = Mathf.Atan2(dx, dz);
            float desired = 10f + i * 1.5f;
            float move = dist > desired ? 1f : dist < 5f ? -0.6f : 0f;
            float bs = (1.45f + (i % 3) * 0.15f) * op.speed;
            b.strafeFlip -= dt;
            if (b.strafeFlip <= 0f) { b.strafeFlip = 2.5f + i * 0.4f; b.strafe = -b.strafe; }
            float bdx = (Mathf.Sin(ang) * move + Mathf.Cos(ang) * b.strafe * 0.36f) * bs * dt;
            float bdz = (Mathf.Cos(ang) * move - Mathf.Sin(ang) * b.strafe * 0.36f) * bs * dt;
            MoveWithCollision(ref b.pos, bdx, bdz, 0.36f);
            b.t.SetPositionAndRotation(b.pos + Vector3.up * Mathf.Sin(elapsed * 7f + b.phase) * 0.02f, Quaternion.Euler(0f, ang * Mathf.Rad2Deg, 0f));
            if (b.pos.magnitude < 5.2f) atObjective++;
            if (dist < 43f && elapsed >= b.nextShot && !dead)
            {
                b.nextShot = elapsed + (0.52f + Mathf.Repeat(i * 0.17f + elapsed * 0.13f, 0.5f)) * op.interval;
                bool sight = !Physics.Linecast(b.pos + Vector3.up * 1.6f, player);
                if (!sight) continue;
                synth.Tone(220f + i * 20f, 0.05f, Wave.Noise, 0.035f, 0f, 30f);
                float chance = Mathf.Max(0.12f, 0.40f - dist * 0.0075f - (sprint ? 0.1f : 0f)) * op.acc;
                float roll = (Mathf.Sin(elapsed * 17.73f + i * 8.12f) + 1f) / 2f;
                if (roll < chance)
                {
                    float dmg = 5 + (i % 3) + op.dmg;
                    float absorbed = Mathf.Min(armor, Mathf.Ceil(dmg * 0.58f));
                    armor -= absorbed; dmg -= absorbed; health -= dmg; damageT = 0.22f;
                    if (health <= 0f)
                    {
                        deaths++; red++; streak = 0; health = 0f; respawnAt = elapsed + 2.2f; reloading = false;
                        AddFeed(b.name, U("YOU"), false, false);
                        synth.Tone(160f, 0.5f, Wave.Saw, 0.2f, 60f, 4f);
                    }
                }
            }
        }
        bool onObj = new Vector2(player.x, player.z).magnitude < 5.2f && !dead;
        objContested = onObj && atObjective > 0;
        objCapturing = onObj && atObjective == 0;
        if (objCapturing)
        {
            objTick += dt;
            if (objTick >= 4f) { objTick = 0f; blue++; score += 75; synth.Tone(880f, 0.12f, Wave.Triangle, 0.12f, 1100f, 8f); }
        }
        else objTick = Mathf.Max(0f, objTick - dt * 0.5f);
        if (elapsed >= nextSim)
        {
            bool blueEvent = Mathf.Sin(elapsed * 2.17f) > -0.12f;
            string ally = AllyNames[Mathf.FloorToInt(elapsed * 1.7f) % AllyNames.Length];
            string enemy = EnemyNames[Mathf.FloorToInt(elapsed * 2.3f) % EnemyNames.Length];
            if (blueEvent) { blue++; AddFeed(ally, enemy, true, Mathf.Sin(elapsed * 3.1f) > 0.65f); }
            else { red++; AddFeed(enemy, ally, false, false); }
            nextSim += 3.2f + (Mathf.Sin(elapsed) + 1f) * 0.9f;
        }
        for (int i = feed.Count - 1; i >= 0; i--) if (elapsed - feed[i].t > 5f) feed.RemoveAt(i);
        if (remaining <= 0f || blue >= ScoreLimit || red >= ScoreLimit) Finish();
    }

    void Assist(float dt)
    {
        var fwd = cam.transform.forward;
        Bot best = null; float bestA = 4f;
        foreach (var b in bots)
        {
            if (b.deadUntil > elapsed || b.hp <= 0f) continue;
            var to = b.pos + Vector3.up * 1.2f - cam.transform.position;
            float a = Vector3.Angle(fwd, to);
            if (a < bestA) { bestA = a; best = b; }
        }
        if (best == null) return;
        var dir = (best.pos + Vector3.up * 1.2f - cam.transform.position).normalized;
        float ty = Mathf.Atan2(dir.x, dir.z) * Mathf.Rad2Deg, tp = Mathf.Asin(dir.y) * Mathf.Rad2Deg;
        yaw = Mathf.LerpAngle(yaw, ty, dt * 2.2f);
        pitch = Mathf.Lerp(pitch, tp, dt * 2.2f);
    }

    void Fire()
    {
        var w = Weapons[weapon];
        if (reloading || sprint || elapsed - lastShot < 60f / w.rpm) return;
        if (magazine[weapon] <= 0) { StartReload(); return; }
        lastShot = elapsed;
        magazine[weapon]--; shots++;
        int k = shotIndex++;
        int cycle = k / 12;
        float rp = w.recoil[k % 12, 0] * (1f + Mathf.Min(cycle, 2) * 0.08f), ry = w.recoil[k % 12, 1] * (1f + Mathf.Min(cycle, 2) * 0.12f);
        // kick in degrees; the climb recovers between bursts
        recoilP += rp * 0.55f; recoilY += ry * 0.55f;
        pitch = Mathf.Clamp(pitch + rp * 0.18f, -70f, 70f); yaw += ry * 0.18f;
        float spread = (ads ? w.ads : w.hip) * (sprint ? 2.9f : moveIn.sqrMagnitude > 0.01f ? 1.55f : 1f) * (crouch ? 0.72f : 1f);
        var basis = cam.transform.rotation;
        float a = Random.value * Mathf.PI * 2f, rad = Mathf.Sqrt(Random.value) * spread;
        var dir = basis * new Vector3(Mathf.Cos(a) * rad, Mathf.Sin(a) * rad, 1f).normalized;
        var origin = cam.transform.position;
        float wall = 105f;
        if (Physics.Raycast(origin, dir, out var hit, 105f)) wall = hit.distance;
        Bot target = null; bool head = false; float best = wall;
        foreach (var b in bots)
        {
            if (b.deadUntil > elapsed || b.hp <= 0f) continue;
            float dh = RaySphere(origin, dir, b.pos + Vector3.up * 1.69f, 0.21f);
            if (dh >= 0f && dh < best) { best = dh; target = b; head = true; }
            float db = RaySphere(origin, dir, b.pos + Vector3.up * 1.03f, 0.43f);
            if (db >= 0f && db < best) { best = db; target = b; head = false; }
        }
        var end = origin + dir * (target != null ? best : wall);
        ShowTracer(viewGun.TransformPoint(new Vector3(0f, 0.012f, 0.36f)), end);
        muzzleT = 0.05f;
        synth.Tone(w.id == "ak" ? 140f : w.id == "mp5" ? 260f : 190f, 0.07f, Wave.Noise, 0.09f, 0f, 30f);
        if (target == null)
        {
            if (wall < 105f) bursts.Emit(end, new Color(0.8f, 0.78f, 0.7f), 4, 1.5f, 0.08f, 0.3f);
            return;
        }
        hits++; hitMarkT = 0.13f; if (head) headMarkT = 0.18f;
        float falloffStart = w.id == "mp5" ? 22f : 34f, falloffEnd = w.id == "mp5" ? 58f : 86f;
        float falloff = best <= falloffStart ? 1f : Mathf.Max(0.62f, 1f - (best - falloffStart) / (falloffEnd - falloffStart) * 0.38f);
        target.hp -= Mathf.Round(w.dmg * (head ? w.headMul : 1f) * falloff);
        bursts.Emit(end, new Color(0.9f, 0.2f, 0.15f), 6, 2f, 0.1f, 0.3f);
        if (target.hp > 0f) return;
        target.hp = 0f; target.deadUntil = elapsed + 2.7f;
        kills++; streak++; blue++;
        score += 100 + (head ? 50 : 0) + Mathf.Min(Mathf.Max(streak, 0), 5) * 10;
        AddFeed(U("YOU"), target.name, true, head);
        bursts.Emit(target.pos + Vector3.up, new Color(0.9f, 0.3f, 0.2f), 18, 3f, 0.15f, 0.5f);
        synth.Tone(1200f, 0.08f, Wave.Triangle, 0.12f, 1500f, 12f);
    }

    static float RaySphere(Vector3 o, Vector3 d, Vector3 c, float r)
    {
        var off = o - c;
        float b = Vector3.Dot(off, d), cc = off.sqrMagnitude - r * r, disc = b * b - cc;
        if (disc < 0f) return -1f;
        float near = -b - Mathf.Sqrt(disc), far = -b + Mathf.Sqrt(disc);
        return near >= 0f ? near : far >= 0f ? far : -1f;
    }

    int tracerNext;
    void ShowTracer(Vector3 a, Vector3 b)
    {
        var t = tracers[tracerNext++ % tracers.Count];
        t.gameObject.SetActive(true);
        t.position = (a + b) * 0.5f;
        t.rotation = Quaternion.LookRotation(b - a);
        t.localScale = new Vector3(0.015f, 0.015f, (b - a).magnitude);
        StartCoroutine(HideLater(t.gameObject, 0.06f));
    }
    IEnumerator HideLater(GameObject g, float s) { yield return new WaitForSeconds(s); if (g != null) g.SetActive(false); }

    void AddFeed(string a, string b, bool blueSide, bool headshot)
    {
        feed.Add(new Feed { text = $"<color={(blueSide ? "#7cc4ff" : "#ff8a7a")}>{a}</color> → {b}{(headshot ? " ◎" : "")}", t = elapsed });
        if (feed.Count > 4) feed.RemoveAt(0);
    }

    void Finish()
    {
        LockWant(false);
        if (blue > red)
        {
            starsWon = 1 + (blue - red >= 8 ? 1 : 0) + (deaths <= 2 ? 1 : 0);
            score += starsWon * 100;
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, score, StageCount);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f }, 0.1f));
        }
        else
        {
            state = GameState.GameOver;
            synth.Tone(180f, 0.7f, Wave.Saw, 0.2f, 60f, 3f);
        }
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.18f, Wave.Triangle, 0.22f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void SyncView(float dt)
    {
        var w = Weapons[weapon];
        float target = state == GameState.Playing && ads ? w.adsFov : 72f;
        fov = Mathf.Lerp(fov, target, Mathf.Min(1f, dt * 12f));
        // portrait phones get a wider vertical view so the narrow screen still shows the street
        cam.fieldOfView = cam.aspect < 1f ? Mathf.Min(100f, fov * 1.25f) : fov;
        cam.transform.position = respawnAt > elapsed && state == GameState.Playing ? player + Vector3.up * 6f : player;
        cam.transform.rotation = Quaternion.Euler(-(pitch + recoilP), yaw + recoilY, 0f);
        if (respawnAt > elapsed && state == GameState.Playing) cam.transform.rotation = Quaternion.Euler(60f, yaw, 0f);
        float adsAmt = Mathf.InverseLerp(72f, w.adsFov, fov);
        float reloadDrop = reloading ? 1f : 0f;
        float bob = moveIn.sqrMagnitude > 0.01f && state == GameState.Playing ? Mathf.Sin(elapsed * (sprint ? 14f : 9f)) * 0.012f : 0f;
        viewGun.localPosition = Vector3.Lerp(new Vector3(0.17f, -0.16f - reloadDrop * 0.1f + bob, 0.38f), new Vector3(0f, -0.085f, 0.3f), adsAmt);
        viewGun.localRotation = Quaternion.Euler(-recoilP * 1.5f + (sprint ? 20f : 0f), sprint ? -25f : 0f, 0f);
        viewGun.gameObject.SetActive(state == GameState.Playing || state == GameState.Ready || state == GameState.Paused);
        muzzleFlash.gameObject.SetActive(muzzleT > 0f);
        muzzleFlash.rotation = cam.transform.rotation;
    }

    // ?oiyotest=1 prints the run state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (testLog == false && testT == 0f) { testLog = Application.absoluteURL.Contains("oiyotest=1"); testT = -1f; }
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.2f;
        var sb = new System.Text.StringBuilder();
        foreach (var b in bots) sb.Append($"[{b.pos.x:F1},{b.pos.z:F1},{(b.deadUntil > elapsed || b.hp <= 0f ? 0 : 1)}],");
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"x\":{player.x:F1},\"z\":{player.z:F1},\"yaw\":{yaw:F0},\"pitch\":{pitch:F0},\"hp\":{health:F0},\"b\":{blue},\"r\":{red},\"k\":{kills},\"d\":{deaths},\"t\":{elapsed:F0},\"mag\":{magazine[weapon]},\"bots\":[{sb.ToString().TrimEnd(',')}]}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.2f, 0.55f, 0.95f, 0.97f);
    static readonly Color Dark = new Color(0.04f, 0.05f, 0.07f, 0.82f);
    static readonly Color Gold = new Color(1f, 0.82f, 0.3f, 0.97f);
    static readonly Color Slate = new Color(0.17f, 0.2f, 0.25f, 0.95f);
    static readonly Color Pad = new Color(0f, 0f, 0f, 0.36f);

    // i18n
    static readonly string[] Tiers = { "Recruit bots", "Regular bots", "Veteran bots", "Elite bots" };
    string StageTitle(int i) => F("Operation {0}", i + 1) + " · " + U(Tiers[i / 5]);
    static string Mmss(float s) { s = Mathf.Max(0f, Mathf.Ceil(s)); return $"{Mathf.FloorToInt(s / 60f)}:{Mathf.FloorToInt(s % 60f):00}"; }

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        if (damageT > 0f) OiyoArcade.Fill(new Rect(0f, 0f, w, h), new Color(0.8f, 0f, 0f, damageT * 0.6f));
        // score bar
        var top = new Rect(w * 0.5f - 130f, 8f, 260f, 44f);
        OiyoArcade.Panel(top, Dark);
        OiyoArcade.Text(new Rect(top.x + 8f, top.y + 4f, 80f, 36f), $"<color=#7cc4ff><b>{blue}</b></color>", 24, Color.white, TextAnchor.MiddleLeft);
        OiyoArcade.Text(new Rect(top.x, top.y + 2f, top.width, 22f), $"<b>{Mmss(MatchSeconds - elapsed)}</b>", 17, Color.white, TextAnchor.UpperCenter);
        OiyoArcade.Text(new Rect(top.x, top.y + 22f, top.width, 18f), objCapturing ? "<color=#ffd36b>" + U("Capturing") + "</color>" : objContested ? "<color=#ff8a7a>" + U("Contested") + "</color>" : $"<size=11>{F("First to {0}", ScoreLimit)}</size>", 12, Color.white, TextAnchor.UpperCenter);
        OiyoArcade.Text(new Rect(top.xMax - 88f, top.y + 4f, 80f, 36f), $"<color=#ff8a7a><b>{red}</b></color>", 24, Color.white, TextAnchor.MiddleRight);
        OiyoArcade.Text(new Rect(12f, 10f, w * 0.5f - 150f, 40f), $"<b>{F("Op {0}", stageIdx + 1)}</b>", 14, new Color(0.8f, 0.9f, 1f));
        if (OiyoArcade.Button(new Rect(w - 62f, 8f, 46f, 46f), "<b>II</b>", Slate, 18))
        {
            if (state == GameState.Playing) Pause();
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        // kill feed
        for (int i = 0; i < feed.Count; i++) OiyoArcade.Text(new Rect(w - 220f, 60f + i * 18f, 206f, 18f), feed[i].text, 12, Color.white, TextAnchor.UpperRight);
        // crosshair
        if (state == GameState.Playing && respawnAt <= elapsed)
        {
            float gap = ads ? 3f : 7f + (sprint ? 8f : moveIn.sqrMagnitude > 0.01f ? 4f : 0f);
            var cc = new Vector2(w * 0.5f, h * 0.5f);
            var col = hitMarkT > 0f ? (headMarkT > 0f ? new Color(1f, 0.85f, 0.2f) : new Color(1f, 0.35f, 0.3f)) : new Color(1f, 1f, 1f, 0.9f);
            OiyoArcade.Fill(new Rect(cc.x - gap - 8f, cc.y - 1f, 8f, 2f), col); OiyoArcade.Fill(new Rect(cc.x + gap, cc.y - 1f, 8f, 2f), col);
            OiyoArcade.Fill(new Rect(cc.x - 1f, cc.y - gap - 8f, 2f, 8f), col); OiyoArcade.Fill(new Rect(cc.x - 1f, cc.y + gap, 2f, 8f), col);
        }
        // health, armour, ammo: bottom middle-left, above the page's exit button
        var hud = new Rect(12f, h - 150f, 170f, 62f);
        if (!mobile) hud = new Rect(12f, h - 74f, 200f, 62f);
        OiyoArcade.Panel(hud, Dark);
        OiyoArcade.Text(new Rect(hud.x + 10f, hud.y + 4f, hud.width - 20f, 20f), $"<b>{Mathf.CeilToInt(health)}</b> <size=11>{U("HP")}</size>  <color=#8ec9ff><b>{Mathf.CeilToInt(armor)}</b></color> <size=11>{U("Armor")}</size>", 14, Color.white);
        OiyoArcade.Bar(new Rect(hud.x + 10f, hud.y + 26f, hud.width - 20f, 5f), health / 100f, new Color(0f, 0f, 0f, 0.5f), new Color(0.6f, 0.95f, 0.3f));
        string ammo = reloading ? U("Reloading") : $"<b>{magazine[weapon]}</b> / {reserve[weapon]}";
        OiyoArcade.Text(new Rect(hud.x + 10f, hud.y + 36f, hud.width - 20f, 22f), $"{Weapons[weapon].name}  {ammo}", 13, Gold);
        // radar
        DrawRadar(new Rect(12f, 60f, 92f, 92f));
        if (!mobile && !mouseLocked && state == GameState.Playing)
            OiyoArcade.Text(new Rect(0f, h * 0.5f + 24f, w, 20f), U("Click the game to aim with the mouse (Esc frees it)"), 13, new Color(1f, 1f, 1f, 0.8f), TextAnchor.UpperCenter);
        if (respawnAt > elapsed && state == GameState.Playing)
            OiyoArcade.Shadowed(new Rect(0f, h * 0.4f, w, 40f), F("Respawn in {0}", Mathf.CeilToInt(respawnAt - elapsed)), 24, new Color(1f, 0.6f, 0.5f), TextAnchor.MiddleCenter);
        if (mobile && (state == GameState.Playing || state == GameState.Ready)) DrawButtons(w, h);
        if (state == GameState.Ready)
        {
            var r = new Rect(w * 0.5f - 175f, h * 0.5f - 150f, 350f, 128f);
            OiyoArcade.Panel(r, Dark);
            string how = mobile ? U("Left side to move, right side to look, hold FIRE to shoot (drag it to aim).") : U("Click to aim with the mouse. WASD move, click fire, right-click aim, R reload, 1-3 weapons, Shift sprint, Space jump, C crouch.");
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 8f, r.width - 24f, r.height - 16f), $"<b>{U("Win the 2-minute team match")}</b>\n<size=13>{how}</size>", 16, Color.white, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Paused) DrawPause(w, h);
        if (state == GameState.Victory || state == GameState.GameOver) DrawResult(w, h);
    }

    void DrawRadar(Rect r)
    {
        OiyoArcade.Panel(r, new Color(0f, 0f, 0f, 0.45f));
        var c = r.center; float s = r.width * 0.5f / 45f;
        float yr = yaw * Mathf.Deg2Rad;
        foreach (var b in bots)
        {
            if (b.deadUntil > elapsed || b.hp <= 0f) continue;
            var d = new Vector2(b.pos.x - player.x, b.pos.z - player.z);
            // rotate so the view direction is up
            var rd = new Vector2(d.x * Mathf.Cos(yr) - d.y * Mathf.Sin(yr), d.x * Mathf.Sin(yr) + d.y * Mathf.Cos(yr));
            var p = c + new Vector2(rd.x, -rd.y) * s;
            if (r.Contains(p)) OiyoArcade.Fill(new Rect(p.x - 2.5f, p.y - 2.5f, 5f, 5f), new Color(1f, 0.35f, 0.3f));
        }
        var o = new Vector2(-player.x, -player.z);
        var ro = new Vector2(o.x * Mathf.Cos(yr) - o.y * Mathf.Sin(yr), o.x * Mathf.Sin(yr) + o.y * Mathf.Cos(yr));
        var op2 = c + new Vector2(ro.x, -ro.y) * s;
        if (r.Contains(op2)) OiyoArcade.Fill(new Rect(op2.x - 3f, op2.y - 3f, 6f, 6f), Gold);
        OiyoArcade.Fill(new Rect(c.x - 2.5f, c.y - 2.5f, 5f, 5f), new Color(0.5f, 0.8f, 1f));
    }

    void DrawButtons(float w, float h)
    {
        Layout(w, h);
        OiyoArcade.Panel(BtnFire, fireHeld ? new Color(1f, 0.4f, 0.3f, 0.85f) : new Color(1f, 0.35f, 0.25f, 0.55f));
        OiyoArcade.Text(BtnFire, "<b>" + U("FIRE") + "</b>", 16, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Panel(BtnAds, ads ? new Color(0.3f, 0.6f, 1f, 0.7f) : Pad); OiyoArcade.Text(BtnAds, "<b>" + U("AIM") + "</b>", 13, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Panel(BtnReload, Pad); OiyoArcade.Text(BtnReload, U("Reload"), 12, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Panel(BtnSwap, Pad); OiyoArcade.Text(BtnSwap, U("Swap"), 12, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Panel(BtnJump, Pad); OiyoArcade.Text(BtnJump, U("Jump"), 12, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Panel(BtnCrouch, crouch ? new Color(1f, 1f, 1f, 0.3f) : Pad); OiyoArcade.Text(BtnCrouch, U("Crouch"), 12, Color.white, TextAnchor.MiddleCenter);
        if (stickId != int.MinValue)
        {
            var c0 = OiyoArcade.ToGui(stickStart); var c1 = OiyoArcade.ToGui(stickNow);
            var d = c1 - c0; if (d.magnitude > 46f) d = d.normalized * 46f;
            OiyoArcade.Panel(new Rect(c0.x - 50f, c0.y - 50f, 100f, 100f), new Color(1f, 1f, 1f, 0.12f));
            OiyoArcade.Panel(new Rect(c0.x + d.x - 22f, c0.y + d.y - 22f, 44f, 44f), new Color(1f, 1f, 1f, 0.35f));
        }
    }

    void DrawMenu(float w, float h)
    {
        if (showStages)
        {
            float bw = Mathf.Min(w - 16f, 760f);
            var box = new Rect(w * 0.5f - bw * 0.5f, 12f, bw, Mathf.Min(h - 24f, 520f));
            OiyoArcade.Panel(box, new Color(0.04f, 0.05f, 0.07f, 0.94f));
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
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("Urban Strike 3D"), 30, new Color(0.75f, 0.88f, 1f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 60f, cw - 40f, 50f), U("Six against six in a city block. Hold the centre ring, out-shoot the bots and finish the match ahead."), 15, new Color(1f, 1f, 1f, 0.85f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x, card.y + 110f, cw, 24f), StageTitle(stageIdx), 15, Gold, TextAnchor.MiddleCenter);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 142f, cw - 48f, 58f), "<b>▶ " + F("Play stage {0}", stageIdx + 1) + "</b>", Accent, 21)) LoadStage(stageIdx);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 210f, cw - 48f, 46f), U("All 20 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}", Slate, 17)) showStages = true;
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
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 14f, cw, 38f), won ? U("Victory!") : U("Defeat"), 28, won ? new Color(0.6f, 0.9f, 1f) : new Color(1f, 0.55f, 0.5f), TextAnchor.MiddleCenter);
        string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : U("The red team finished ahead.");
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 56f, cw - 32f, 44f), detail, 16, Color.white, TextAnchor.MiddleCenter);
        int acc = shots > 0 ? Mathf.RoundToInt(hits * 100f / shots) : 0;
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 100f, cw - 32f, 52f),
            $"<color=#7cc4ff><b>{blue}</b></color> : <color=#ff8a7a><b>{red}</b></color>   {U("Score")} <b>{score}</b>\n<size=14>K {kills} · D {deaths} · {U("Accuracy")} {acc}%</size>", 16, Color.white, TextAnchor.MiddleCenter);
        float y = card.y + 158f;
        if (won && stageIdx < StageCount - 1)
        {
            if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 50f), "<b>" + U("Next stage") + " ▶</b>", Accent, 19)) LoadStage(stageIdx + 1);
            y += 58f;
        }
        else if (won)
        {
            OiyoArcade.Text(new Rect(card.x, y, cw, 50f), "★ " + U("You cleared all 20 stages!") + " ★", 17, Gold, TextAnchor.MiddleCenter);
            y += 58f;
        }
        if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 44f), U("Retry"), won ? Slate : Accent, 17)) LoadStage(stageIdx);
        y += 52f;
        if (OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 40f), U("Stage list"), Slate, 16)) { LoadStage(stageIdx, false); showStages = true; }
    }
}
