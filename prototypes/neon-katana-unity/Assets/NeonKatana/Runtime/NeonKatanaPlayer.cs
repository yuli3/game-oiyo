using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Neon Katana 3D: the web Neon Katana (src/components/games/NeonKatana.tsx, src/lib/games/neon-katana.ts)
// rebuilt as a 30-stage Unity game. Same rules as the web engine: drones circle the swordsman and
// fire at him; a parry within 140 ms of impact is PERFECT and sends the shot back at the nearest
// drone, within 280 ms it is a GUARD that destroys the shot. Parries fill the gauge, and a full
// gauge unleashes Blade-Dash: every drone on screen is cut down and time slows for a moment.
// Space/J/click/tap to parry; Shift/K or the DASH button for Blade-Dash.
public class NeonKatanaPlayer : MonoBehaviour
{
    const string Slug = "neon-katana";
    const int StageCount = 30;
    const float PerfectS = 0.14f, GuardS = 0.28f, BodyR = 0.65f, WhiffLock = 0.38f;
    const int MaxHp = 5;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    enum Kind { Scout, Assault, Sniper, Slicer }
    struct StageDef { public int zone, kills, maxDrones; public float shotSpeed, interval; public Kind[] kinds; public bool burst; }
    static readonly string[] ZoneNames = { "Rooftop Dojo", "Rain Alley", "Laser Market", "Shuriken Yard", "Heavy Foundry", "Core Tower" };
    static readonly Color[] KindColor = { new Color(1f, 0.25f, 0.55f), new Color(1f, 0.55f, 0.15f), new Color(0.7f, 0.35f, 1f), new Color(0.35f, 1f, 0.5f) };
    static readonly Color Cyan = new Color(0.2f, 0.95f, 1f);

    StageDef[] stages;
    int stageIdx;
    StageDef S => stages[stageIdx];

    class Drone { public Kind kind; public Transform t, ring, eye; public float angle, radius, targetRadius, cooldown, warn; public int hp, burstLeft; public bool dead; }
    class Shot { public Transform t; public Vector3 vel; public float speed; public int dmg; public bool reflected; public Drone target; public Kind kind; }
    readonly List<Drone> drones = new List<Drone>();
    readonly List<Shot> shots = new List<Shot>();
    int hp, kills, spawned, score, combo, maxCombo, perfects, guards, stars;
    float gauge, bulletTime, whiff, invuln, spawnTimer, swing, swingAngle, hitFlash;
    string judge = ""; float judgeTimer; Color judgeColor;
    string endReason = "";

    Camera cam;
    Transform root, player, katanaPivot, slash;
    Material ringMat, slashMat, bodyMat;
    readonly Material[] droneMats = new Material[4];
    readonly Material[] shotMats = new Material[4];
    Material reflectMat;
    Bursts bursts;
    Synth synth;
    bool showStages;
    float menuOrbit, shake;

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
        Kind[][] kinds = {
            new[] { Kind.Scout }, new[] { Kind.Scout, Kind.Scout, Kind.Assault }, new[] { Kind.Scout, Kind.Assault, Kind.Sniper },
            new[] { Kind.Scout, Kind.Slicer, Kind.Assault, Kind.Slicer }, new[] { Kind.Assault, Kind.Assault, Kind.Sniper, Kind.Scout },
            new[] { Kind.Scout, Kind.Assault, Kind.Sniper, Kind.Slicer } };
        for (int i = 0; i < StageCount; i++)
        {
            int zone = i / 5;
            stages[i] = new StageDef
            {
                zone = zone,
                kills = 6 + i,
                maxDrones = Mathf.Min(2 + i / 6, 6),
                shotSpeed = 6.2f + i * 0.12f,
                interval = Mathf.Max(1.35f, 2.7f - i * 0.045f),
                kinds = kinds[zone],
                burst = zone >= 4,
            };
        }
    }

    // ---------------- Scene ----------------
    void SetupScene()
    {
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 50f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.03f, 0.02f, 0.08f);
        cam.farClipPlane = 200f;
        var key = new GameObject("Key").AddComponent<Light>();
        key.type = LightType.Directional;
        key.intensity = 0.7f;
        key.color = new Color(0.7f, 0.8f, 1f);
        key.transform.rotation = Quaternion.Euler(55f, 25f, 0f);
        var fill = new GameObject("Fill").AddComponent<Light>();
        fill.type = LightType.Point;
        fill.range = 14f;
        fill.intensity = 1.6f;
        fill.color = new Color(1f, 0.3f, 0.8f);
        fill.transform.position = new Vector3(0f, 3f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.25f, 0.22f, 0.4f);

        for (int k = 0; k < 4; k++)
        {
            droneMats[k] = OiyoArcade.LitGlow(new Color(0.15f, 0.15f, 0.2f), KindColor[k] * 0.35f, 0.85f);
            shotMats[k] = OiyoArcade.Glow(Color.Lerp(KindColor[k], Color.white, 0.35f));
        }
        reflectMat = OiyoArcade.Glow(Cyan);
        ringMat = OiyoArcade.Glow(Cyan * 0.8f);
        slashMat = OiyoArcade.Transparent(OiyoArcade.Art("NK/slash"), new Color(0.6f, 1f, 1f, 1f));
        bodyMat = OiyoArcade.Lit(new Color(0.12f, 0.12f, 0.18f), 0.4f);
        bursts = new Bursts(transform, 0.2f);
        synth = new Synth(gameObject);
    }

    void BuildArena()
    {
        var floor = OiyoArcade.Prim(PrimitiveType.Cylinder, "Floor", OiyoArcade.Lit(Color.white, 0.6f, OiyoArcade.Art("NK/floor")), root);
        floor.transform.position = new Vector3(0f, -0.1f, 0f);
        floor.transform.localScale = new Vector3(17f, 0.1f, 17f);
        var rim = OiyoArcade.Prim(PrimitiveType.Cylinder, "Rim", OiyoArcade.Glow(KindColor[0] * 0.8f), root);
        rim.transform.position = new Vector3(0f, -0.13f, 0f);
        rim.transform.localScale = new Vector3(17.5f, 0.1f, 17.5f);
        var city = OiyoArcade.Prim(PrimitiveType.Quad, "City", OiyoArcade.Textured(OiyoArcade.Art("NK/city")), root);
        city.transform.position = new Vector3(0f, -8f, 30f);
        city.transform.rotation = Quaternion.Euler(30f, 0f, 0f);
        city.transform.localScale = new Vector3(110f, 40f, 1f);

        player = new GameObject("Ronin").transform;
        player.SetParent(root, false);
        var body = OiyoArcade.Prim(PrimitiveType.Capsule, "Body", bodyMat, player);
        body.transform.localPosition = new Vector3(0f, 0.75f, 0f);
        body.transform.localScale = new Vector3(0.7f, 0.75f, 0.7f);
        var sash = OiyoArcade.Prim(PrimitiveType.Cylinder, "Sash", OiyoArcade.Glow(KindColor[0]), player);
        sash.transform.localPosition = new Vector3(0f, 0.75f, 0f);
        sash.transform.localScale = new Vector3(0.74f, 0.05f, 0.74f);
        var hatBrim = OiyoArcade.Prim(PrimitiveType.Cylinder, "Brim", OiyoArcade.Lit(new Color(0.75f, 0.6f, 0.35f), 0.2f), player);
        hatBrim.transform.localPosition = new Vector3(0f, 1.55f, 0f);
        hatBrim.transform.localScale = new Vector3(1.25f, 0.03f, 1.25f);
        var hatTop = OiyoArcade.Prim(PrimitiveType.Sphere, "HatTop", OiyoArcade.Lit(new Color(0.8f, 0.65f, 0.4f), 0.2f), player);
        hatTop.transform.localPosition = new Vector3(0f, 1.6f, 0f);
        hatTop.transform.localScale = new Vector3(0.7f, 0.25f, 0.7f);
        katanaPivot = new GameObject("KatanaPivot").transform;
        katanaPivot.SetParent(player, false);
        katanaPivot.localPosition = new Vector3(0f, 0.9f, 0f);
        var blade = OiyoArcade.Prim(PrimitiveType.Cube, "Blade", OiyoArcade.Glow(Cyan), katanaPivot);
        blade.transform.localPosition = new Vector3(0f, 0f, 0.95f);
        blade.transform.localScale = new Vector3(0.06f, 0.06f, 1.3f);
        var hilt = OiyoArcade.Prim(PrimitiveType.Cube, "Hilt", OiyoArcade.Lit(new Color(0.2f, 0.1f, 0.1f)), katanaPivot);
        hilt.transform.localPosition = new Vector3(0f, 0f, 0.2f);
        hilt.transform.localScale = new Vector3(0.09f, 0.09f, 0.35f);
        var ring = OiyoArcade.Prim(PrimitiveType.Cylinder, "ParryRing", ringMat, player);
        ring.transform.localPosition = new Vector3(0f, 0.02f, 0f);
        // the ring sits where a shot is when the PERFECT window opens, so "hit it at the ring" is literal
        float ringD = 2f * (BodyR + PerfectS * S.shotSpeed) / 1.5f;
        ring.transform.localScale = new Vector3(ringD, 0.01f, ringD);
        var inner = OiyoArcade.Prim(PrimitiveType.Cylinder, "Inner", OiyoArcade.Lit(new Color(0.06f, 0.05f, 0.12f), 0.5f), player);
        inner.transform.localPosition = new Vector3(0f, 0.03f, 0f);
        inner.transform.localScale = new Vector3(ringD - 0.12f, 0.01f, ringD - 0.12f);
        player.localScale = Vector3.one * 1.5f;
        slash = OiyoArcade.Prim(PrimitiveType.Quad, "Slash", slashMat, root).transform;
        slash.gameObject.SetActive(false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Arena").transform;
        drones.Clear(); shots.Clear();
        BuildArena();
        hp = MaxHp; kills = spawned = score = combo = maxCombo = perfects = guards = stars = 0;
        gauge = 0f; bulletTime = 0f; whiff = 0f; invuln = 0f; spawnTimer = 0.6f; swing = 0f; hitFlash = 0f;
        judge = ""; endReason = "";
        showStages = false;
        state = ready ? GameState.Ready : GameState.Menu;
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("neon-katana", state, score);
        float dt = Time.deltaTime;
        ReadInput();
        float world = bulletTime > 0f ? 0.25f : 1f;
        if (state == GameState.Playing)
        {
            bulletTime = Mathf.Max(0f, bulletTime - dt);
            whiff = Mathf.Max(0f, whiff - dt);
            invuln = Mathf.Max(0f, invuln - dt);
            StepDrones(dt * world);
            StepShots(dt * world);
        }
        Animate(dt);
        UpdateCamera(dt);
    }

    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return);
        var presses = OiyoArcade.Began();
        switch (state)
        {
            case GameState.Ready:
                if (confirm || presses.Count > 0 || Input.GetKeyDown(KeyCode.J)) state = GameState.Playing;
                break;
            case GameState.Playing:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) { state = GameState.Paused; break; }
                if (Input.GetKeyDown(KeyCode.LeftShift) || Input.GetKeyDown(KeyCode.RightShift) || Input.GetKeyDown(KeyCode.K) || Input.GetKeyDown(KeyCode.E)) BladeDash();
                if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.J) || presses.Count > 0) Parry();
                break;
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                break;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm) LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                break;
            case GameState.Menu:
                if (!showStages && confirm) LoadStage(stageIdx);
                break;
        }
    }

    float ArenaR => 6.6f;

    void StepDrones(float dt)
    {
        int alive = 0;
        foreach (var d in drones) if (!d.dead) alive++;
        spawnTimer -= dt;
        if (spawnTimer <= 0f && alive < S.maxDrones && spawned < S.kills)
        {
            SpawnDrone();
            spawnTimer = 1.1f + Random.value * 0.8f;
        }
        foreach (var d in drones)
        {
            if (d.dead) continue;
            d.radius = Mathf.MoveTowards(d.radius, d.targetRadius, dt * 5f);
            d.angle += dt * (d.kind == Kind.Slicer ? 0.55f : 0.22f) * (d.hp % 2 == 0 ? 1f : -1f);
            Vector3 pos = new Vector3(Mathf.Cos(d.angle) * d.radius, 1.1f + Mathf.Sin(Time.time * 2f + d.angle) * 0.15f, Mathf.Sin(d.angle) * d.radius);
            d.t.position = pos;
            d.t.LookAt(new Vector3(0f, 1f, 0f));
            if (d.radius > d.targetRadius + 0.2f) continue;
            d.cooldown -= dt;
            d.warn = d.cooldown < 0.45f ? 1f - d.cooldown / 0.45f : 0f;
            if (d.cooldown <= 0f)
            {
                Fire(d);
                if (S.burst && d.kind == Kind.Assault && d.burstLeft == 0) { d.burstLeft = 1; d.cooldown = 0.28f; }
                else { d.burstLeft = 0; d.cooldown = S.interval * (d.kind == Kind.Sniper ? 1.3f : 1f) * Random.Range(0.85f, 1.2f); }
            }
        }
    }

    void SpawnDrone()
    {
        var kind = S.kinds[Random.Range(0, S.kinds.Length)];
        var go = OiyoArcade.Prim(PrimitiveType.Sphere, "Drone", droneMats[(int)kind], root);
        go.transform.localScale = Vector3.one * (kind == Kind.Assault ? 0.95f : 0.75f);
        var ring = OiyoArcade.Prim(PrimitiveType.Cylinder, "Ring", OiyoArcade.Glow(KindColor[(int)kind]), go.transform);
        ring.transform.localScale = new Vector3(1.7f, 0.03f, 1.7f);
        var eye = OiyoArcade.Prim(PrimitiveType.Sphere, "Eye", OiyoArcade.Glow(Color.white), go.transform);
        eye.transform.localPosition = new Vector3(0f, 0f, 0.42f);
        eye.transform.localScale = Vector3.one * 0.35f;
        var d = new Drone
        {
            kind = kind, t = go.transform, ring = ring.transform, eye = eye.transform,
            angle = Random.value * Mathf.PI * 2f, radius = 13f, targetRadius = ArenaR - Random.value * 1.2f,
            hp = kind == Kind.Assault ? 2 : 1, cooldown = 0.9f + Random.value * 0.9f,
        };
        drones.Add(d);
        spawned++;
    }

    void Fire(Drone d)
    {
        var from = d.t.position;
        var to = new Vector3(0f, 0.9f, 0f);
        float speed = S.shotSpeed * (d.kind == Kind.Sniper ? 1.55f : d.kind == Kind.Slicer ? 0.85f : d.kind == Kind.Assault ? 1.08f : 1f);
        GameObject go;
        if (d.kind == Kind.Sniper)
        {
            go = OiyoArcade.Prim(PrimitiveType.Cube, "Laser", shotMats[(int)d.kind], root);
            go.transform.localScale = new Vector3(0.18f, 0.18f, 1.2f);
        }
        else if (d.kind == Kind.Slicer)
        {
            go = OiyoArcade.Prim(PrimitiveType.Cube, "Star", shotMats[(int)d.kind], root);
            go.transform.localScale = new Vector3(0.75f, 0.08f, 0.24f);
            var b = OiyoArcade.Prim(PrimitiveType.Cube, "Star2", shotMats[(int)d.kind], go.transform);
            b.transform.localRotation = Quaternion.Euler(0f, 90f, 0f);
            b.transform.localScale = new Vector3(1f, 1f, 1f);
        }
        else
        {
            go = OiyoArcade.Prim(PrimitiveType.Sphere, "Shot", shotMats[(int)d.kind], root);
            go.transform.localScale = Vector3.one * (d.kind == Kind.Assault ? 0.56f : 0.42f);
        }
        var halo = OiyoArcade.GlowQuad("Halo", new Color(KindColor[(int)d.kind].r, KindColor[(int)d.kind].g, KindColor[(int)d.kind].b, 0.6f), 3.2f, go.transform);
        go.transform.position = from;
        var dir = (to - from).normalized;
        go.transform.rotation = Quaternion.LookRotation(dir);
        shots.Add(new Shot { t = go.transform, vel = dir * speed, speed = speed, dmg = d.kind == Kind.Sniper ? 2 : 1, kind = d.kind });
        synth.Tone(d.kind == Kind.Sniper ? 1200f : 700f, 0.08f, Wave.Square, 0.08f, d.kind == Kind.Sniper ? 1800f : 400f, 20f);
    }

    float TimeToImpact(Shot s)
    {
        var flat = s.t.position; flat.y = 0f;
        return Mathf.Max(0f, (flat.magnitude - BodyR) / s.speed);
    }

    void StepShots(float dt)
    {
        for (int i = shots.Count - 1; i >= 0; i--)
        {
            var s = shots[i];
            if (s.reflected)
            {
                if (s.target == null || s.target.dead)
                {
                    s.target = Nearest(s.t.position);
                    if (s.target == null) { KillShot(i); continue; }
                }
                var dir = (s.target.t.position - s.t.position).normalized;
                s.vel = dir * s.speed;
                s.t.position += s.vel * dt;
                s.t.rotation = Quaternion.LookRotation(dir);
                if ((s.t.position - s.target.t.position).sqrMagnitude < 0.6f)
                {
                    DamageDrone(s.target, s.dmg + 1);
                    KillShot(i);
                }
                continue;
            }
            s.t.position += s.vel * dt;
            if (s.kind == Kind.Slicer) s.t.Rotate(0f, 900f * dt, 0f, Space.Self);
            var flat = s.t.position; flat.y = 0f;
            if (flat.magnitude <= BodyR)
            {
                if (invuln <= 0f) TakeHit(s.dmg);
                bursts.Emit(s.t.position, KindColor[(int)s.kind], 12, 3f, 0.25f);
                KillShot(i);
                if (state != GameState.Playing) return;
            }
        }
    }

    Drone Nearest(Vector3 p)
    {
        Drone best = null; float bd = float.MaxValue;
        foreach (var d in drones)
        {
            if (d.dead) continue;
            float dd = (d.t.position - p).sqrMagnitude;
            if (dd < bd) { bd = dd; best = d; }
        }
        return best;
    }

    void KillShot(int i)
    {
        if (shots[i].t != null) Destroy(shots[i].t.gameObject);
        shots.RemoveAt(i);
    }

    void Parry()
    {
        if (whiff > 0f) return;
        int perfectN = 0, guardN = 0;
        Vector3 aim = Vector3.forward;
        float closest = float.MaxValue;
        for (int i = shots.Count - 1; i >= 0; i--)
        {
            var s = shots[i];
            if (s.reflected) continue;
            float t = TimeToImpact(s);
            if (t > GuardS) continue;
            if (t < closest) { closest = t; aim = new Vector3(s.t.position.x, 0f, s.t.position.z).normalized; }
            if (t <= PerfectS)
            {
                perfectN++;
                s.reflected = true;
                s.speed *= 1.6f;
                s.target = Nearest(s.t.position);
                var r = s.t.GetComponent<Renderer>();
                r.sharedMaterial = reflectMat;
                foreach (var cr in s.t.GetComponentsInChildren<Renderer>()) if (cr != r && cr.name != "Halo") cr.sharedMaterial = reflectMat;
                bursts.Emit(s.t.position, Cyan, 14, 4f, 0.25f);
            }
            else
            {
                guardN++;
                bursts.Emit(s.t.position, Color.white, 8, 3f, 0.2f);
                KillShot(i);
            }
        }
        Swing(aim);
        if (perfectN > 0)
        {
            combo++; maxCombo = Mathf.Max(maxCombo, combo);
            float mult = 1f + Mathf.Min(4f, (combo - 1) * 0.2f);
            score += Mathf.RoundToInt(150 * perfectN * mult);
            gauge = Mathf.Min(100f, gauge + 25f * perfectN);
            perfects += perfectN;
            Judge(U("PERFECT"), Cyan);
            synth.Tone(1320f, 0.18f, Wave.Triangle, 0.3f, 1760f, 8f);
            shake = 0.12f;
        }
        else if (guardN > 0)
        {
            combo++; maxCombo = Mathf.Max(maxCombo, combo);
            score += 50 * guardN;
            gauge = Mathf.Min(100f, gauge + 10f * guardN);
            guards += guardN;
            Judge(U("GUARD"), Color.white);
            synth.Tone(880f, 0.12f, Wave.Triangle, 0.25f, 0f, 12f);
        }
        else
        {
            whiff = WhiffLock;
            Judge(U("Too early"), new Color(1f, 0.6f, 0.4f));
            synth.Tone(300f, 0.1f, Wave.Noise, 0.12f, 0f, 20f);
        }
    }

    void Swing(Vector3 aim)
    {
        swing = 1f;
        swingAngle = Mathf.Atan2(aim.x, aim.z) * Mathf.Rad2Deg;
        slash.gameObject.SetActive(true);
        slash.position = new Vector3(aim.x * 1.6f, 1.3f, aim.z * 1.6f);
        slash.rotation = Quaternion.Euler(90f, swingAngle, 0f);
        slash.localScale = new Vector3(3.6f, 1.6f, 1f);
    }

    void BladeDash()
    {
        if (gauge < 100f || state != GameState.Playing) return;
        gauge = 0f;
        bulletTime = 1.6f;
        int cut = 0;
        foreach (var d in drones) if (!d.dead) { cut++; DamageDrone(d, 99, false); }
        for (int i = shots.Count - 1; i >= 0; i--) if (!shots[i].reflected) KillShot(i);
        float bonus = 1f + combo * 0.15f;
        score += Mathf.RoundToInt(500 * cut * bonus);
        combo += cut;
        maxCombo = Mathf.Max(maxCombo, combo);
        Judge(U("BLADE-DASH!"), new Color(1f, 0.4f, 0.9f));
        slash.gameObject.SetActive(true);
        slash.position = new Vector3(0f, 1f, 0f);
        slash.rotation = Quaternion.Euler(90f, Random.Range(0f, 180f), 0f);
        slash.localScale = new Vector3(16f, 2.2f, 1f);
        swing = 1.4f;
        shake = 0.5f;
        synth.Tone(200f, 0.6f, Wave.Saw, 0.3f, 1600f, 3f);
        synth.Tone(90f, 0.5f, Wave.Noise, 0.25f, 0f, 5f);
        CheckWin();
    }

    void DamageDrone(Drone d, int dmg, bool check = true)
    {
        if (d.dead) return;
        d.hp -= dmg;
        bursts.Emit(d.t.position, KindColor[(int)d.kind], 10, 3f, 0.3f);
        if (d.hp > 0) { synth.Tone(500f, 0.08f, Wave.Square, 0.12f, 0f, 20f); return; }
        d.dead = true;
        kills++;
        score += 200;
        bursts.Emit(d.t.position, KindColor[(int)d.kind], 34, 6f, 0.4f, 0.7f);
        bursts.Emit(d.t.position, Color.white, 12, 4f, 0.25f);
        Destroy(d.t.gameObject);
        synth.Tone(160f, 0.35f, Wave.Noise, 0.25f, 0f, 7f);
        if (check) CheckWin();
    }

    void CheckWin()
    {
        if (kills < S.kills || state != GameState.Playing) return;
        state = GameState.Victory;
        stars = 1 + (hp >= 3 ? 1 : 0) + (hp >= MaxHp ? 1 : 0);
        OiyoArcade.Record(Slug, stageIdx, stars, score, StageCount);
        foreach (var s in shots) if (s.t != null) Destroy(s.t.gameObject);
        shots.Clear();
        StartCoroutine(Arp(new[] { 659f, 784f, 988f, 1319f, 1568f }, 0.08f));
    }

    void TakeHit(int dmg)
    {
        hp = Mathf.Max(0, hp - dmg);
        combo = 0;
        invuln = 0.6f;
        hitFlash = 1f;
        shake = 0.45f;
        synth.Tone(140f, 0.3f, Wave.Saw, 0.3f, 60f, 6f);
        Judge(U("HIT!"), new Color(1f, 0.35f, 0.35f));
        if (hp <= 0)
        {
            endReason = U("The drones broke through your guard!");
            state = GameState.GameOver;
            bursts.Emit(player.position + Vector3.up, KindColor[0], 50, 6f, 0.4f);
        }
    }

    void Judge(string t, Color c) { judge = t; judgeColor = c; judgeTimer = 0.55f; }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.2f, Wave.Triangle, 0.3f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void Animate(float dt)
    {
        judgeTimer -= dt;
        // the ring lights up while a shot is inside the perfect window: the timing cue on phones
        float best = float.MaxValue;
        foreach (var s in shots) if (!s.reflected) best = Mathf.Min(best, TimeToImpact(s));
        Color rc = best <= PerfectS ? Color.white : best <= GuardS ? Color.Lerp(Cyan, Color.white, 0.4f) : Cyan * 0.55f;
        if (whiff > 0f) rc = new Color(0.5f, 0.2f, 0.2f);
        ringMat.color = Color.Lerp(ringMat.color, rc, dt * 20f);
        bodyMat.color = Color.Lerp(new Color(0.12f, 0.12f, 0.18f), new Color(1f, 0.3f, 0.3f), hitFlash);
        hitFlash = Mathf.MoveTowards(hitFlash, 0f, dt * 3f);
        foreach (var s in shots)
        {
            var halo = s.t != null ? s.t.Find("Halo") : null;
            if (halo != null) halo.rotation = cam.transform.rotation;
        }
        foreach (var d in drones)
        {
            if (d.dead || d.ring == null) continue;
            d.ring.Rotate(0f, 240f * dt, 0f, Space.Self);
            d.eye.localScale = Vector3.one * (0.35f + d.warn * 0.25f);
        }
        if (swing > 0f)
        {
            swing = Mathf.MoveTowards(swing, 0f, dt * 6f);
            float a = swingAngle - 70f + (1f - Mathf.Clamp01(swing)) * 140f;
            katanaPivot.localRotation = Quaternion.Euler(0f, a, 0f);
            slashMat.color = new Color(0.6f, 1f, 1f, Mathf.Clamp01(swing));
            if (swing <= 0f) slash.gameObject.SetActive(false);
        }
        else katanaPivot.localRotation = Quaternion.Slerp(katanaPivot.localRotation, Quaternion.Euler(-20f, 35f, 0f), dt * 6f);
    }

    void UpdateCamera(float dt)
    {
        float r = ArenaR + 1.6f;
        float vfov = cam.fieldOfView * Mathf.Deg2Rad;
        float hfov = 2f * Mathf.Atan(Mathf.Tan(vfov * 0.5f) * cam.aspect);
        float dist = r / Mathf.Tan(Mathf.Min(vfov, hfov) * 0.5f) + 1.5f;
        float yaw = 0f;
        if (state == GameState.Menu) { menuOrbit += dt * 10f; yaw = menuOrbit; }
        var rot = Quaternion.Euler(64f, yaw, 0f);
        Vector3 pos = rot * new Vector3(0f, 0f, -dist) + new Vector3(0f, 0.5f, 0f);
        if (shake > 0f) { pos += Random.insideUnitSphere * shake * 0.5f; shake = Mathf.MoveTowards(shake, 0f, dt * 2f); }
        cam.transform.SetPositionAndRotation(pos, rot);
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.95f, 0.2f, 0.55f, 0.97f);
    static readonly Color Dark = new Color(0.04f, 0.03f, 0.1f, 0.84f);
    static readonly Color Gold = new Color(1f, 0.8f, 0.25f, 0.97f);
    static readonly Color Slate = new Color(0.2f, 0.2f, 0.36f, 0.95f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + U(ZoneNames[stages[i].zone]);

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        var bar = new Rect(8f, 8f, w - 16f, 58f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 140f, 24f), "<b>" + StageTitle(stageIdx) + "</b>", 16, new Color(1f, 0.6f, 0.85f));
        string hearts = $"<color=#ff5d8f>{new string('♥', hp)}</color><color=#ffffff33>{new string('♥', MaxHp - hp)}</color>";
        OiyoArcade.Text(new Rect(20f, 36f, w - 140f, 24f), $"{hearts}  {U("Drones")} <b>{kills}/{S.kills}</b>  {U("Score")} <b>{score}</b>", 15, Color.white);
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        OiyoArcade.Bar(new Rect(16f, 70f, w - 32f, 8f), kills / (float)S.kills, new Color(0f, 0f, 0f, 0.35f), Gold);

        if (judgeTimer > 0f && state == GameState.Playing)
        {
            OiyoArcade.Shadowed(new Rect(0f, h * 0.2f, w, 44f), judge, Mathf.RoundToInt(26 + judgeTimer * 14f), judgeColor, TextAnchor.MiddleCenter);
            if (combo >= 3) OiyoArcade.Shadowed(new Rect(0f, h * 0.2f + 40f, w, 28f), F("{0} combo", combo), 17, Color.white, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Playing || state == GameState.Ready)
        {
            bool full = gauge >= 100f;
            var gb = new Rect(w - 120f, h - 132f, 104f, 104f);
            OiyoArcade.Bar(new Rect(72f, h - 34f, w - 206f, 14f), gauge / 100f, new Color(0f, 0f, 0f, 0.45f), full ? new Color(1f, 0.4f, 0.9f) : Cyan);
            OiyoArcade.Shadowed(new Rect(72f, h - 58f, w - 206f, 22f), U("Blade-Dash gauge"), 13, Color.white);
            string label = full ? "<b>" + U("DASH") + "</b>" : $"<b>{Mathf.FloorToInt(gauge)}%</b>";
            if (OiyoArcade.Button(gb, label, full ? new Color(0.9f, 0.2f, 0.7f, 0.97f) : new Color(0.15f, 0.15f, 0.25f, 0.85f), full ? 22 : 18, null, full)) BladeDash();
        }
        if (state == GameState.Ready)
        {
            var r = new Rect(w * 0.5f - 175f, h * 0.55f, 350f, 104f);
            OiyoArcade.Panel(r, Dark);
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 8f, r.width - 24f, r.height - 16f),
                $"<b>{U("Tap or press Space the moment a shot reaches your ring")}</b>\n<size=14>{F("Cut down {0} drones", S.kills)} · {U("Shift or DASH when the gauge is full")}</size>", 16, Color.white, TextAnchor.MiddleCenter);
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
            OiyoArcade.Panel(box, new Color(0.04f, 0.03f, 0.1f, 0.93f));
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
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("Neon Katana 3D"), 30, new Color(0.5f, 1f, 1f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 62f, cw - 40f, 46f), U("Parry at the last instant to send shots back. Fill the gauge, then cut them all down."), 15, new Color(1f, 1f, 1f, 0.85f), TextAnchor.MiddleCenter);
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
        // sized to its buttons so a loss card has no empty band at the bottom
        float ch = 158f + (won ? 58f : 0f) + 52f + 40f + 18f;
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - ch * 0.5f, cw, ch);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 14f, cw, 38f), won ? U("Stage clear!") : U("Game over"), 28, won ? new Color(0.6f, 1f, 0.65f) : new Color(1f, 0.55f, 0.5f), TextAnchor.MiddleCenter);
        string detail = won ? $"<size=30>{OiyoArcade.StarString(stars)}</size>" : endReason;
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 56f, cw - 32f, 44f), detail, 16, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 100f, cw - 32f, 48f),
            $"{U("Score")} <b>{score}</b>   {U("Drones")} <b>{kills}/{S.kills}</b>\n<size=14>{U("PERFECT")} {perfects} · {U("GUARD")} {guards} · {U("Best combo")} {maxCombo}</size>", 16, Color.white, TextAnchor.MiddleCenter);
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
