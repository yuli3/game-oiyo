using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Night Horde 3D: the web Night Horde (src/components/games/VampireSurvivor.tsx,
// src/lib/games/vampire-survivor.ts) rebuilt as a 30-stage Unity survival arena. The web
// rules in world units (1 unit = 50 px): a 40 x 40 field, the hero at 140 px/s, enemies that
// walk straight at you (bats, skeletons, ghosts, golems with the web's health, speed, damage
// and gems), spawns on a ring 320-400 px out that come faster as the night goes on, the
// wand firing at the nearest enemy on its own, gems pulled in by the magnet, and a level-up
// pick of three from ten upgrades (five weapons, five passives, five levels each). The item
// names are our own. Each stage is a night to survive (60 s growing to about 3 minutes);
// later nights start deeper into the web's spawn schedule and lean on one kind of enemy,
// and every fifth night ends with a Horde Lord to bring down. Stars from the health left.
public class NightHordePlayer : MonoBehaviour
{
    const string Slug = "night-horde";
    const int StageCount = 30;
    const float Field = 20f, HeroSpeed = 2.8f, HeroR = 0.28f, Magnet = 1.8f, MaxEnemies = 240;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, LevelUp, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    static readonly string[] ZoneNames = { "Graveyard", "Bat swarm", "Bone march", "Ghost fog", "Stone giants", "Blood moon" };
    static readonly Color[] ZoneColor = { new Color(0.55f, 0.8f, 1f), new Color(0.75f, 0.55f, 1f), new Color(0.95f, 0.9f, 0.75f), new Color(0.6f, 1f, 0.9f), new Color(0.85f, 0.7f, 0.5f), new Color(1f, 0.35f, 0.35f) };

    // ten upgrades: five weapons, five passives (original names)
    enum Up { Wand, Circle, Tomes, Knives, Thunder, Tonic, Boots, Plate, Lodestone, Heart }
    static readonly string[] UpName = { "Spark Wand", "Salt Circle", "Orbiting Tomes", "Throwing Knives", "Thunder Call", "Iron Tonic", "Swift Boots", "Plate Armor", "Lodestone", "Heart Charm" };
    static readonly string[] UpDesc =
    {
        "Fires sparks at the nearest enemy.",
        "A ring around you that hurts and pushes back anything inside.",
        "Books circle you and knock enemies away.",
        "Knives fly the way you face and pierce through.",
        "Lightning strikes random enemies.",
        "All weapons hit 15% harder.",
        "Move 12% faster.",
        "Every hit you take is 1 smaller.",
        "Gems are pulled in from 30% further.",
        "20 more health, and heals 20.",
    };
    static readonly Color[] UpColor = { new Color(0.5f, 0.8f, 1f), new Color(0.95f, 0.95f, 0.8f), new Color(1f, 0.85f, 0.4f), new Color(0.8f, 0.85f, 0.95f), new Color(1f, 1f, 0.45f), new Color(0.6f, 1f, 0.5f), new Color(0.5f, 1f, 0.9f), new Color(0.7f, 0.75f, 0.85f), new Color(1f, 0.5f, 0.55f), new Color(1f, 0.4f, 0.6f) };

    enum EKind { Bat, Skeleton, Ghost, Golem, Lord }
    class Enemy { public EKind kind; public Vector2 p; public float hp, maxHp, speed, dmg, r, flash; public int xp; public Transform t; }
    class Gem { public Vector2 p; public int value; public Transform t; }
    class Shot { public Vector2 p, v; public float dmg, r, life; public int pierce; public bool knife; public Transform t; }

    int stageIdx;
    readonly List<Enemy> enemies = new List<Enemy>();
    readonly List<Gem> gems = new List<Gem>();
    readonly List<Shot> shots = new List<Shot>();
    readonly int[] lvl = new int[10];
    Vector2 hero, moveDir;
    float facing, hp, maxHp, inv, time, spawnT, nightLen, tomeAngle;
    readonly float[] cool = new float[5];
    int level, xp, nextXp, kills, score, stars;
    bool lordSpawned, lordDown;
    Enemy lord;
    readonly List<int> offer = new List<int>();
    string endReason = "";
    System.Random rnd;

    Camera cam;
    Transform root, heroT, heroBody, ring;
    readonly List<Transform> tomes = new List<Transform>();
    Material batMat, skelMat, ghostMat, golemMat, lordMat, shadowMat, gemBlue, gemGreen, gemRed, wandMat, knifeMat;
    Bursts bursts;
    Synth synth;
    bool showStages;
    float shake, flashScreen;

    int Zone => stageIdx / 5;
    bool LordNight => stageIdx % 5 == 4;
    float Clock => time + stageIdx * 9f; // later nights start deeper into the web's schedule

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
        cam.farClipPlane = 120f;
        var key = new GameObject("Moon").AddComponent<Light>();
        key.type = LightType.Directional;
        key.intensity = 0.75f;
        key.color = new Color(0.7f, 0.78f, 1f);
        key.transform.rotation = Quaternion.Euler(55f, 25f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.fog = true;
        RenderSettings.fogMode = FogMode.Linear;
        RenderSettings.fogStartDistance = 16f;
        RenderSettings.fogEndDistance = 40f;
        bursts = new Bursts(transform, 0.2f);
        synth = new Synth(gameObject);
        batMat = OiyoArcade.Transparent(OiyoArcade.Art("NH/bat"), Color.white);
        skelMat = OiyoArcade.Transparent(OiyoArcade.Art("NH/skeleton"), Color.white);
        ghostMat = OiyoArcade.Transparent(OiyoArcade.Art("NH/ghost"), new Color(1f, 1f, 1f, 0.85f));
        golemMat = OiyoArcade.Transparent(OiyoArcade.Art("NH/golem"), Color.white);
        lordMat = OiyoArcade.Transparent(OiyoArcade.Art("NH/lord"), Color.white);
        shadowMat = OiyoArcade.Transparent(OiyoArcade.GlowTexture(), new Color(0f, 0f, 0f, 0.45f));
        gemBlue = OiyoArcade.Transparent(OiyoArcade.Art("NH/gem"), new Color(0.45f, 0.75f, 1f));
        gemGreen = OiyoArcade.Transparent(OiyoArcade.Art("NH/gem"), new Color(0.45f, 1f, 0.55f));
        gemRed = OiyoArcade.Transparent(OiyoArcade.Art("NH/gem"), new Color(1f, 0.4f, 0.45f));
        wandMat = OiyoArcade.Transparent(OiyoArcade.GlowTexture(), new Color(0.55f, 0.85f, 1f, 1f));
        knifeMat = OiyoArcade.Lit(new Color(0.85f, 0.88f, 0.95f), 0.9f, null, 0.8f);
    }

    // ---------------- Scene ----------------
    void BuildScene()
    {
        var accent = ZoneColor[Zone];
        bool blood = Zone == 5;
        var sky = blood ? new Color(0.12f, 0.03f, 0.05f) : new Color(0.04f, 0.05f, 0.1f);
        cam.backgroundColor = sky;
        RenderSettings.fogColor = sky;
        RenderSettings.ambientLight = blood ? new Color(0.45f, 0.3f, 0.32f) : new Color(0.32f, 0.36f, 0.48f);
        var groundMat = OiyoArcade.Lit(blood ? new Color(0.85f, 0.65f, 0.65f) : Color.white, 0.05f, OiyoArcade.Art("NH/ground", true));
        groundMat.mainTextureScale = new Vector2(12f, 12f);
        var ground = OiyoArcade.Prim(PrimitiveType.Plane, "Ground", groundMat, root);
        ground.transform.localScale = new Vector3(Field * 0.2f + 2f, 1f, Field * 0.2f + 2f);
        // a low iron fence round the field
        var fenceMat = OiyoArcade.Lit(new Color(0.2f, 0.2f, 0.25f), 0.5f, null, 0.6f);
        for (int s = 0; s < 4; s++)
        {
            for (float u = -Field; u <= Field; u += 1.5f)
            {
                var post = OiyoArcade.Prim(PrimitiveType.Cube, "Post", fenceMat, root);
                Vector3 pos = s == 0 ? new Vector3(u, 0.5f, Field + 0.5f) : s == 1 ? new Vector3(u, 0.5f, -Field - 0.5f) : s == 2 ? new Vector3(Field + 0.5f, 0.5f, u) : new Vector3(-Field - 0.5f, 0.5f, u);
                post.transform.position = pos;
                post.transform.localScale = new Vector3(0.1f, 1f, 0.1f);
            }
            var rail = OiyoArcade.Prim(PrimitiveType.Cube, "Rail", fenceMat, root);
            rail.transform.position = s == 0 ? new Vector3(0f, 0.8f, Field + 0.5f) : s == 1 ? new Vector3(0f, 0.8f, -Field - 0.5f) : s == 2 ? new Vector3(Field + 0.5f, 0.8f, 0f) : new Vector3(-Field - 0.5f, 0.8f, 0f);
            rail.transform.localScale = s < 2 ? new Vector3(Field * 2f + 1f, 0.08f, 0.08f) : new Vector3(0.08f, 0.08f, Field * 2f + 1f);
        }
        // tombstones, dead trees and lanterns (decoration only; the web field is open)
        var rs = new System.Random(stageIdx * 17 + 3);
        var stoneMat = OiyoArcade.Lit(new Color(0.5f, 0.52f, 0.58f), 0.2f, OiyoArcade.Art("NH/stone", true));
        var barkMat = OiyoArcade.Lit(new Color(0.22f, 0.17f, 0.15f), 0.1f);
        for (int i = 0; i < 70; i++)
        {
            var p = new Vector2((float)rs.NextDouble() * 2f - 1f, (float)rs.NextDouble() * 2f - 1f) * (Field - 1f);
            if (p.magnitude < 3f) continue;
            double roll = rs.NextDouble();
            if (roll < 0.6)
            {
                var st = OiyoArcade.Prim(PrimitiveType.Cube, "Tomb", stoneMat, root);
                st.transform.position = new Vector3(p.x, 0.35f, p.y);
                st.transform.rotation = Quaternion.Euler(((float)rs.NextDouble() - 0.5f) * 14f, (float)rs.NextDouble() * 40f - 20f, 0f);
                st.transform.localScale = new Vector3(0.55f, 0.75f, 0.16f);
            }
            else if (roll < 0.85)
            {
                var tr = OiyoArcade.Prim(PrimitiveType.Cylinder, "Tree", barkMat, root);
                float h = 1.2f + (float)rs.NextDouble() * 1.4f;
                tr.transform.position = new Vector3(p.x, h * 0.5f, p.y);
                tr.transform.localScale = new Vector3(0.18f, h * 0.5f, 0.18f);
                for (int b = 0; b < 3; b++)
                {
                    var br = OiyoArcade.Prim(PrimitiveType.Cube, "Branch", barkMat, tr.transform);
                    br.transform.localPosition = new Vector3(0f, 0.3f + b * 0.25f, 0f);
                    br.transform.localRotation = Quaternion.Euler(0f, b * 120f, 50f);
                    br.transform.localScale = new Vector3(0.5f, 3f / h, 0.5f);
                }
            }
            else
            {
                var lp = OiyoArcade.Prim(PrimitiveType.Cube, "Lantern", OiyoArcade.Glow(new Color(1f, 0.8f, 0.45f)), root);
                lp.transform.position = new Vector3(p.x, 0.25f, p.y);
                lp.transform.localScale = new Vector3(0.22f, 0.3f, 0.22f);
                var g = OiyoArcade.GlowQuad("Glow", new Color(1f, 0.75f, 0.4f, 0.4f), 2.6f, root);
                g.transform.SetPositionAndRotation(new Vector3(p.x, 0.03f, p.y), Quaternion.Euler(90f, 0f, 0f));
            }
        }
        var moon = OiyoArcade.GlowQuad("Moon", blood ? new Color(1f, 0.35f, 0.3f, 0.9f) : new Color(0.9f, 0.95f, 1f, 0.9f), 9f, root);
        moon.transform.position = new Vector3(14f, 18f, 46f);

        // the hero: a hooded lantern-bearer
        heroT = new GameObject("Hero").transform;
        heroT.SetParent(root, false);
        heroBody = new GameObject("Body").transform;
        heroBody.SetParent(heroT, false);
        var cloak = OiyoArcade.Prim(PrimitiveType.Capsule, "Cloak", OiyoArcade.Lit(new Color(0.25f, 0.3f, 0.6f), 0.3f), heroBody);
        cloak.transform.localScale = new Vector3(0.5f, 0.42f, 0.5f);
        cloak.transform.localPosition = new Vector3(0f, 0.42f, 0f);
        var hood = OiyoArcade.Prim(PrimitiveType.Sphere, "Hood", OiyoArcade.Lit(new Color(0.18f, 0.22f, 0.48f), 0.3f), heroBody);
        hood.transform.localScale = Vector3.one * 0.38f;
        hood.transform.localPosition = new Vector3(0f, 0.86f, 0f);
        var face = OiyoArcade.Prim(PrimitiveType.Sphere, "Face", OiyoArcade.Glow(new Color(1f, 0.85f, 0.65f)), heroBody);
        face.transform.localScale = new Vector3(0.22f, 0.18f, 0.12f);
        face.transform.localPosition = new Vector3(0f, 0.84f, 0.14f);
        var lamp = OiyoArcade.Prim(PrimitiveType.Sphere, "Lamp", OiyoArcade.Glow(new Color(1f, 0.85f, 0.4f)), heroBody);
        lamp.transform.localScale = Vector3.one * 0.16f;
        lamp.transform.localPosition = new Vector3(0.3f, 0.5f, 0.2f);
        var light = OiyoArcade.GlowQuad("LampGlow", new Color(1f, 0.85f, 0.5f, 0.5f), 4.5f, heroT);
        light.transform.SetLocalPositionAndRotation(new Vector3(0f, 0.04f, 0f), Quaternion.Euler(90f, 0f, 0f));
        ring = OiyoArcade.Prim(PrimitiveType.Quad, "SaltCircle", OiyoArcade.Transparent(OiyoArcade.Art("NH/circle"), new Color(1f, 1f, 0.9f, 0.55f)), heroT).transform;
        ring.localRotation = Quaternion.Euler(90f, 0f, 0f);
        ring.localPosition = new Vector3(0f, 0.05f, 0f);
        tomes.Clear();
        for (int i = 0; i < 6; i++)
        {
            var tb = OiyoArcade.Prim(PrimitiveType.Cube, "Tome", OiyoArcade.LitGlow(new Color(0.75f, 0.2f, 0.25f), new Color(0.25f, 0.15f, 0f), 0.5f), root);
            tb.transform.localScale = new Vector3(0.36f, 0.12f, 0.46f);
            var gl = OiyoArcade.GlowQuad("TomeGlow", new Color(1f, 0.85f, 0.4f, 0.5f), 2.5f, tb.transform);
            gl.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
            tomes.Add(tb.transform);
        }
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Night").transform;
        enemies.Clear(); gems.Clear(); shots.Clear();
        BuildScene();
        rnd = new System.Random(8800 + stageIdx * 41);
        for (int i = 0; i < lvl.Length; i++) lvl[i] = 0;
        lvl[(int)Up.Wand] = 1;
        for (int i = 0; i < cool.Length; i++) cool[i] = 0f;
        hero = Vector2.zero; moveDir = Vector2.zero; facing = 0f;
        maxHp = 100f; hp = 100f; inv = 0f; time = 0f; spawnT = 0f; tomeAngle = 0f;
        level = 1; xp = 0; nextXp = 40; kills = 0; score = 0; stars = 0;
        nightLen = Mathf.Round(60f + stageIdx * 4f);
        lordSpawned = lordDown = false; lord = null;
        endReason = ""; showStages = false; offer.Clear();
        state = ready ? GameState.Ready : GameState.Menu;
        Sync(0f);
        UpdateCamera(1f, true);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("night-horde", state, score);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        ReadInput();
        if (state == GameState.Playing)
        {
            int n = Mathf.CeilToInt(dt / (1f / 60f));
            for (int i = 0; i < n && state == GameState.Playing; i++) Step(dt / n);
        }
        else if (state == GameState.Menu)
        {
            hero = new Vector2(Mathf.Sin(Time.time * 0.4f) * 2f, Mathf.Cos(Time.time * 0.3f) * 1.5f);
            facing = Time.time * 0.4f;
        }
        Sync(dt);
        UpdateCamera(dt, false);
    }

    // a floating stick: where the finger went down is the centre
    int stickId = int.MinValue;
    Vector2 stickStart, stickNow;

    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        var kd = new Vector2((Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D) ? 1f : 0f) - (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A) ? 1f : 0f),
                             (Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.W) ? 1f : 0f) - (Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.S) ? 1f : 0f));
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; return; }
                    var began = OiyoArcade.Began();
                    foreach (var b in began) if (stickId == int.MinValue) { stickId = b.id; stickStart = stickNow = b.pos; }
                    bool held = false;
                    if (stickId != int.MinValue)
                    {
                        foreach (var h in OiyoArcade.Held()) if (h.id == stickId) { held = true; stickNow = h.pos; }
                        if (!held) stickId = int.MinValue;
                    }
                    moveDir = kd;
                    if (held)
                    {
                        var d = (stickNow - stickStart) / OiyoArcade.ComputeScale();
                        if (d.magnitude > 8f) moveDir = d / Mathf.Max(d.magnitude, 40f);
                    }
                    if (moveDir.sqrMagnitude > 1f) moveDir.Normalize();
                    if (state == GameState.Ready && (began.Count > 0 || kd != Vector2.zero || Input.anyKeyDown)) state = GameState.Playing;
                    return;
                }
            case GameState.LevelUp:
                {
                    stickId = int.MinValue; moveDir = Vector2.zero;
                    for (int i = 0; i < offer.Count; i++) if (Input.GetKeyDown(KeyCode.Alpha1 + i)) Pick(i);
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

    float DmgMul => 1f + lvl[(int)Up.Tonic] * 0.15f;

    void Step(float dt)
    {
        time += dt;
        inv = Mathf.Max(0f, inv - dt);
        // move
        if (moveDir.sqrMagnitude > 0.0025f)
        {
            float sp = HeroSpeed * (1f + lvl[(int)Up.Boots] * 0.12f) * Mathf.Min(1f, moveDir.magnitude * 1.2f);
            hero += moveDir.normalized * sp * dt;
            hero.x = Mathf.Clamp(hero.x, -Field + 0.4f, Field - 0.4f);
            hero.y = Mathf.Clamp(hero.y, -Field + 0.4f, Field - 0.4f);
            facing = Mathf.Atan2(moveDir.y, moveDir.x);
        }
        Spawning(dt);
        Enemies(dt);
        if (state != GameState.Playing) return;
        Weapons(dt);
        Shots(dt);
        Gems(dt);
        // the night ends at dawn, or when the Horde Lord falls
        if (time >= nightLen)
        {
            if (LordNight && !lordSpawned) SpawnLord();
            else if (!LordNight) { Win(); return; }
        }
        if (LordNight && lordDown) Win();
    }

    void Spawning(float dt)
    {
        spawnT += dt;
        float minutes = Clock / 60f;
        float interval = Mathf.Max(0.15f, 0.8f - minutes * 0.12f) / (1f + stageIdx * 0.03f);
        // the first nights are a gentler warm-up than the web's endless run
        if (stageIdx < 6) interval *= 1.45f - stageIdx * 0.075f;
        if (spawnT < interval || enemies.Count >= MaxEnemies) return;
        spawnT = 0f;
        float a = (float)rnd.NextDouble() * Mathf.PI * 2f;
        float d = 6.4f + (float)rnd.NextDouble() * 1.6f;
        var p = hero + new Vector2(Mathf.Cos(a), Mathf.Sin(a)) * d;
        p.x = Mathf.Clamp(p.x, -Field + 0.2f, Field - 0.2f);
        p.y = Mathf.Clamp(p.y, -Field + 0.2f, Field - 0.2f);
        double roll = rnd.NextDouble();
        float t = Clock;
        EKind kind = EKind.Bat;
        // the web's schedule, with each zone leaning on one kind
        float golemP = t > 120 ? (Zone == 4 ? 0.22f : 0.1f) : 0f;
        float ghostP = t > 60 ? (Zone == 3 ? 0.45f : 0.3f) : 0f;
        float skelP = t > 20 ? (Zone == 2 ? 0.7f : 0.5f) : (Zone == 2 ? 0.35f : 0f);
        if (roll < golemP) kind = EKind.Golem;
        else if (roll < ghostP) kind = EKind.Ghost;
        else if (roll < skelP) kind = EKind.Skeleton;
        if (Zone == 1 && rnd.NextDouble() < 0.5) kind = EKind.Bat;
        SpawnEnemy(kind, p);
    }

    void SpawnEnemy(EKind kind, Vector2 p)
    {
        var e = new Enemy { kind = kind, p = p };
        float hpMul = 1f + stageIdx * 0.035f;
        switch (kind)
        {
            case EKind.Bat: e.hp = 15; e.speed = 1.8f * (Zone == 1 || Zone == 5 ? 1.2f : 1f); e.dmg = 6; e.xp = 10; e.r = 0.2f; break;
            case EKind.Skeleton: e.hp = 30; e.speed = 1.6f; e.dmg = 8; e.xp = 20; e.r = 0.22f; break;
            case EKind.Ghost: e.hp = 45; e.speed = 1.4f; e.dmg = 10; e.xp = 30; e.r = 0.24f; break;
            case EKind.Golem: e.hp = 180; e.speed = 0.9f; e.dmg = 18; e.xp = 100; e.r = 0.36f; break;
            default: e.hp = 700 + stageIdx * 90; e.speed = 1.05f; e.dmg = 24; e.xp = 300; e.r = 0.8f; hpMul = 1f; break;
        }
        e.hp *= hpMul; e.maxHp = e.hp;
        var holder = new GameObject(kind.ToString()).transform;
        holder.SetParent(root, false);
        float size = kind == EKind.Lord ? 2.6f : kind == EKind.Golem ? 1.2f : 0.8f;
        var spr = OiyoArcade.Prim(PrimitiveType.Quad, "Sprite", kind == EKind.Bat ? batMat : kind == EKind.Skeleton ? skelMat : kind == EKind.Ghost ? ghostMat : kind == EKind.Golem ? golemMat : lordMat, holder);
        spr.transform.localScale = Vector3.one * size;
        spr.transform.localPosition = new Vector3(0f, size * 0.5f + (kind == EKind.Bat || kind == EKind.Ghost ? 0.35f : 0f), 0f);
        var sh = OiyoArcade.Prim(PrimitiveType.Quad, "Shadow", shadowMat, holder);
        sh.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
        sh.transform.localScale = Vector3.one * size * 0.8f;
        sh.transform.localPosition = new Vector3(0f, 0.02f, 0f);
        e.t = holder;
        enemies.Add(e);
    }

    void SpawnLord()
    {
        lordSpawned = true;
        float a = (float)rnd.NextDouble() * Mathf.PI * 2f;
        var p = hero + new Vector2(Mathf.Cos(a), Mathf.Sin(a)) * 7f;
        p.x = Mathf.Clamp(p.x, -Field + 1f, Field - 1f);
        p.y = Mathf.Clamp(p.y, -Field + 1f, Field - 1f);
        SpawnEnemy(EKind.Lord, p);
        lord = enemies[enemies.Count - 1];
        shake = 0.5f;
        synth.Tone(70f, 0.9f, Wave.Saw, 0.3f, 40f, 2f);
    }

    void Enemies(float dt)
    {
        int armor = lvl[(int)Up.Plate];
        foreach (var e in enemies)
        {
            var d = hero - e.p;
            float dist = d.magnitude;
            if (dist > 1e-4f) e.p += d / dist * e.speed * dt;
            e.flash = Mathf.Max(0f, e.flash - dt);
            if (dist < e.r + HeroR && inv <= 0f)
            {
                hp = Mathf.Max(0f, hp - Mathf.Max(1f, e.dmg - armor));
                inv = 0.6f; flashScreen = 0.3f; shake = 0.2f;
                synth.Tone(150f, 0.15f, Wave.Saw, 0.18f, 80f, 10f);
                if (hp <= 0f) { Lose(); return; }
            }
        }
    }

    Enemy Nearest(float within)
    {
        Enemy best = null; float bd = within * within;
        foreach (var e in enemies) { float d = (e.p - hero).sqrMagnitude; if (d < bd) { bd = d; best = e; } }
        return best;
    }

    void Weapons(float dt)
    {
        float mul = DmgMul;
        int w = lvl[(int)Up.Wand];
        if (w > 0 && (cool[0] -= dt) <= 0f)
        {
            cool[0] = Mathf.Max(0.4f, 1.2f - w * 0.15f);
            var target = Nearest(8f) ?? (enemies.Count > 0 ? enemies[0] : null);
            if (target != null)
            {
                int count = 1 + w / 2;
                float baseA = Mathf.Atan2(target.p.y - hero.y, target.p.x - hero.x);
                for (int i = 0; i < count; i++)
                {
                    float a = baseA + (i - (count - 1) * 0.5f) * 0.15f;
                    AddShot(new Vector2(Mathf.Cos(a), Mathf.Sin(a)) * 5.6f, Mathf.Round((14 + w * 5) * mul), 1, 0.12f, 2f, false);
                }
                synth.Tone(1400f, 0.04f, Wave.Triangle, 0.05f, 1800f, 30f);
            }
        }
        int k = lvl[(int)Up.Knives];
        if (k > 0 && (cool[1] -= dt) <= 0f)
        {
            cool[1] = Mathf.Max(0.3f, 0.9f - k * 0.1f);
            int count = 1 + k;
            for (int i = 0; i < count; i++)
            {
                float a = facing + (i - (count - 1) * 0.5f) * 0.1f;
                AddShot(new Vector2(Mathf.Cos(a), Mathf.Sin(a)) * 7.2f, Mathf.Round((10 + k * 4) * mul), 2 + k / 2, 0.1f, 1.5f, true);
            }
        }
        int c = lvl[(int)Up.Circle];
        if (c > 0 && (cool[2] -= dt) <= 0f)
        {
            cool[2] = 0.5f;
            float r = 1.2f + c * 0.3f;
            float dmg = Mathf.Round((4 + c * 3) * mul);
            for (int i = enemies.Count - 1; i >= 0; i--)
                if (i < enemies.Count && (enemies[i].p - hero).magnitude < r + enemies[i].r) Hurt(enemies[i], dmg, 0.3f);
        }
        int b = lvl[(int)Up.Tomes];
        if (b > 0)
        {
            tomeAngle = Mathf.Repeat(tomeAngle + dt * (2.5f + b * 0.3f), Mathf.PI * 2f);
            int books = 1 + b; float orbit = 1.5f + b * 0.16f; float dmg = Mathf.Round((8 + b * 4) * mul);
            for (int j = 0; j < books; j++)
            {
                float a = tomeAngle + j * Mathf.PI * 2f / books;
                var bp = hero + new Vector2(Mathf.Cos(a), Mathf.Sin(a)) * orbit;
                for (int i = enemies.Count - 1; i >= 0; i--)
                    if (i < enemies.Count && (enemies[i].p - bp).magnitude < 0.36f + enemies[i].r) Hurt(enemies[i], dmg, 0.5f);
            }
        }
        int th = lvl[(int)Up.Thunder];
        if (th > 0 && (cool[3] -= dt) <= 0f)
        {
            cool[3] = Mathf.Max(1f, 2.5f - th * 0.3f);
            int count = Mathf.Min(enemies.Count, 1 + th / 2);
            float dmg = Mathf.Round((30 + th * 15) * mul);
            for (int i = 0; i < count && enemies.Count > 0; i++)
            {
                var e = enemies[rnd.Next(enemies.Count)];
                var at = new Vector3(e.p.x, 0f, e.p.y);
                var bolt = OiyoArcade.GlowQuad("Bolt", new Color(1f, 1f, 0.6f, 0.95f), 1f, root);
                bolt.transform.position = at + Vector3.up * 3f;
                bolt.transform.localScale = new Vector3(0.35f, 6f, 1f);
                Destroy(bolt, 0.18f);
                bursts.Emit(at + Vector3.up * 0.3f, new Color(1f, 1f, 0.6f), 10, 3f, 0.15f, 0.3f);
                Hurt(e, dmg, 0f);
            }
            synth.Tone(90f, 0.25f, Wave.Noise, 0.16f, 0f, 8f);
        }
    }

    void AddShot(Vector2 v, float dmg, int pierce, float r, float life, bool knife)
    {
        var s = new Shot { p = hero, v = v, dmg = dmg, pierce = pierce, r = r, life = life, knife = knife };
        GameObject go;
        if (knife)
        {
            go = OiyoArcade.Prim(PrimitiveType.Cube, "Knife", knifeMat, root);
            go.transform.localScale = new Vector3(0.06f, 0.04f, 0.42f);
        }
        else
        {
            go = OiyoArcade.Prim(PrimitiveType.Quad, "Spark", wandMat, root);
            go.transform.localScale = Vector3.one * 0.5f;
        }
        s.t = go.transform;
        shots.Add(s);
    }

    void Shots(float dt)
    {
        for (int i = shots.Count - 1; i >= 0; i--)
        {
            var s = shots[i];
            s.life -= dt;
            s.p += s.v * dt;
            bool dead = s.life <= 0f || Mathf.Abs(s.p.x) > Field + 1f || Mathf.Abs(s.p.y) > Field + 1f;
            if (!dead)
                for (int j = enemies.Count - 1; j >= 0; j--)
                {
                    if (j >= enemies.Count) continue;
                    var e = enemies[j];
                    if ((e.p - s.p).magnitude < s.r + e.r + 0.1f)
                    {
                        Hurt(e, s.dmg, 0.2f);
                        if (--s.pierce <= 0) { dead = true; break; }
                    }
                }
            if (dead) { Destroy(s.t.gameObject); shots.RemoveAt(i); }
        }
    }

    void Hurt(Enemy e, float dmg, float knock)
    {
        e.hp -= dmg;
        e.flash = 0.1f;
        if (knock > 0f && e.kind != EKind.Lord)
        {
            var d = e.p - hero; float len = Mathf.Max(0.001f, d.magnitude);
            e.p += d / len * knock;
            e.p.x = Mathf.Clamp(e.p.x, -Field, Field); e.p.y = Mathf.Clamp(e.p.y, -Field, Field);
        }
        if (e.hp <= 0f) Kill(e);
    }

    void Kill(Enemy e)
    {
        if (!enemies.Remove(e)) return;
        kills++;
        Destroy(e.t.gameObject);
        bursts.Emit(new Vector3(e.p.x, 0.4f, e.p.y), e.kind == EKind.Ghost ? new Color(0.6f, 1f, 0.9f) : new Color(0.75f, 0.7f, 0.85f), e.kind == EKind.Lord ? 60 : 6, e.kind == EKind.Lord ? 5f : 2f, 0.15f, 0.4f);
        if (e.kind == EKind.Lord) { lordDown = true; shake = 0.6f; return; }
        var g = new Gem { p = e.p, value = e.xp };
        var q = OiyoArcade.Prim(PrimitiveType.Quad, "Gem", e.xp >= 100 ? gemRed : e.xp >= 25 ? gemGreen : gemBlue, root);
        q.transform.localScale = Vector3.one * (e.xp >= 100 ? 0.5f : 0.34f);
        g.t = q.transform;
        gems.Add(g);
        if (kills % 4 == 0) synth.Tone(240f, 0.04f, Wave.Noise, 0.05f, 0f, 30f);
    }

    void Gems(float dt)
    {
        float mr = Magnet * (1f + lvl[(int)Up.Lodestone] * 0.3f);
        for (int i = gems.Count - 1; i >= 0; i--)
        {
            var g = gems[i];
            var d = hero - g.p; float dist = d.magnitude;
            if (dist < 0.36f)
            {
                Destroy(g.t.gameObject); gems.RemoveAt(i);
                xp += g.value;
                synth.Tone(1600f + (xp % 7) * 60f, 0.04f, Wave.Sine, 0.06f, 0f, 30f);
                if (xp >= nextXp) { LevelUp(); return; }
            }
            else if (dist < mr) g.p += d / dist * (5.2f + (mr - dist) * 2f) * dt;
        }
    }

    void LevelUp()
    {
        xp -= nextXp; level++;
        nextXp = level * 50 + 20;
        offer.Clear();
        var pool = new List<int>();
        for (int i = 0; i < lvl.Length; i++) if (lvl[i] < 5) pool.Add(i);
        for (int i = 0; i < 3 && pool.Count > 0; i++) { int k = rnd.Next(pool.Count); offer.Add(pool[k]); pool.RemoveAt(k); }
        if (offer.Count == 0) return;
        state = GameState.LevelUp;
        StartCoroutine(Arp(new[] { 660f, 880f, 1100f }, 0.06f));
    }

    void Pick(int i)
    {
        if (state != GameState.LevelUp || i < 0 || i >= offer.Count) return;
        int u = offer[i];
        lvl[u]++;
        if (u == (int)Up.Heart) { maxHp += 20f; hp = Mathf.Min(maxHp, hp + 20f); }
        offer.Clear();
        state = GameState.Playing;
        bursts.Emit(new Vector3(hero.x, 0.8f, hero.y), UpColor[u], 20, 3f, 0.2f, 0.5f, Vector3.up);
    }

    int RunScore => kills * 10 + Mathf.FloorToInt(time) * 5 + level * 50;

    void Win()
    {
        stars = 1 + (hp >= maxHp * 0.3f ? 1 : 0) + (hp >= maxHp * 0.6f ? 1 : 0);
        score = RunScore + stars * 100 + stageIdx * 10;
        state = GameState.Victory;
        OiyoArcade.Record(Slug, stageIdx, stars, score, StageCount);
        bursts.Emit(new Vector3(hero.x, 1f, hero.y), new Color(1f, 0.9f, 0.6f), 60, 5f, 0.25f, 1f, Vector3.up * 2f);
        StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
    }

    void Lose()
    {
        endReason = U("The horde caught you.");
        score = RunScore;
        state = GameState.GameOver;
        shake = 0.4f;
        synth.Tone(180f, 0.7f, Wave.Saw, 0.22f, 50f, 3f);
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.18f, Wave.Triangle, 0.25f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    // ---------------- View ----------------
    void Sync(float dt)
    {
        if (heroT == null) return;
        heroT.position = new Vector3(hero.x, 0f, hero.y);
        heroBody.rotation = Quaternion.Euler(0f, 90f - facing * Mathf.Rad2Deg, 0f);
        bool moving = moveDir.sqrMagnitude > 0.01f && state == GameState.Playing;
        heroBody.localPosition = new Vector3(0f, moving ? Mathf.Abs(Mathf.Sin(Time.time * 12f)) * 0.08f : 0f, 0f);
        heroBody.gameObject.SetActive(!(inv > 0f && Mathf.Repeat(Time.time * 18f, 1f) < 0.4f && state == GameState.Playing));
        int c = lvl[(int)Up.Circle];
        ring.gameObject.SetActive(c > 0);
        if (c > 0) ring.localScale = Vector3.one * (1.2f + c * 0.3f) * 2f * (1f + Mathf.Sin(Time.time * 4f) * 0.03f);
        int b = lvl[(int)Up.Tomes];
        for (int j = 0; j < tomes.Count; j++)
        {
            bool on = j < 1 + b && b > 0;
            tomes[j].gameObject.SetActive(on);
            if (!on) continue;
            int books = 1 + b; float orbit = 1.5f + b * 0.16f;
            float a = tomeAngle + j * Mathf.PI * 2f / books;
            tomes[j].position = new Vector3(hero.x + Mathf.Cos(a) * orbit, 0.6f, hero.y + Mathf.Sin(a) * orbit);
            tomes[j].rotation = Quaternion.Euler(0f, -a * Mathf.Rad2Deg, 0f);
        }
        var face = cam.transform.rotation;
        foreach (var e in enemies)
        {
            e.t.position = new Vector3(e.p.x, (e.kind == EKind.Bat ? Mathf.Sin(Time.time * 9f + e.p.x) * 0.12f : 0f), e.p.y);
            var spr = e.t.GetChild(0);
            spr.rotation = face;
            float s = e.flash > 0f ? 1.15f : 1f;
            float baseSize = e.kind == EKind.Lord ? 2.6f : e.kind == EKind.Golem ? 1.2f : 0.8f;
            spr.localScale = new Vector3((e.p.x < hero.x ? 1f : -1f) * baseSize * s, baseSize * s, 1f);
        }
        foreach (var g in gems) { g.t.position = new Vector3(g.p.x, 0.25f + Mathf.Sin(Time.time * 4f + g.p.x) * 0.05f, g.p.y); g.t.rotation = face; }
        foreach (var s in shots)
        {
            s.t.position = new Vector3(s.p.x, 0.5f, s.p.y);
            if (s.knife) s.t.rotation = Quaternion.LookRotation(new Vector3(s.v.x, 0f, s.v.y));
            else s.t.rotation = face;
        }
        flashScreen = Mathf.MoveTowards(flashScreen, 0f, dt);
    }

    void UpdateCamera(float dt, bool snap)
    {
        bool portrait = cam.aspect < 1f;
        // high and tilted so an upright phone still sees the ring where the horde spawns
        float height = portrait ? 15f : 11f, back = portrait ? 7.5f : 7f;
        var target = new Vector3(hero.x, height, hero.y - back);
        var p = snap ? target : Vector3.Lerp(cam.transform.position, target, 1f - Mathf.Exp(-dt * 8f));
        if (shake > 0f) { p += Random.insideUnitSphere * shake * 0.3f; shake = Mathf.MoveTowards(shake, 0f, dt); }
        cam.transform.position = p;
        cam.transform.rotation = Quaternion.LookRotation(new Vector3(p.x, 0f, p.z + back) - p);
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.55f, 0.35f, 0.9f, 0.97f);
    static readonly Color Dark = new Color(0.04f, 0.03f, 0.08f, 0.84f);
    static readonly Color Gold = new Color(1f, 0.8f, 0.25f, 0.97f);
    static readonly Color Slate = new Color(0.18f, 0.17f, 0.3f, 0.95f);

    string StageTitle(int i) => F("Night {0}", i + 1) + " · " + U(ZoneNames[i / 5]);
    static string Mmss(float s) => $"{Mathf.FloorToInt(s / 60f)}:{Mathf.FloorToInt(s % 60f):00}";

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (flashScreen > 0f && state == GameState.Playing) OiyoArcade.Fill(new Rect(0f, 0f, w, h), new Color(0.8f, 0f, 0.1f, flashScreen * 0.5f));
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        var bar = new Rect(8f, 8f, w - 16f, 76f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 140f, 24f), "<b>" + StageTitle(stageIdx) + "</b>", 16, new Color(0.85f, 0.8f, 1f));
        float left = Mathf.Max(0f, nightLen - time);
        string clock = LordNight && lordSpawned ? "<color=#ff8a80>" + U("The Horde Lord is here!") + "</color>" : $"{U("Dawn in")} <b>{Mmss(left)}</b>";
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 22f), $"{clock}   {U("Kills")} <b>{kills}</b>   Lv <b>{level}</b>", 14, Color.white);
        OiyoArcade.Bar(new Rect(20f, 60f, w - 96f, 6f), xp / (float)nextXp, new Color(0f, 0f, 0f, 0.5f), new Color(0.45f, 0.75f, 1f));
        OiyoArcade.Bar(new Rect(20f, 70f, w - 96f, 7f), hp / maxHp, new Color(0f, 0f, 0f, 0.5f), hp > maxHp * 0.3f ? new Color(0.4f, 1f, 0.55f) : new Color(1f, 0.45f, 0.35f));
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (lord != null && !lordDown && state == GameState.Playing)
        {
            OiyoArcade.Text(new Rect(16f, 88f, w - 32f, 18f), U("Horde Lord"), 12, new Color(1f, 0.6f, 0.6f), TextAnchor.UpperCenter);
            OiyoArcade.Bar(new Rect(40f, 106f, w - 80f, 8f), lord.hp / lord.maxHp, new Color(0f, 0f, 0f, 0.5f), new Color(1f, 0.3f, 0.35f));
        }
        // the floating stick under the finger
        if (stickId != int.MinValue && state == GameState.Playing)
        {
            var c0 = OiyoArcade.ToGui(stickStart); var c1 = OiyoArcade.ToGui(stickNow);
            var d = c1 - c0; if (d.magnitude > 40f) d = d.normalized * 40f;
            OiyoArcade.Panel(new Rect(c0.x - 44f, c0.y - 44f, 88f, 88f), new Color(1f, 1f, 1f, 0.12f));
            OiyoArcade.Panel(new Rect(c0.x + d.x - 20f, c0.y + d.y - 20f, 40f, 40f), new Color(1f, 1f, 1f, 0.35f));
        }
        if (state == GameState.Ready)
        {
            var r = new Rect(w * 0.5f - 175f, h * 0.5f + 40f, 350f, 112f);
            OiyoArcade.Panel(r, Dark);
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 8f, r.width - 24f, r.height - 16f),
                $"<b>{(LordNight ? U("Survive until dawn, then bring down the Horde Lord") : U("Survive until dawn"))}</b>\n<size=14>{U("Drag anywhere to move; your weapons fire on their own. Keys: arrows or WASD.")}</size>", 16, Color.white, TextAnchor.MiddleCenter);
        }
        if (state == GameState.LevelUp) DrawLevelUp(w, h);
        if (state == GameState.Paused) DrawPause(w, h);
        if (state == GameState.Victory || state == GameState.GameOver) DrawResult(w, h);
    }

    void DrawLevelUp(float w, float h)
    {
        float cw = Mathf.Min(380f, w - 20f);
        float ch = 70f + offer.Count * 92f;
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - ch * 0.5f, cw, ch);
        OiyoArcade.Panel(card, new Color(0.05f, 0.04f, 0.12f, 0.95f));
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 12f, cw, 36f), F("Level {0}! Pick one", level), 22, Gold, TextAnchor.MiddleCenter);
        for (int i = 0; i < offer.Count; i++)
        {
            int u = offer[i];
            var r = new Rect(card.x + 14f, card.y + 58f + i * 92f, cw - 28f, 84f);
            string label = $"<b><color=#{ColorUtility.ToHtmlStringRGB(UpColor[u])}>{U(UpName[u])}</color></b>  <size=13>Lv {lvl[u] + 1}</size>\n<size=13>{U(UpDesc[u])}</size>";
            if (OiyoArcade.Button(r, label, new Color(0.16f, 0.15f, 0.28f, 0.97f), 16)) Pick(i);
        }
    }

    void DrawMenu(float w, float h)
    {
        if (showStages)
        {
            float bw = Mathf.Min(w - 16f, 760f);
            var box = new Rect(w * 0.5f - bw * 0.5f, 12f, bw, h - 24f);
            OiyoArcade.Panel(box, new Color(0.04f, 0.03f, 0.08f, 0.94f));
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
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("Night Horde 3D"), 30, new Color(0.85f, 0.8f, 1f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 62f, cw - 40f, 46f), U("Hold out against the horde until dawn. Collect gems, level up and build your arsenal."), 15, new Color(1f, 1f, 1f, 0.85f), TextAnchor.MiddleCenter);
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
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 14f, cw, 38f), won ? U("Dawn breaks!") : U("Game over"), 28, won ? new Color(0.6f, 1f, 0.65f) : new Color(1f, 0.55f, 0.5f), TextAnchor.MiddleCenter);
        string detail = won ? $"<size=30>{OiyoArcade.StarString(stars)}</size>" : endReason;
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 56f, cw - 32f, 44f), detail, 16, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 100f, cw - 32f, 48f),
            $"{U("Score")} <b>{score}</b>   {U("Kills")} <b>{kills}</b>\n<size=14>{U("Time")} {Mmss(time)} · Lv {level}</size>", 16, Color.white, TextAnchor.MiddleCenter);
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
