using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Iron Tempest 3D: the web Iron Tempest run-and-gun (src/components/games/IronTempest.tsx,
// src/lib/games/iron-tempest.ts) rebuilt as 30 Unity missions. The simulation keeps the web's
// pixel space and numbers (ground at 430 px, 40 px = 1 world unit): run at 240 px/s (120 when
// crouched), jump at 430 px/s under 980 px/s2 gravity, a rifle / heavy machine gun / rocket
// launcher with the web's damage, rate, ammo and shot speed, eight grenades, a heavy gun drop on
// every 7th kill and a rocket launcher on every 14th, shield troopers that take 45% damage,
// rocket blasts that fall off with distance (90 within 115 px, 120 to structures within 170 px),
// destructible bunkers worth 600, the assault buggy (+40 health, half damage taken, its gun hits
// 1.5x), and the War Train
// whose fall ends the mission (score by the web's missionScore). Mission 1 is the web's front;
// later missions run longer with denser squads, more bunkers and a tougher train across six zones.
// Changes: the web's soldiers backed away and fired away from the player, here they close to
// 260 px and shoot at you; crouching ducks under chest-high bullets; the train alternates gun
// bursts with lobbed shells; a +25 health kit drops on every 5th kill that drops no weapon.
// Stars: cleared; half health left; under the par time.
public class IronTempestPlayer : MonoBehaviour
{
    const string Slug = "iron-tempest";
    const int StageCount = 30;
    const float GROUND = 430f, PX = 40f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    enum Wpn { Rifle, Heavy, Rocket }
    static readonly float[] WDamage = { 12f, 9f, 90f }, WCool = { 0.13f, 0.055f, 0.72f }, WSpeed = { 760f, 900f, 470f };
    static readonly int[] WAmmo = { -1, 180, 12 };
    enum EK { Rifleman, Rocketeer, Shield, Boss }
    class Enemy { public EK kind; public float x, y, vx, hp, max, dead, fire; public int alt; public Transform t; }
    class Shot { public float x, y, vx, vy, life; public bool enemy, rocket; public Transform t; }
    class Bunker { public float x, y, w, h, hp, max; public bool down; public Transform t; public Renderer r; }
    class Pickup { public float x, y, life; public Wpn kind; public bool med; public Transform t; }

    // i18n
    static readonly string[] Zones = { "Ashen Front", "Pine Ridge", "Frost Pass", "Ruined City", "Night Rail", "Ember Works" };
    static readonly Color[] ZoneSky = { new Color(0.95f, 0.64f, 0.3f), new Color(0.55f, 0.75f, 0.8f), new Color(0.75f, 0.85f, 0.95f), new Color(0.6f, 0.58f, 0.62f), new Color(0.1f, 0.12f, 0.22f), new Color(0.45f, 0.15f, 0.1f) };
    static readonly Color[] ZoneHill = { new Color(0.78f, 0.37f, 0.22f), new Color(0.2f, 0.38f, 0.28f), new Color(0.85f, 0.9f, 0.96f), new Color(0.35f, 0.34f, 0.4f), new Color(0.16f, 0.18f, 0.3f), new Color(0.3f, 0.08f, 0.06f) };
    static readonly Color[] ZoneGround = { new Color(0.55f, 0.4f, 0.26f), new Color(0.32f, 0.42f, 0.22f), new Color(0.88f, 0.92f, 0.96f), new Color(0.38f, 0.38f, 0.4f), new Color(0.22f, 0.22f, 0.26f), new Color(0.3f, 0.18f, 0.14f) };

    int stageIdx;
    readonly List<Enemy> enemies = new List<Enemy>();
    readonly List<Shot> shots = new List<Shot>();
    readonly List<Bunker> bunkers = new List<Bunker>();
    readonly List<Pickup> pickups = new List<Pickup>();
    float px, py, pvx, pvy, hp, shotCool, inv, time, levelEnd, bossTrigger, bossX, bossMax, buggyX;
    Wpn weapon; int ammo, grenades, kills, score, starsWon, structuresDown;
    bool duck, vehicle, bossSpawned, faceLeft;
    Enemy boss;
    float camX, shake, flash, msgT;
    string msg = "";
    System.Random rnd;

    Camera cam;
    Transform root, playerT, playerBody, gunT, buggyT;
    Material riflemanMat, rocketMat, shieldMat, skinMat, helmMat, shotMat, enemyShotMat, rocketShotMat;
    Bursts bursts;
    Synth synth;
    bool showStages;

    int Zone => stageIdx / 5;
    bool BigTrain => stageIdx == 0 || stageIdx % 5 == 4;
    float Par => 100f + stageIdx * 4f;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 40f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.farClipPlane = 200f;
        var sun = new GameObject("Sun").AddComponent<Light>();
        sun.type = LightType.Directional;
        sun.intensity = 1.05f;
        sun.transform.rotation = Quaternion.Euler(40f, -30f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        bursts = new Bursts(transform, 0.9f);
        synth = new Synth(gameObject);
        riflemanMat = OiyoArcade.Lit(new Color(0.42f, 0.46f, 0.32f), 0.2f);
        rocketMat = OiyoArcade.Lit(new Color(0.5f, 0.34f, 0.25f), 0.2f);
        shieldMat = OiyoArcade.Lit(new Color(0.3f, 0.34f, 0.42f), 0.4f, null, 0.4f);
        skinMat = OiyoArcade.Lit(new Color(0.92f, 0.74f, 0.58f), 0.2f);
        helmMat = OiyoArcade.Lit(new Color(0.22f, 0.24f, 0.2f), 0.5f, null, 0.3f);
        shotMat = OiyoArcade.Glow(new Color(1f, 0.95f, 0.6f));
        enemyShotMat = OiyoArcade.Glow(new Color(1f, 0.35f, 0.25f));
        rocketShotMat = OiyoArcade.Lit(new Color(0.85f, 0.3f, 0.15f), 0.5f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        LoadStage(stageIdx, false);
    }

    static Vector3 W(float x, float y, float z = 0f) => new Vector3(x / PX, (GROUND - y) / PX, z);

    // ---------------- Mission ----------------
    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Front").transform;
        enemies.Clear(); shots.Clear(); bunkers.Clear(); pickups.Clear();
        rnd = new System.Random(4100 + stageIdx * 53);
        levelEnd = 3100f + stageIdx * 110f;
        bossTrigger = levelEnd - 950f;
        bossX = levelEnd - 400f;
        bossMax = stageIdx == 0 ? 1800f : BigTrain ? 1800f + stageIdx * 70f : 1100f + stageIdx * 45f;
        buggyX = stageIdx == 0 ? 1560f : 1400f + (stageIdx % 3) * 260f;
        px = 100f; py = GROUND - 46f; pvx = pvy = 0f; hp = 100f; shotCool = 0f; inv = 0f; time = 0f;
        weapon = Wpn.Rifle; ammo = -1; grenades = 8; kills = 0; score = 0; starsWon = 0; structuresDown = 0;
        duck = vehicle = bossSpawned = faceLeft = false; boss = null;
        camX = 0f; shake = 0f; flash = 0f; msg = U("GO!"); msgT = 2f;
        showStages = false;
        // bunkers: the web's three, then more as missions go on
        if (stageIdx == 0)
        {
            AddBunker(650, 130, 100, 180); AddBunker(1220, 90, 150, 240); AddBunker(1810, 160, 120, 220);
        }
        else
        {
            for (float x = 600f; x < bossTrigger - 100f; x += 560f - Mathf.Min(stageIdx, 20) * 8f)
            {
                if (Mathf.Abs(x - buggyX) < 180f) continue;
                int k = rnd.Next(3);
                float h = k == 0 ? 130f : k == 1 ? 90f : 160f, w = k == 0 ? 100f : k == 1 ? 150f : 120f;
                AddBunker(x + rnd.Next(80), h, w, (k == 1 ? 240f : 200f) * (1f + stageIdx * 0.02f));
            }
        }
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Sync(0f);
        UpdateCamera(1f, true);
    }

    void AddBunker(float x, float h, float w, float hpMax) => bunkers.Add(new Bunker { x = x, y = GROUND - h, w = w, h = h, hp = hpMax, max = hpMax });

    void BuildScene()
    {
        var sky = ZoneSky[Zone];
        cam.backgroundColor = sky;
        RenderSettings.ambientLight = Zone == 4 ? new Color(0.35f, 0.38f, 0.5f) : new Color(0.55f, 0.52f, 0.5f);
        RenderSettings.fog = true; RenderSettings.fogMode = FogMode.Linear; RenderSettings.fogColor = sky;
        RenderSettings.fogStartDistance = 30f; RenderSettings.fogEndDistance = 90f;
        float len = levelEnd / PX + 30f;
        var groundMat = OiyoArcade.Lit(ZoneGround[Zone], 0.1f, OiyoArcade.Art("IT/ground", true));
        groundMat.mainTextureScale = new Vector2(len / 4f, 1f);
        var ground = OiyoArcade.Prim(PrimitiveType.Cube, "Ground", groundMat, root);
        ground.transform.position = new Vector3(len * 0.5f - 15f, -2f, 1.5f);
        ground.transform.localScale = new Vector3(len, 4f, 7f);
        // distant ridges for parallax
        var hillMat = OiyoArcade.Lit(ZoneHill[Zone], 0.05f);
        for (float x = -20f; x < len; x += 9f)
        {
            var hill = OiyoArcade.Prim(PrimitiveType.Cube, "Ridge", hillMat, root);
            float h = 6f + (float)rnd.NextDouble() * 9f;
            hill.transform.position = new Vector3(x, -1f, 26f + (float)rnd.NextDouble() * 6f);
            hill.transform.rotation = Quaternion.Euler(0f, 0f, 45f);
            hill.transform.localScale = new Vector3(h, h, 2f);
        }
        // props along the road
        var propMat = OiyoArcade.Lit(Zone == 1 ? new Color(0.15f, 0.35f, 0.18f) : Zone == 2 ? new Color(0.9f, 0.95f, 1f) : new Color(0.32f, 0.28f, 0.24f), 0.1f);
        for (float x = 2f; x < len - 10f; x += 3.5f + (float)rnd.NextDouble() * 4f)
        {
            var prop = OiyoArcade.Prim(Zone == 1 || Zone == 2 ? PrimitiveType.Cylinder : PrimitiveType.Cube, "Prop", propMat, root);
            float h = 0.8f + (float)rnd.NextDouble() * 2.2f;
            prop.transform.position = new Vector3(x, h * 0.5f, 4f + (float)rnd.NextDouble() * 3f);
            prop.transform.localScale = new Vector3(0.6f + (float)rnd.NextDouble(), Zone == 1 || Zone == 2 ? h * 0.5f : h, 0.6f);
        }
        // bunkers
        var concrete = OiyoArcade.Art("IT/bunker", true);
        foreach (var b in bunkers)
        {
            var go = OiyoArcade.Prim(PrimitiveType.Cube, "Bunker", OiyoArcade.Lit(new Color(0.75f, 0.68f, 0.55f), 0.1f, concrete), root);
            go.transform.position = W(b.x + b.w * 0.5f, b.y + b.h * 0.5f, 0.9f);
            go.transform.localScale = new Vector3(b.w / PX, b.h / PX, 1.4f);
            b.t = go.transform; b.r = go.GetComponent<Renderer>();
            var slit = OiyoArcade.Prim(PrimitiveType.Cube, "Slit", OiyoArcade.Glow(new Color(0.08f, 0.06f, 0.05f)), go.transform);
            slit.transform.localPosition = new Vector3(0f, 0.25f, -0.51f);
            slit.transform.localScale = new Vector3(0.6f, 0.08f, 0.02f);
        }
        // the assault buggy parked on the road
        buggyT = new GameObject("Buggy").transform; buggyT.SetParent(root, false);
        var olive = OiyoArcade.Lit(new Color(0.36f, 0.4f, 0.22f), 0.3f);
        var chassis = OiyoArcade.Prim(PrimitiveType.Cube, "Chassis", olive, buggyT);
        chassis.transform.localPosition = new Vector3(0f, 0.55f, 0f); chassis.transform.localScale = new Vector3(1.9f, 0.5f, 1f);
        var cab = OiyoArcade.Prim(PrimitiveType.Cube, "Roll", OiyoArcade.Lit(new Color(0.2f, 0.2f, 0.2f), 0.4f), buggyT);
        cab.transform.localPosition = new Vector3(-0.2f, 1f, 0f); cab.transform.localScale = new Vector3(0.9f, 0.45f, 0.9f);
        var gun = OiyoArcade.Prim(PrimitiveType.Cylinder, "Gun", helmMat, buggyT);
        gun.transform.localPosition = new Vector3(0.7f, 1.1f, 0f); gun.transform.localRotation = Quaternion.Euler(0f, 0f, 90f); gun.transform.localScale = new Vector3(0.12f, 0.45f, 0.12f);
        foreach (var wx in new[] { -0.65f, 0.65f })
        {
            var wheel = OiyoArcade.Prim(PrimitiveType.Cylinder, "Wheel", OiyoArcade.Lit(new Color(0.1f, 0.1f, 0.1f), 0.2f), buggyT);
            wheel.transform.localPosition = new Vector3(wx, 0.32f, 0f); wheel.transform.localRotation = Quaternion.Euler(90f, 0f, 0f); wheel.transform.localScale = new Vector3(0.62f, 0.55f, 0.62f);
        }
        // finish flag past the train
        var pole = OiyoArcade.Prim(PrimitiveType.Cylinder, "Pole", helmMat, root);
        pole.transform.position = W(levelEnd - 60f, GROUND - 120f, 1f); pole.transform.localScale = new Vector3(0.1f, 1.5f, 0.1f);
        // player soldier
        playerT = new GameObject("Player").transform; playerT.SetParent(root, false);
        playerBody = new GameObject("Body").transform; playerBody.SetParent(playerT, false);
        var red = OiyoArcade.Lit(new Color(0.7f, 0.25f, 0.14f), 0.3f);
        var torso = OiyoArcade.Prim(PrimitiveType.Cube, "Torso", red, playerBody);
        torso.transform.localPosition = new Vector3(0f, 0.72f, 0f); torso.transform.localScale = new Vector3(0.45f, 0.5f, 0.35f);
        var legs = OiyoArcade.Prim(PrimitiveType.Cube, "Legs", OiyoArcade.Lit(new Color(0.3f, 0.3f, 0.22f), 0.2f), playerBody);
        legs.transform.localPosition = new Vector3(0f, 0.25f, 0f); legs.transform.localScale = new Vector3(0.38f, 0.5f, 0.3f);
        var head = OiyoArcade.Prim(PrimitiveType.Sphere, "Head", skinMat, playerBody);
        head.transform.localPosition = new Vector3(0.02f, 1.12f, 0f); head.transform.localScale = Vector3.one * 0.32f;
        var band = OiyoArcade.Prim(PrimitiveType.Cube, "Bandana", OiyoArcade.Lit(new Color(0.95f, 0.75f, 0.15f), 0.3f), playerBody);
        band.transform.localPosition = new Vector3(0.02f, 1.2f, 0f); band.transform.localScale = new Vector3(0.34f, 0.08f, 0.34f);
        gunT = OiyoArcade.Prim(PrimitiveType.Cube, "Gun", OiyoArcade.Lit(new Color(0.15f, 0.15f, 0.16f), 0.6f, null, 0.5f), playerBody).transform;
        gunT.localPosition = new Vector3(0.38f, 0.78f, -0.22f); gunT.localScale = new Vector3(0.62f, 0.12f, 0.1f);
    }

    // ---------------- Input ----------------
    bool hLeft, hRight, hJump, hFire, hDuck, tBomb, tVehicle;

    Rect PadLeft, PadRight, PadDuck, BtnFire, BtnJump, BtnBomb, BtnCar;
    void Layout(float w, float h)
    {
        float s = Mathf.Clamp(Mathf.Min(w, h) * 0.17f, 58f, 84f);
        // run pads sit above the page's full-window exit button in the bottom-left corner
        float by = h - s - 92f;
        PadLeft = new Rect(14f, by, s, s);
        PadRight = new Rect(14f + s + 10f, by, s, s);
        PadDuck = new Rect(14f + (s + 10f) * 0.5f, by + s + 8f, s, s * 0.6f);
        BtnFire = new Rect(w - s * 1.25f - 14f, h - s * 1.25f - 20f, s * 1.25f, s * 1.25f);
        BtnJump = new Rect(BtnFire.x - s - 12f, h - s - 22f, s, s);
        BtnBomb = new Rect(BtnFire.x + s * 0.25f, BtnFire.y - s * 0.8f - 12f, s, s * 0.8f);
        BtnCar = new Rect(BtnJump.x, BtnJump.y - s * 0.8f - 12f, s, s * 0.8f);
    }

    bool HeldIn(Rect r)
    {
        foreach (var p in OiyoArcade.Held()) if (r.Contains(OiyoArcade.ToGui(p.pos))) return true;
        return false;
    }
    bool TappedIn(Rect r)
    {
        foreach (var p in OiyoArcade.Began()) if (r.Contains(OiyoArcade.ToGui(p.pos))) return true;
        return false;
    }

    bool NearBuggy => !vehicle && Mathf.Abs(px - buggyX) < 130f;

    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; return; }
                    Layout(OiyoArcade.W, OiyoArcade.H);
                    hLeft = Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow) || HeldIn(PadLeft);
                    hRight = Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow) || HeldIn(PadRight);
                    hDuck = Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow) || HeldIn(PadDuck);
                    hJump = Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.Space) || HeldIn(BtnJump);
                    hFire = Input.GetKey(KeyCode.J) || Input.GetKey(KeyCode.F) || HeldIn(BtnFire);
                    tBomb |= Input.GetKeyDown(KeyCode.K) || Input.GetKeyDown(KeyCode.G) || TappedIn(BtnBomb);
                    tVehicle |= Input.GetKeyDown(KeyCode.E) || (NearBuggy && TappedIn(BtnCar));
                    if (state == GameState.Ready && (OiyoArcade.Began().Count > 0 || Input.anyKeyDown || hLeft || hRight || hFire)) state = GameState.Playing;
                    return;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
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

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("iron-tempest", state, score);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            int n = Mathf.CeilToInt(dt / (1f / 60f));
            for (int i = 0; i < n && state == GameState.Playing; i++) Step(dt / n);
            tBomb = tVehicle = false;
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Sync(dt);
        UpdateCamera(dt, false);
    }

    void Step(float dt)
    {
        time += dt;
        shotCool = Mathf.Max(0f, shotCool - dt);
        inv = Mathf.Max(0f, inv - dt);
        float mv = (hRight ? 1f : 0f) - (hLeft ? 1f : 0f);
        if (mv != 0f) faceLeft = mv < 0f;
        bool grounded = py >= GROUND - 47f;
        duck = hDuck && grounded && !vehicle;
        float run = vehicle ? 320f : duck ? 120f : 240f;
        pvx += (mv * run - pvx) * Mathf.Min(1f, dt * 10f);
        if (hJump && grounded) { pvy = -430f; synth.Tone(520f, 0.08f, Wave.Square, 0.08f, 820f, 18f); }
        pvy += 980f * dt;
        px = Mathf.Clamp(px + pvx * dt, 25f, levelEnd);
        py = Mathf.Min(GROUND - 46f, py + pvy * dt);
        if (py >= GROUND - 46f) pvy = 0f;
        if (hFire) Shoot();
        if (tBomb) { tBomb = false; Grenade(); }
        if (tVehicle)
        {
            tVehicle = false;
            if (NearBuggy)
            {
                vehicle = true; hp = Mathf.Min(160f, hp + 40f);
                Toast(U("ASSAULT BUGGY")); synth.Tone(110f, 0.4f, Wave.Saw, 0.16f, 220f, 4f);
            }
            else if (vehicle) { vehicle = false; buggyX = px; }
        }
        if (vehicle) buggyX = px;
        // squads come in as you push forward (the web's pace, denser on later missions)
        float spacing = Mathf.Max(110f, 170f - stageIdx * 2f);
        int target = Mathf.FloorToInt(px / spacing) + 3;
        int alive = 0; foreach (var e in enemies) if (e.kind != EK.Boss) alive++;
        while (alive + kills < target && px < bossTrigger - 50f)
        {
            double r = rnd.NextDouble();
            float rocketP = 0.22f + Mathf.Min(0.1f, stageIdx * 0.006f), shieldP = 0.18f + Mathf.Min(0.1f, stageIdx * 0.005f);
            EK k = r < rocketP ? EK.Rocketeer : rnd.NextDouble() < shieldP ? EK.Shield : EK.Rifleman;
            Spawn(px + 600f + (float)rnd.NextDouble() * 240f, k);
            alive++;
        }
        if (px > bossTrigger && !bossSpawned)
        {
            bossSpawned = true;
            Spawn(bossX, EK.Boss);
            boss = enemies[enemies.Count - 1];
            Toast(U("WAR TRAIN")); shake = 14f;
            StartCoroutine(Arp(new[] { 220f, 180f, 220f, 180f }, 0.15f, Wave.Square));
        }
        Enemies(dt);
        Shots(dt);
        foreach (var b in bunkers)
            if (!b.down && b.hp <= 0f)
            {
                b.down = true; structuresDown++; score += 600;
                Burst(b.x + b.w * 0.5f, b.y + b.h * 0.5f, new Color(0.75f, 0.55f, 0.35f), 34);
            }
        for (int i = pickups.Count - 1; i >= 0; i--)
        {
            var p = pickups[i];
            p.life -= dt;
            if (Mathf.Abs(p.x - px) < 45f && py > GROUND - 120f)
            {
                p.life = 0f;
                if (p.med) { hp = Mathf.Min(vehicle ? 160f : 100f, hp + 25f); Toast(U("+25 HEALTH")); }
                else
                {
                    weapon = p.kind; ammo = WAmmo[(int)p.kind];
                    Toast(p.kind == Wpn.Heavy ? U("HEAVY MACHINE GUN!") : U("ROCKET LAUNCHER!"));
                }
                StartCoroutine(Arp(new[] { 660f, 990f }, 0.06f, Wave.Triangle));
            }
            if (p.life <= 0f) { Destroy(p.t.gameObject); pickups.RemoveAt(i); }
        }
        if (hp <= 0f) { Lose(); return; }
        if (bossSpawned && boss != null && boss.hp <= 0f) Win();
    }

    void Spawn(float x, EK kind)
    {
        float hpv = kind == EK.Rifleman ? 36f : kind == EK.Rocketeer ? 55f : kind == EK.Shield ? 110f : bossMax;
        if (kind != EK.Boss) hpv *= 1f + stageIdx * 0.025f;
        var e = new Enemy { kind = kind, x = x, y = GROUND - (kind == EK.Boss ? 150f : 42f), hp = hpv, max = hpv, fire = (float)rnd.NextDouble() };
        e.t = new GameObject(kind.ToString()).transform; e.t.SetParent(root, false);
        if (kind == EK.Boss) BuildTrain(e.t); else BuildSoldier(e.t, kind);
        enemies.Add(e);
    }

    void BuildSoldier(Transform t, EK kind)
    {
        var body = new GameObject("Body").transform; body.SetParent(t, false);
        var m = kind == EK.Rocketeer ? rocketMat : kind == EK.Shield ? shieldMat : riflemanMat;
        var torso = OiyoArcade.Prim(PrimitiveType.Cube, "Torso", m, body);
        torso.transform.localPosition = new Vector3(0f, 0.68f, 0f); torso.transform.localScale = new Vector3(0.42f, 0.48f, 0.32f);
        var legs = OiyoArcade.Prim(PrimitiveType.Cube, "Legs", helmMat, body);
        legs.transform.localPosition = new Vector3(0f, 0.24f, 0f); legs.transform.localScale = new Vector3(0.36f, 0.48f, 0.28f);
        var head = OiyoArcade.Prim(PrimitiveType.Sphere, "Head", skinMat, body);
        head.transform.localPosition = new Vector3(0f, 1.06f, 0f); head.transform.localScale = Vector3.one * 0.3f;
        var helm = OiyoArcade.Prim(PrimitiveType.Sphere, "Helmet", helmMat, body);
        helm.transform.localPosition = new Vector3(0f, 1.14f, 0f); helm.transform.localScale = new Vector3(0.36f, 0.2f, 0.36f);
        if (kind == EK.Rocketeer)
        {
            var tube = OiyoArcade.Prim(PrimitiveType.Cylinder, "Tube", OiyoArcade.Lit(new Color(0.3f, 0.35f, 0.25f), 0.3f), body);
            tube.transform.localPosition = new Vector3(-0.05f, 0.98f, -0.2f); tube.transform.localRotation = Quaternion.Euler(0f, 0f, 90f); tube.transform.localScale = new Vector3(0.16f, 0.5f, 0.16f);
        }
        else if (kind == EK.Shield)
        {
            var sh = OiyoArcade.Prim(PrimitiveType.Cube, "Shield", OiyoArcade.Lit(new Color(0.55f, 0.6f, 0.68f), 0.7f, null, 0.6f), body);
            sh.transform.localPosition = new Vector3(-0.32f, 0.62f, -0.1f); sh.transform.localScale = new Vector3(0.08f, 1f, 0.6f);
        }
        else
        {
            var gun = OiyoArcade.Prim(PrimitiveType.Cube, "Rifle", helmMat, body);
            gun.transform.localPosition = new Vector3(-0.32f, 0.74f, -0.2f); gun.transform.localScale = new Vector3(0.55f, 0.1f, 0.08f);
        }
    }

    void BuildTrain(Transform t)
    {
        var iron = OiyoArcade.Lit(new Color(0.32f, 0.3f, 0.3f), 0.5f, null, 0.5f);
        var rust = OiyoArcade.Lit(new Color(0.5f, 0.24f, 0.14f), 0.3f, null, 0.2f);
        int cars = BigTrain ? 3 : 2;
        for (int c = 0; c < cars; c++)
        {
            var car = OiyoArcade.Prim(PrimitiveType.Cube, "Car", c == 0 ? rust : iron, t);
            car.transform.localPosition = new Vector3(c * 5.2f, 2f, 0.6f); car.transform.localScale = new Vector3(5f, 2.8f, 2.2f);
            for (int w = 0; w < 3; w++)
            {
                var wheel = OiyoArcade.Prim(PrimitiveType.Cylinder, "Wheel", helmMat, t);
                wheel.transform.localPosition = new Vector3(c * 5.2f - 1.7f + w * 1.7f, 0.5f, -0.6f); wheel.transform.localRotation = Quaternion.Euler(90f, 0f, 0f); wheel.transform.localScale = new Vector3(1f, 0.2f, 1f);
            }
            var turret = OiyoArcade.Prim(PrimitiveType.Cylinder, "Turret", iron, t);
            turret.transform.localPosition = new Vector3(c * 5.2f, 3.7f, 0.6f); turret.transform.localScale = new Vector3(1.4f, 0.4f, 1.4f);
            var barrel = OiyoArcade.Prim(PrimitiveType.Cylinder, "Barrel", helmMat, t);
            barrel.transform.localPosition = new Vector3(c * 5.2f - 1.2f, 3.8f, 0.6f); barrel.transform.localRotation = Quaternion.Euler(0f, 0f, 80f); barrel.transform.localScale = new Vector3(0.3f, 1.1f, 0.3f);
        }
        var eye = OiyoArcade.Prim(PrimitiveType.Sphere, "Core", OiyoArcade.Glow(new Color(1f, 0.4f, 0.15f)), t);
        eye.transform.localPosition = new Vector3(-2.55f, 2.2f, 0f); eye.transform.localScale = Vector3.one * 0.9f;
        var rail = OiyoArcade.Prim(PrimitiveType.Cube, "Rail", iron, t);
        rail.transform.localPosition = new Vector3(cars * 2.6f - 2.6f, 0.03f, 0f); rail.transform.localScale = new Vector3(cars * 5.6f + 10f, 0.06f, 2.4f);
    }

    void Enemies(float dt)
    {
        foreach (var e in enemies)
        {
            if (e.dead > 0f) { e.dead += dt; e.y -= e.dead * 90f * dt; e.x += e.vx * dt; continue; }
            float dx = px - e.x;
            if (e.kind == EK.Boss)
            {
                // the train rolls slowly back and forth on its rails
                e.vx = Mathf.Sin(time * 0.5f) * 30f;
            }
            else e.vx = Mathf.Abs(dx) > 260f ? Mathf.Sign(dx) * 42f * (1f + stageIdx * 0.01f) : 0f;
            e.x += e.vx * dt;
            e.fire -= dt;
            if (Mathf.Abs(dx) < 650f && e.fire <= 0f)
            {
                float pace = Mathf.Max(0.7f, 1f - stageIdx * 0.01f);
                if (e.kind == EK.Boss)
                {
                    // the train alternates chest-high gun bursts (crouch under them) with lobbed shells
                    e.alt++;
                    if (e.alt % 4 == 0)
                    {
                        float sp = 300f, sy = e.y + 40f, tFly = Mathf.Abs(dx + 100f) / sp;
                        float vy = ((py + 23f) - sy - 0.5f * 430f * tFly * tFly) / Mathf.Max(0.2f, tFly);
                        vy *= 0.75f + (float)rnd.NextDouble() * 0.5f;
                        AddShot(e.x - 100f, sy, Mathf.Sign(dx) * sp, Mathf.Clamp(vy, -480f, 150f), true, true, 4f);
                        synth.Tone(90f, 0.12f, Wave.Noise, 0.08f, 0f, 12f);
                    }
                    else
                    {
                        AddShot(e.x - 120f, GROUND - 30f, Mathf.Sign(dx) * 360f, 0f, true, false, 3f);
                        synth.Tone(260f, 0.05f, Wave.Noise, 0.05f, 0f, 20f);
                    }
                    e.fire = 0.8f * pace;
                }
                else
                {
                    bool rocket = e.kind == EK.Rocketeer;
                    e.fire = (rocket ? 1.6f : 1.05f) * pace;
                    float sy = e.y + 12f;
                    float vy = (float)(rnd.NextDouble() - 0.5) * 20f;
                    if (rocket)
                    {
                        float tFly = Mathf.Abs(dx) / 260f;
                        vy = ((py + 23f) - sy - 0.5f * 430f * tFly * tFly) / Mathf.Max(0.2f, tFly);
                        vy = Mathf.Clamp(vy * (0.8f + (float)rnd.NextDouble() * 0.4f), -420f, 120f);
                    }
                    AddShot(e.x, sy, Mathf.Sign(dx) * 260f, vy, true, rocket, 3f);
                    synth.Tone(rocket ? 140f : 300f, 0.06f, Wave.Noise, 0.05f, 0f, 20f);
                }
            }
        }
        for (int i = enemies.Count - 1; i >= 0; i--)
            if (enemies[i].dead > 1.6f || (enemies[i].kind != EK.Boss && enemies[i].x < camX * PX - 400f && enemies[i].dead <= 0f))
            {
                if (enemies[i].dead <= 0f) kills++; // left behind: counts as passed
                Destroy(enemies[i].t.gameObject); enemies.RemoveAt(i);
            }
    }

    void Shoot()
    {
        if (ammo == 0) { weapon = Wpn.Rifle; ammo = -1; }
        if (shotCool > 0f) return;
        int w = (int)weapon;
        shotCool = WCool[w];
        if (ammo > 0) ammo--;
        float dir = faceLeft ? -1f : 1f;
        float spread = weapon == Wpn.Heavy ? 18f : 8f;
        AddShot(px + dir * 34f, py + (duck ? 31f : 18f), dir * WSpeed[w], (float)(rnd.NextDouble() - 0.5) * spread, false, weapon == Wpn.Rocket, 2f);
        synth.Tone(weapon == Wpn.Rocket ? 120f : weapon == Wpn.Heavy ? 420f : 600f, 0.05f, weapon == Wpn.Rocket ? Wave.Noise : Wave.Square, 0.06f, weapon == Wpn.Rocket ? 60f : 200f, 30f);
        if (weapon == Wpn.Rocket) shake = Mathf.Max(shake, 8f); else shake = Mathf.Max(shake, 2f);
    }

    void Grenade()
    {
        if (grenades <= 0) return;
        grenades--;
        float dir = faceLeft ? -1f : 1f;
        AddShot(px + dir * 20f, py, dir * 310f, -330f, false, true, 1.15f);
        synth.Tone(200f, 0.12f, Wave.Noise, 0.08f, 0f, 12f);
    }

    void AddShot(float x, float y, float vx, float vy, bool enemy, bool rocket, float life)
    {
        var s = new Shot { x = x, y = y, vx = vx, vy = vy, enemy = enemy, rocket = rocket, life = life };
        var go = OiyoArcade.Prim(rocket ? PrimitiveType.Capsule : PrimitiveType.Cube, "Shot", rocket ? rocketShotMat : enemy ? enemyShotMat : shotMat, root);
        go.transform.localScale = rocket ? new Vector3(0.16f, 0.2f, 0.16f) : new Vector3(0.26f, 0.07f, 0.07f);
        s.t = go.transform;
        shots.Add(s);
    }

    void Shots(float dt)
    {
        for (int i = shots.Count - 1; i >= 0; i--)
        {
            var s = shots[i];
            s.life -= dt;
            s.vy += (s.rocket ? 430f : 0f) * dt;
            s.x += s.vx * dt; s.y += s.vy * dt;
            if (s.y > GROUND && s.rocket) { s.life = 0f; Blast(s.x, GROUND, s.enemy); }
            if (s.enemy && s.life > 0f && Mathf.Abs(s.x - px) < 24f && s.y >= py + (duck ? 24f : 0f) && s.y <= py + 46f && inv <= 0f)
            {
                s.life = 0f;
                float dmg = s.rocket ? 20f : 8f;
                if (vehicle) dmg *= 0.5f;
                hp -= dmg; inv = 0.3f; shake = 12f; flash = 0.25f;
                synth.Tone(140f, 0.15f, Wave.Saw, 0.16f, 70f, 10f);
                if (s.rocket) Burst(s.x, s.y, new Color(1f, 0.6f, 0.15f), 10);
            }
            if (!s.enemy && s.life > 0f)
            {
                foreach (var e in enemies)
                {
                    if (e.dead > 0f) continue;
                    bool big = e.kind == EK.Boss;
                    float ex = big ? e.x + (BigTrain ? 200f : 100f) : e.x;
                    if (Mathf.Abs(s.x - ex) < (big ? (BigTrain ? 330f : 230f) : 24f) && Mathf.Abs(s.y - (e.y + (big ? 80f : 20f))) < (big ? 100f : 36f))
                    {
                        s.life = 0f;
                        if (s.rocket) { Blast(s.x, s.y, false); }
                        Damage(e, WDamage[(int)weapon] * (s.rocket && weapon != Wpn.Rocket ? 0f : 1f) * (vehicle ? 1.5f : 1f), e.kind == EK.Shield && Mathf.Sign(s.vx) != Mathf.Sign(e.x - px) ? false : e.kind == EK.Shield, s.vx);
                        bursts.Emit(W(s.x, s.y, -0.3f), new Color(1f, 0.9f, 0.5f), 4, 2f, 0.12f, 0.25f);
                        break;
                    }
                }
            }
            if (s.life <= 0f || s.x < camX * PX - 700f || s.x > camX * PX + 1200f) { Destroy(s.t.gameObject); shots.RemoveAt(i); }
        }
    }

    void Damage(Enemy e, float dmg, bool armored, float vx)
    {
        if (e.dead > 0f || dmg <= 0f) return;
        e.hp = Mathf.Max(0f, e.hp - dmg * (armored ? 0.45f : 1f));
        if (e.hp > 0f) return;
        e.dead = 0.01f; e.vx = vx * 0.22f;
        if (e.kind == EK.Boss) { score += 8000; Burst(e.x + 100f, e.y + 60f, new Color(1f, 0.36f, 0.08f), 80); shake = 22f; return; }
        kills++;
        score += 125;
        Burst(e.x, e.y + 18f, new Color(0.85f, 0.76f, 0.63f), 14);
        Wpn? drop = kills % 14 == 0 ? Wpn.Rocket : kills % 7 == 0 ? Wpn.Heavy : (Wpn?)null;
        // a field-dressing kit on every 5th kill that drops no weapon (the Unity missions run longer than the web's one)
        bool med = !drop.HasValue && kills % 5 == 0;
        if (drop.HasValue || med)
        {
            var p = new Pickup { x = e.x, y = GROUND - 28f, kind = drop ?? Wpn.Rifle, med = med, life = 12f };
            var go = OiyoArcade.Prim(PrimitiveType.Cube, "Crate", OiyoArcade.LitGlow(med ? new Color(0.95f, 0.95f, 0.95f) : drop.Value == Wpn.Heavy ? new Color(0.95f, 0.8f, 0.2f) : new Color(0.9f, 0.3f, 0.15f), new Color(0.2f, 0.15f, 0f)), root);
            if (med)
            {
                var cross = OiyoArcade.Prim(PrimitiveType.Cube, "Cross", OiyoArcade.Glow(new Color(0.9f, 0.15f, 0.15f)), go.transform);
                cross.transform.localPosition = new Vector3(0f, 0f, -0.51f); cross.transform.localScale = new Vector3(0.6f, 0.2f, 0.02f);
                var cross2 = OiyoArcade.Prim(PrimitiveType.Cube, "Cross", OiyoArcade.Glow(new Color(0.9f, 0.15f, 0.15f)), go.transform);
                cross2.transform.localPosition = new Vector3(0f, 0f, -0.51f); cross2.transform.localScale = new Vector3(0.2f, 0.6f, 0.02f);
            }
            go.transform.localScale = new Vector3(0.75f, 0.55f, 0.55f);
            var gl = OiyoArcade.GlowQuad("Glow", new Color(1f, 0.85f, 0.4f, 0.55f), 2.2f, go.transform);
            p.t = go.transform;
            pickups.Add(p);
        }
    }

    void Blast(float x, float y, bool enemy)
    {
        Burst(x, y, new Color(1f, 0.6f, 0.12f), 18);
        if (enemy)
        {
            float d = Mathf.Abs(px - x);
            if (d < 50f && inv <= 0f && py > GROUND - 90f) { hp -= vehicle ? 6f : 12f; inv = 0.3f; flash = 0.2f; }
            return;
        }
        foreach (var e in enemies)
        {
            if (e.dead > 0f) continue;
            float ex = e.kind == EK.Boss ? e.x + 100f : e.x;
            float d = Mathf.Sqrt((ex - x) * (ex - x) + (e.y + 20f - y) * (e.y + 20f - y));
            if (e.kind == EK.Boss) d = Mathf.Max(0f, d - 180f);
            float dam = d >= 115f ? 0f : Mathf.Round(90f * (1f - d / 115f));
            if (dam > 0f) Damage(e, dam, false, 0f);
        }
        foreach (var b in bunkers)
        {
            if (b.down) continue;
            float d = Mathf.Abs(b.x + b.w * 0.5f - x);
            if (d < 170f) b.hp -= Mathf.Round(120f * (1f - d / 170f));
        }
    }

    void Burst(float x, float y, Color c, int n)
    {
        bursts.Emit(W(x, y, -0.4f), c, n, 5f, 0.3f, 0.7f, Vector3.up * 2f);
        synth.Tone(70f, 0.35f, Wave.Noise, 0.16f, 0f, 6f);
        shake = Mathf.Max(shake, 10f);
    }

    void Toast(string s) { msg = s; msgT = 1.8f; }

    int MissionScore => Mathf.Max(0, Mathf.RoundToInt(kills * 125 + structuresDown * 600 + (bossMax - (boss != null ? boss.hp : bossMax)) * 2 + Mathf.Max(0f, 150f - time) * 20));

    void Win()
    {
        starsWon = 1 + (hp >= 50f ? 1 : 0) + (time <= Par ? 1 : 0);
        score = MissionScore + starsWon * 100;
        state = GameState.Victory;
        OiyoArcade.Record(Slug, stageIdx, starsWon, score, StageCount);
        Toast(U("MISSION COMPLETE"));
        StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f, Wave.Triangle));
    }

    void Lose()
    {
        score = MissionScore;
        state = GameState.GameOver;
        shake = 16f;
        synth.Tone(180f, 0.7f, Wave.Saw, 0.22f, 50f, 3f);
    }

    IEnumerator Arp(float[] fs, float gap, Wave wave)
    {
        foreach (var f in fs) { synth.Tone(f, 0.16f, wave, 0.2f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    // ---------------- View ----------------
    void Sync(float dt)
    {
        if (playerT == null) return;
        playerT.position = W(px, py + 46f);
        playerBody.localRotation = Quaternion.Euler(0f, faceLeft ? 180f : 0f, 0f);
        playerBody.localScale = new Vector3(1f, duck ? 0.65f : 1f, 1f);
        bool blink = inv > 0f && Mathf.Repeat(Time.time * 20f, 1f) < 0.4f;
        playerBody.gameObject.SetActive(!vehicle && !blink);
        gunT.localScale = weapon == Wpn.Rocket ? new Vector3(0.8f, 0.2f, 0.2f) : weapon == Wpn.Heavy ? new Vector3(0.75f, 0.16f, 0.14f) : new Vector3(0.62f, 0.12f, 0.1f);
        buggyT.position = W(buggyX, GROUND);
        buggyT.localRotation = Quaternion.Euler(0f, vehicle && faceLeft ? 180f : 0f, 0f);
        foreach (var e in enemies)
        {
            e.t.position = W(e.x, e.kind == EK.Boss ? GROUND : e.y + 42f);
            if (e.kind != EK.Boss)
            {
                e.t.localRotation = Quaternion.Euler(0f, px < e.x ? 0f : 180f, e.dead > 0f ? Mathf.Min(85f, e.dead * 300f) * (px < e.x ? -1f : 1f) : 0f);
            }
            else if (e.dead > 0f) e.t.position += new Vector3(Random.Range(-0.1f, 0.1f), -e.dead * 0.8f, 0f);
        }
        foreach (var s in shots)
        {
            s.t.position = W(s.x, s.y, -0.3f);
            s.t.rotation = s.rocket ? Quaternion.LookRotation(new Vector3(s.vx, -s.vy, 0f)) * Quaternion.Euler(90f, 0f, 0f) : Quaternion.identity;
        }
        foreach (var b in bunkers)
        {
            if (b.down) { b.t.localScale = new Vector3(b.w / PX, 0.3f, 1.4f); b.t.position = W(b.x + b.w * 0.5f, GROUND - 6f, 0.9f); continue; }
            float ratio = b.hp / b.max;
            b.r.sharedMaterial.color = ratio > 0.66f ? new Color(0.75f, 0.68f, 0.55f) : ratio > 0.33f ? new Color(0.6f, 0.52f, 0.42f) : new Color(0.45f, 0.38f, 0.3f);
        }
        foreach (var p in pickups) { p.t.position = W(p.x, p.y + Mathf.Sin(Time.time * 4f) * 4f, -0.2f); p.t.rotation = Quaternion.Euler(0f, Time.time * 90f, 0f); }
        flash = Mathf.MoveTowards(flash, 0f, dt);
    }

    void UpdateCamera(float dt, bool snap)
    {
        bool portrait = cam.aspect < 1f;
        // the web shows 960 px of road; an upright phone sees about 13 units around the soldier
        float viewW = portrait ? 11.5f : 24f;
        float viewH = viewW / cam.aspect;
        if (!portrait) viewH = Mathf.Max(viewH, 12f);
        float dist = viewH * 0.5f / Mathf.Tan(cam.fieldOfView * 0.5f * Mathf.Deg2Rad);
        float targetX = px / PX + (portrait ? 2f : 6f);
        camX = snap ? targetX : Mathf.Lerp(camX, targetX, 1f - Mathf.Exp(-dt * 5f));
        // upright phones keep the road above the touch pads
        float midY = portrait ? viewH * 0.07f + 1.4f : viewH * 0.36f;
        var pos = new Vector3(camX, midY + 1.2f, -dist);
        if (shake > 0f) { pos += (Vector3)Random.insideUnitCircle * shake * 0.02f; shake = Mathf.MoveTowards(shake, 0f, dt * 28f); }
        cam.transform.position = pos;
        cam.transform.rotation = Quaternion.Euler(4f, 0f, 0f);
    }

    // ?oiyotest=1 prints the run state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.2f;
        Debug.Log("OIYOTEST " + TestState());
    }
    string TestState() => $"{{\"s\":\"{state}\",\"x\":{px:F0},\"y\":{py:F0},\"hp\":{hp:F0},\"k\":{kills},\"boss\":{(boss != null ? boss.hp : -1f):F0},\"bx\":{bossX:F0},\"end\":{levelEnd:F0}}}";

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(1f, 0.62f, 0.1f, 0.97f);
    static readonly Color Dark = new Color(0.07f, 0.05f, 0.03f, 0.86f);
    static readonly Color Gold = new Color(1f, 0.82f, 0.25f, 0.97f);
    static readonly Color Slate = new Color(0.2f, 0.18f, 0.15f, 0.95f);
    static readonly Color Pad = new Color(0f, 0f, 0f, 0.38f);

    string StageTitle(int i) => F("Mission {0}", i + 1) + " · " + U(Zones[i / 5]);
    static string Mmss(float s) => $"{Mathf.FloorToInt(s / 60f)}:{Mathf.FloorToInt(s % 60f):00}";
    string WeaponName => weapon == Wpn.Rifle ? U("RIFLE") : weapon == Wpn.Heavy ? U("HEAVY MG") : U("ROCKETS");

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (flash > 0f) OiyoArcade.Fill(new Rect(0f, 0f, w, h), new Color(0.8f, 0f, 0f, flash));
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        var bar = new Rect(8f, 8f, w - 16f, 72f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 140f, 22f), "<b>" + StageTitle(stageIdx) + "</b>", 15, new Color(1f, 0.9f, 0.75f));
        string am = ammo < 0 ? "∞" : ammo.ToString();
        OiyoArcade.Text(new Rect(20f, 34f, w - 90f, 22f), $"<color=#ffcf4f><b>{WeaponName} {am}</b></color>   {U("BOMBS")} <b>{grenades}</b>   {U("Kills")} <b>{kills}</b>   {Mmss(time)}", 14, Color.white);
        OiyoArcade.Bar(new Rect(20f, 60f, w - 96f, 8f), hp / (vehicle ? 160f : 100f), new Color(0f, 0f, 0f, 0.5f), hp > 30f ? new Color(0.45f, 1f, 0.4f) : new Color(1f, 0.4f, 0.3f));
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (boss != null && boss.dead <= 0f)
        {
            OiyoArcade.Text(new Rect(16f, 84f, w - 32f, 18f), U("WAR TRAIN"), 12, new Color(1f, 0.6f, 0.5f), TextAnchor.UpperCenter);
            OiyoArcade.Bar(new Rect(40f, 102f, w - 80f, 9f), boss.hp / boss.max, new Color(0f, 0f, 0f, 0.5f), new Color(0.85f, 0.2f, 0.12f));
        }
        else
        {
            float prog = Mathf.Clamp01(px / bossTrigger);
            OiyoArcade.Bar(new Rect(40f, 88f, w - 80f, 5f), prog, new Color(0f, 0f, 0f, 0.35f), new Color(1f, 0.8f, 0.3f));
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(0f, h * 0.3f, w, 40f), msg, 26, Gold, TextAnchor.MiddleCenter);
        if ((state == GameState.Playing || state == GameState.Ready) && Application.isMobilePlatform) DrawPads(w, h);
        if (state == GameState.Ready)
        {
            var r = new Rect(w * 0.5f - 170f, h * 0.34f, 340f, 140f);
            OiyoArcade.Panel(r, Dark);
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 8f, r.width - 24f, r.height - 16f),
                $"<b>{U("Push through the front and wreck the War Train")}</b>\n<size=13>{U("Pads to run and crouch, FIRE to shoot, JUMP, BOMB to throw. Keys: A/D, W/Space, S, J fire, K bomb, E buggy.")}</size>", 16, Color.white, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Paused) DrawPause(w, h);
        if (state == GameState.Victory || state == GameState.GameOver) DrawResult(w, h);
    }

    void DrawPads(float w, float h)
    {
        Layout(w, h);
        Color on = new Color(1f, 1f, 1f, 0.35f);
        OiyoArcade.Panel(PadLeft, hLeft ? on : Pad); OiyoArcade.Text(PadLeft, "◀", 28, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Panel(PadRight, hRight ? on : Pad); OiyoArcade.Text(PadRight, "▶", 28, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Panel(PadDuck, hDuck ? on : Pad); OiyoArcade.Text(PadDuck, "▼", 18, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Panel(BtnFire, hFire ? new Color(1f, 0.55f, 0.1f, 0.95f) : new Color(1f, 0.5f, 0.1f, 0.7f)); OiyoArcade.Text(BtnFire, "<b>" + U("FIRE") + "</b>", 17, new Color(0.12f, 0.06f, 0f), TextAnchor.MiddleCenter);
        OiyoArcade.Panel(BtnJump, hJump ? on : Pad); OiyoArcade.Text(BtnJump, "<b>" + U("JUMP") + "</b>", 14, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Panel(BtnBomb, grenades > 0 ? Pad : new Color(0f, 0f, 0f, 0.15f)); OiyoArcade.Text(BtnBomb, $"<b>{U("BOMB")}</b> {grenades}", 13, Color.white, TextAnchor.MiddleCenter);
        if (NearBuggy || vehicle)
        {
            OiyoArcade.Panel(BtnCar, new Color(0.35f, 0.5f, 0.2f, 0.8f));
            OiyoArcade.Text(BtnCar, "<b>" + (vehicle ? U("EXIT") : U("BUGGY")) + "</b>", 13, Color.white, TextAnchor.MiddleCenter);
        }
    }

    void DrawMenu(float w, float h)
    {
        if (showStages)
        {
            float bw = Mathf.Min(w - 16f, 760f);
            var box = new Rect(w * 0.5f - bw * 0.5f, 12f, bw, h - 24f);
            OiyoArcade.Panel(box, new Color(0.07f, 0.05f, 0.03f, 0.94f));
            OiyoArcade.Text(new Rect(box.x + 16f, box.y + 12f, box.width - 120f, 30f), "<b>" + U("Choose a stage") + "</b>", 20, Color.white);
            OiyoArcade.Text(new Rect(box.x + 16f, box.y + 40f, box.width - 32f, 22f), $"★ {OiyoArcade.TotalStars(Slug, StageCount)}/{StageCount * 3}", 15, Gold);
            if (OiyoArcade.Button(new Rect(box.xMax - 100f, box.y + 12f, 86f, 40f), U("Back"), Slate, 16)) showStages = false;
            int pick = OiyoArcade.StageGrid(new Rect(box.x + 14f, box.y + 70f, box.width - 28f, box.height - 84f), Slug, StageCount, Accent, U("Stage"));
            if (pick >= 0) LoadStage(pick);
            return;
        }
        float cw = Mathf.Min(380f, w - 24f);
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - 190f, cw, 380f);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("Iron Tempest 3D"), 30, new Color(1f, 0.8f, 0.35f), TextAnchor.MiddleCenter);
        card.y += 30f;
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 32f, cw - 40f, 76f), U("Run, jump and blast through 30 fronts. Grab heavy weapons, crack the bunkers and bring down the War Train."), 15, new Color(1f, 1f, 1f, 0.85f), TextAnchor.MiddleCenter);
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
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 14f, cw, 38f), won ? U("MISSION COMPLETE") : U("SOLDIER DOWN"), 26, won ? new Color(0.6f, 1f, 0.6f) : new Color(1f, 0.55f, 0.5f), TextAnchor.MiddleCenter);
        string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : U("The front held this time.");
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 56f, cw - 32f, 44f), detail, 16, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 100f, cw - 32f, 52f),
            $"{U("Score")} <b>{score}</b>   {U("Kills")} <b>{kills}</b>\n<size=14>{U("Time")} {Mmss(time)} · {F("Par {0}", Mmss(Par))}</size>", 16, Color.white, TextAnchor.MiddleCenter);
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
