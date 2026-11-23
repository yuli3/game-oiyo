using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Shadow Dodge 3D: the web Shadow Dodge (src/components/games/ShadowDodge.tsx, src/lib/games/shadow-dodge.ts)
// rebuilt as a 30-stage Unity game. Same rules as the web engine: orbs, seekers and sweepers pour in;
// a near miss inside the graze radius scores, fills Shadow Energy and slows time for a moment;
// a dash gives a short invulnerable burst; full energy fires a Shadow Pulse that clears the arena.
// Move with WASD/arrows or by dragging anywhere (the orb follows your finger's motion, not its
// position, so your thumb never hides it). Space/Shift or double-tap to dash, E or PULSE to pulse.
public class ShadowDodgePlayer : MonoBehaviour
{
    const string Slug = "shadow-dodge";
    const int StageCount = 30;
    const float Half = 6f, HitR = 0.28f, GrazeR = 1.0f, Speed = 6.5f;
    const float DashCd = 2.5f, DashInvuln = 0.4f;
    const int MaxHp = 3;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    enum Kind { Orb, Seeker, Sweeper, Burst }
    struct StageDef { public int zone, grazeGoal; public float seconds, interval, speed; public float[] weights; }
    static readonly string[] ZoneNames = { "Dusk Courtyard", "Lantern Hall", "Hunting Grounds", "Mirror Garden", "Eclipse Shrine", "Void Heart" };
    static readonly Color[] KindColor = { new Color(1f, 0.3f, 0.35f), new Color(0.75f, 0.35f, 1f), new Color(1f, 0.6f, 0.2f), new Color(1f, 0.85f, 0.3f) };
    static readonly Color Spirit = new Color(0.55f, 0.95f, 1f);

    StageDef[] stages;
    int stageIdx;
    StageDef S => stages[stageIdx];

    class Hazard { public Kind kind; public Transform t; public Vector3 vel; public float speed, life, radius; public bool grazed; }
    readonly List<Hazard> hazards = new List<Hazard>();
    readonly List<(Transform t, float timer, Vector3 at)> warnings = new List<(Transform, float, Vector3)>();
    Vector3 pos, target, lastDir = Vector3.forward;
    int hp, grazes, combo, maxCombo, score, stars, pulses;
    float survived, energy, dashCd, invuln, slowTimer, spawnTimer, scoreTick, hitFlash;
    string endReason = "";
    string popup = ""; float popupTimer; Color popupColor;

    Camera cam;
    Transform root, playerT, grazeRing;
    Material playerMat, ringMat;
    readonly Material[] hazardMats = new Material[4];
    Bursts bursts;
    Synth synth;
    bool showStages;
    float menuOrbit, shake, lastTap = -10f;
    int dragId = int.MinValue;
    Vector3 dragStartWorld, dragStartPos;

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
        float[][] w = {
            new[] { 1f, 0f, 0f, 0f }, new[] { 0.75f, 0f, 0.25f, 0f }, new[] { 0.6f, 0.25f, 0.15f, 0f },
            new[] { 0.5f, 0.15f, 0.15f, 0.2f }, new[] { 0.4f, 0.2f, 0.2f, 0.2f }, new[] { 0.3f, 0.25f, 0.2f, 0.25f } };
        for (int i = 0; i < StageCount; i++)
        {
            int zone = i / 5, k = i % 5;
            stages[i] = new StageDef
            {
                zone = zone,
                seconds = 20f + i * 1.4f,
                interval = Mathf.Max(0.32f, 1.05f - i * 0.024f),
                speed = 3.6f + i * 0.09f,
                weights = w[zone],
                grazeGoal = zone >= 4 ? 8 + k * 3 + (zone - 4) * 6 : 0,
            };
        }
    }

    void SetupScene()
    {
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 50f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.02f, 0.02f, 0.05f);
        var key = new GameObject("Key").AddComponent<Light>();
        key.type = LightType.Directional;
        key.intensity = 0.5f;
        key.color = new Color(0.6f, 0.65f, 1f);
        key.transform.rotation = Quaternion.Euler(60f, -20f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.3f, 0.3f, 0.42f);
        for (int k = 0; k < 4; k++) hazardMats[k] = OiyoArcade.Glow(KindColor[k]);
        playerMat = OiyoArcade.Glow(Color.white);
        ringMat = OiyoArcade.Transparent(OiyoArcade.Art("SD/ring"), new Color(Spirit.r, Spirit.g, Spirit.b, 0.5f));
        bursts = new Bursts(transform, 0f);
        synth = new Synth(gameObject);
    }

    void BuildArena()
    {
        var floor = OiyoArcade.Prim(PrimitiveType.Quad, "Floor", OiyoArcade.Lit(Color.white, 0.5f, OiyoArcade.Art("SD/floor")), root);
        floor.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        floor.transform.localScale = new Vector3(Half * 2f + 0.4f, Half * 2f + 0.4f, 1f);
        var outer = OiyoArcade.Prim(PrimitiveType.Quad, "Outer", OiyoArcade.Lit(new Color(0.25f, 0.22f, 0.35f), 0.2f, OiyoArcade.Art("SD/stone", true)), root);
        outer.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        outer.transform.position = new Vector3(0f, -0.3f, 0f);
        outer.transform.localScale = new Vector3(60f, 60f, 1f);
        outer.GetComponent<Renderer>().sharedMaterial.mainTextureScale = new Vector2(12f, 12f);
        var wallMat = OiyoArcade.Glow(new Color(0.45f, 0.3f, 0.9f));
        for (int s = 0; s < 4; s++)
        {
            var wall = OiyoArcade.Prim(PrimitiveType.Cube, "Wall", wallMat, root);
            bool x = s < 2; float sign = s % 2 == 0 ? 1f : -1f;
            wall.transform.position = x ? new Vector3(0f, 0.08f, sign * (Half + 0.25f)) : new Vector3(sign * (Half + 0.25f), 0.08f, 0f);
            wall.transform.localScale = x ? new Vector3(Half * 2f + 0.6f, 0.16f, 0.1f) : new Vector3(0.1f, 0.16f, Half * 2f + 0.6f);
        }
        // lantern posts at the corners
        var post = OiyoArcade.Lit(new Color(0.2f, 0.15f, 0.25f), 0.3f);
        for (int c = 0; c < 4; c++)
        {
            float sx = c % 2 == 0 ? 1f : -1f, sz = c < 2 ? 1f : -1f;
            var p = OiyoArcade.Prim(PrimitiveType.Cylinder, "Post", post, root);
            p.transform.position = new Vector3(sx * (Half + 0.6f), 0.6f, sz * (Half + 0.6f));
            p.transform.localScale = new Vector3(0.3f, 0.6f, 0.3f);
            var lamp = OiyoArcade.Prim(PrimitiveType.Sphere, "Lamp", OiyoArcade.Glow(new Color(1f, 0.75f, 0.4f)), p.transform);
            lamp.transform.localPosition = new Vector3(0f, 1.2f, 0f);
            lamp.transform.localScale = new Vector3(1.4f, 0.7f, 1.4f);
            OiyoArcade.GlowQuad("Halo", new Color(1f, 0.7f, 0.3f, 0.5f), 2.5f, root).transform.position = p.transform.position + Vector3.up * 0.8f;
        }

        playerT = OiyoArcade.Prim(PrimitiveType.Sphere, "Spirit", playerMat, root).transform;
        playerT.localScale = Vector3.one * 0.55f;
        OiyoArcade.GlowQuad("Halo", new Color(Spirit.r, Spirit.g, Spirit.b, 0.7f), 3.2f, playerT).name = "Halo";
        var trail = playerT.gameObject.AddComponent<TrailRenderer>();
        trail.time = 0.35f;
        trail.startWidth = 0.45f;
        trail.endWidth = 0f;
        trail.sharedMaterial = OiyoArcade.Transparent(OiyoArcade.GlowTexture(), new Color(Spirit.r, Spirit.g, Spirit.b, 0.6f));
        trail.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        grazeRing = OiyoArcade.Prim(PrimitiveType.Quad, "GrazeRing", ringMat, root).transform;
        grazeRing.rotation = Quaternion.Euler(90f, 0f, 0f);
        grazeRing.localScale = Vector3.one * GrazeR * 2f;
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Arena").transform;
        hazards.Clear(); warnings.Clear();
        BuildArena();
        pos = target = new Vector3(0f, 0.35f, -1f);
        playerT.position = pos;
        var tr = playerT.GetComponent<TrailRenderer>(); if (tr != null) tr.Clear();
        hp = MaxHp; grazes = combo = maxCombo = score = stars = pulses = 0;
        survived = energy = dashCd = invuln = slowTimer = scoreTick = hitFlash = 0f;
        spawnTimer = 0.8f;
        endReason = ""; popup = "";
        showStages = false;
        state = ready ? GameState.Ready : GameState.Menu;
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("shadow-dodge", state, score);
        float dt = Time.deltaTime;
        ReadInput(dt);
        float world = slowTimer > 0f ? 0.38f : 1f;
        if (state == GameState.Playing)
        {
            slowTimer = Mathf.Max(0f, slowTimer - dt);
            dashCd = Mathf.Max(0f, dashCd - dt);
            invuln = Mathf.Max(0f, invuln - dt);
            survived += dt * world;
            scoreTick += dt * world;
            if (scoreTick >= 1f) { scoreTick -= 1f; score += 10 + stageIdx; }
            MovePlayer(dt);
            Spawn(dt * world);
            StepHazards(dt * world);
            if (state == GameState.Playing && survived >= S.seconds) Finish();
        }
        Animate(dt);
        UpdateCamera(dt);
    }

    Vector3 Ground(Vector2 screen)
    {
        var ray = cam.ScreenPointToRay(screen);
        var plane = new Plane(Vector3.up, new Vector3(0f, 0.35f, 0f));
        return plane.Raycast(ray, out float d) ? ray.GetPoint(d) : pos;
    }

    void ReadInput(float dt)
    {
        bool confirm = Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return);
        var presses = OiyoArcade.Began();
        switch (state)
        {
            case GameState.Ready:
                if (confirm || presses.Count > 0 || Mathf.Abs(Input.GetAxisRaw("Horizontal")) + Mathf.Abs(Input.GetAxisRaw("Vertical")) > 0.1f) state = GameState.Playing;
                if (presses.Count > 0) BeginDrag(presses[0]);
                return;
            case GameState.Playing:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) { state = GameState.Paused; return; }
                if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.LeftShift) || Input.GetKeyDown(KeyCode.RightShift)) Dash();
                if (Input.GetKeyDown(KeyCode.E) || Input.GetKeyDown(KeyCode.Q)) Pulse();
                foreach (var p in presses)
                {
                    if (Time.time - lastTap < 0.3f) Dash();
                    lastTap = Time.time;
                    BeginDrag(p);
                }
                foreach (var p in OiyoArcade.Held())
                    if (p.id == dragId)
                    {
                        var now = Ground(p.pos);
                        // 1.25x: a short thumb stroke crosses the arena on a phone
                        target = dragStartPos + (now - dragStartWorld) * 1.25f;
                    }
                foreach (var p in OiyoArcade.Ended()) if (p.id == dragId) dragId = int.MinValue;
                var k = new Vector3(Input.GetAxisRaw("Horizontal"), 0f, Input.GetAxisRaw("Vertical"));
                if (k.sqrMagnitude > 0.01f)
                {
                    dragId = int.MinValue;
                    target = pos + k.normalized * Speed * dt * 1.0001f;
                    lastDir = k.normalized;
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

    void BeginDrag(OiyoArcade.Press p)
    {
        dragId = p.id;
        dragStartWorld = Ground(p.pos);
        dragStartPos = pos;
        target = pos;
    }

    void MovePlayer(float dt)
    {
        target.x = Mathf.Clamp(target.x, -Half + 0.3f, Half - 0.3f);
        target.z = Mathf.Clamp(target.z, -Half + 0.3f, Half - 0.3f);
        target.y = 0.35f;
        var delta = target - pos;
        float step = Speed * 1.6f * dt;
        if (delta.magnitude > 0.02f) lastDir = delta.normalized;
        pos = delta.magnitude <= step ? target : pos + delta.normalized * step;
        if (dragId == int.MinValue && delta.magnitude <= step) target = pos;
    }

    void Dash()
    {
        if (state != GameState.Playing || dashCd > 0f) return;
        var to = pos + lastDir * 2.4f;
        to.x = Mathf.Clamp(to.x, -Half + 0.3f, Half - 0.3f);
        to.z = Mathf.Clamp(to.z, -Half + 0.3f, Half - 0.3f);
        bursts.Emit(pos, Spirit, 16, 3f, 0.3f);
        pos = target = to;
        dragStartPos = pos;
        if (dragId != int.MinValue)
            foreach (var h in OiyoArcade.Held()) if (h.id == dragId) dragStartWorld = Ground(h.pos);
        dashCd = DashCd;
        invuln = DashInvuln;
        synth.Tone(500f, 0.15f, Wave.Sine, 0.25f, 1200f, 10f);
    }

    void Pulse()
    {
        if (state != GameState.Playing || energy < 100f) return;
        int cleared = hazards.Count;
        foreach (var h in hazards) { bursts.Emit(h.t.position, KindColor[(int)h.kind], 6, 4f, 0.25f); Destroy(h.t.gameObject); }
        hazards.Clear();
        foreach (var w in warnings) if (w.t != null) Destroy(w.t.gameObject);
        warnings.Clear();
        score += cleared * 150 + 500;
        combo += cleared;
        maxCombo = Mathf.Max(maxCombo, combo);
        energy = 0f;
        pulses++;
        shake = 0.4f;
        bursts.Emit(pos, Spirit, 60, 9f, 0.4f, 0.8f);
        Popup(U("SHADOW PULSE!"), Spirit);
        synth.Tone(120f, 0.7f, Wave.Sine, 0.4f, 600f, 3f);
        synth.Tone(80f, 0.5f, Wave.Noise, 0.2f, 0f, 5f);
    }

    void Spawn(float dt)
    {
        spawnTimer -= dt;
        // patterns tighten as the stage clock runs
        float ramp = 1f - Mathf.Clamp01(survived / S.seconds) * 0.3f;
        if (spawnTimer > 0f) return;
        spawnTimer = S.interval * ramp * Random.Range(0.8f, 1.2f);
        float r = Random.value, acc = 0f;
        int kind = 0;
        for (int i = 0; i < 4; i++) { acc += S.weights[i]; if (r <= acc) { kind = i; break; } }
        switch ((Kind)kind)
        {
            case Kind.Orb:
                {
                    var from = EdgePoint();
                    var aim = pos + new Vector3(Random.Range(-1.5f, 1.5f), 0f, Random.Range(-1.5f, 1.5f));
                    AddHazard(Kind.Orb, from, (aim - from).normalized * S.speed);
                    if (S.zone >= 2 && Random.value < 0.4f) AddHazard(Kind.Orb, from, Quaternion.Euler(0f, 18f, 0f) * (aim - from).normalized * S.speed);
                    break;
                }
            case Kind.Seeker:
                AddHazard(Kind.Seeker, EdgePoint(), Vector3.zero);
                break;
            case Kind.Sweeper:
                {
                    int side = Random.Range(0, 4);
                    int count = 7;
                    int gap = Random.Range(1, count - 2);
                    for (int i = 0; i < count; i++)
                    {
                        if (i == gap || i == gap + 1) continue;
                        float t = -Half + (i + 0.5f) * (Half * 2f / count);
                        Vector3 from, vel;
                        float sp = S.speed * 0.75f;
                        if (side == 0) { from = new Vector3(t, 0.35f, Half + 0.8f); vel = Vector3.back * sp; }
                        else if (side == 1) { from = new Vector3(t, 0.35f, -Half - 0.8f); vel = Vector3.forward * sp; }
                        else if (side == 2) { from = new Vector3(Half + 0.8f, 0.35f, t); vel = Vector3.left * sp; }
                        else { from = new Vector3(-Half - 0.8f, 0.35f, t); vel = Vector3.right * sp; }
                        AddHazard(Kind.Sweeper, from, vel);
                    }
                    break;
                }
            case Kind.Burst:
                {
                    var at = new Vector3(Random.Range(-Half + 1f, Half - 1f), 0.35f, Random.Range(-Half + 1f, Half - 1f));
                    if ((at - pos).magnitude < 3f) at = -at;
                    var w = OiyoArcade.GlowQuad("Warn", new Color(1f, 0.85f, 0.3f, 0.6f), 1.6f, root).transform;
                    w.position = at + Vector3.up * 0.05f;
                    w.rotation = Quaternion.Euler(90f, 0f, 0f);
                    warnings.Add((w, 0.75f, at));
                    synth.Tone(900f, 0.1f, Wave.Triangle, 0.12f, 0f, 15f);
                    break;
                }
        }
    }

    Vector3 EdgePoint()
    {
        int side = Random.Range(0, 4);
        float t = Random.Range(-Half, Half);
        float e = Half + 0.8f;
        return side switch { 0 => new Vector3(t, 0.35f, e), 1 => new Vector3(t, 0.35f, -e), 2 => new Vector3(e, 0.35f, t), _ => new Vector3(-e, 0.35f, t) };
    }

    void AddHazard(Kind kind, Vector3 from, Vector3 vel)
    {
        var go = OiyoArcade.Prim(PrimitiveType.Sphere, kind.ToString(), hazardMats[(int)kind], root);
        float radius = kind == Kind.Seeker ? 0.32f : 0.24f;
        go.transform.localScale = Vector3.one * radius * 2f;
        go.transform.position = from;
        var c = KindColor[(int)kind];
        var halo = OiyoArcade.GlowQuad("Halo", new Color(c.r, c.g, c.b, 0.55f), 2.6f, go.transform);
        hazards.Add(new Hazard { kind = kind, t = go.transform, vel = vel, speed = S.speed * (kind == Kind.Seeker ? 0.55f : 1f), life = kind == Kind.Seeker ? 5.5f : 30f, radius = radius });
    }

    void StepHazards(float dt)
    {
        for (int i = warnings.Count - 1; i >= 0; i--)
        {
            var (t, timer, at) = warnings[i];
            timer -= dt;
            if (timer <= 0f)
            {
                int n = S.zone >= 5 ? 14 : 10;
                float off = Random.value * 360f;
                for (int k = 0; k < n; k++)
                    AddHazard(Kind.Burst, at, Quaternion.Euler(0f, off + k * 360f / n, 0f) * Vector3.forward * S.speed * 0.7f);
                Destroy(t.gameObject);
                warnings.RemoveAt(i);
                continue;
            }
            t.localScale = Vector3.one * (1.6f + Mathf.Sin(timer * 30f) * 0.2f);
            warnings[i] = (t, timer, at);
        }
        for (int i = hazards.Count - 1; i >= 0; i--)
        {
            var h = hazards[i];
            h.life -= dt;
            if (h.kind == Kind.Seeker)
            {
                var want = (pos - h.t.position); want.y = 0f;
                var dir = h.vel.sqrMagnitude > 0.001f ? h.vel.normalized : want.normalized;
                dir = Vector3.RotateTowards(dir, want.normalized, 1.6f * dt, 0f);
                h.vel = dir * h.speed;
            }
            h.t.position += h.vel * dt;
            var p = h.t.position;
            if (h.life <= 0f || Mathf.Abs(p.x) > Half + 2f || Mathf.Abs(p.z) > Half + 2f)
            {
                Destroy(h.t.gameObject);
                hazards.RemoveAt(i);
                continue;
            }
            float d = Vector3.Distance(new Vector3(p.x, 0f, p.z), new Vector3(pos.x, 0f, pos.z));
            if (d <= HitR + h.radius)
            {
                if (invuln <= 0f) { TakeHit(); }
                bursts.Emit(p, KindColor[(int)h.kind], 12, 3f, 0.25f);
                Destroy(h.t.gameObject);
                hazards.RemoveAt(i);
                if (state != GameState.Playing) return;
                continue;
            }
            if (!h.grazed && d <= GrazeR + h.radius && invuln <= 0f)
            {
                h.grazed = true;
                grazes++;
                combo++;
                maxCombo = Mathf.Max(maxCombo, combo);
                score += 120 + combo * 30;
                energy = Mathf.Min(100f, energy + 18f);
                slowTimer = 0.35f;
                bursts.Emit((p + pos) * 0.5f, Color.white, 6, 2f, 0.2f, 0.35f);
                Popup(F("GRAZE x{0}", combo), Spirit);
                synth.Tone(1500f + Mathf.Min(combo, 20) * 40f, 0.06f, Wave.Triangle, 0.15f, 0f, 25f);
            }
        }
    }

    void TakeHit()
    {
        hp--;
        combo = 0;
        invuln = 1.2f;
        hitFlash = 1f;
        shake = 0.5f;
        synth.Tone(150f, 0.35f, Wave.Saw, 0.3f, 60f, 6f);
        Popup(U("HIT!"), new Color(1f, 0.4f, 0.4f));
        if (hp <= 0)
        {
            endReason = U("The shadows caught you!");
            state = GameState.GameOver;
            bursts.Emit(pos, Spirit, 50, 6f, 0.4f);
        }
    }

    void Finish()
    {
        if (grazes < S.grazeGoal)
        {
            endReason = F("You survived, but needed {0} grazes", S.grazeGoal);
            state = GameState.GameOver;
            synth.Tone(260f, 0.4f, Wave.Saw, 0.25f, 120f, 4f);
            return;
        }
        state = GameState.Victory;
        score += hp * 300;
        stars = 1 + (hp >= 2 ? 1 : 0) + (hp >= MaxHp ? 1 : 0);
        OiyoArcade.Record(Slug, stageIdx, stars, score, StageCount);
        foreach (var h in hazards) { bursts.Emit(h.t.position, KindColor[(int)h.kind], 4, 3f, 0.2f); Destroy(h.t.gameObject); }
        hazards.Clear();
        StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
    }

    void Popup(string t, Color c) { popup = t; popupColor = c; popupTimer = 0.5f; }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.2f, Wave.Triangle, 0.3f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void Animate(float dt)
    {
        popupTimer -= dt;
        if (playerT == null) return;
        playerT.position = pos + Vector3.up * Mathf.Sin(Time.time * 4f) * 0.05f;
        bool blink = invuln > 0f && Mathf.Repeat(Time.time * 12f, 1f) < 0.5f;
        playerMat.color = Color.Lerp(blink ? new Color(1f, 1f, 1f, 1f) * 0.5f : Color.white, new Color(1f, 0.3f, 0.3f), hitFlash);
        hitFlash = Mathf.MoveTowards(hitFlash, 0f, dt * 3f);
        grazeRing.position = pos + Vector3.down * 0.3f;
        ringMat.color = new Color(Spirit.r, Spirit.g, Spirit.b, slowTimer > 0f ? 0.9f : 0.35f);
        foreach (var r in root.GetComponentsInChildren<Transform>())
            if (r.name == "Halo") r.rotation = cam.transform.rotation;
    }

    void UpdateCamera(float dt)
    {
        float r = Half + 0.9f;
        float vfov = cam.fieldOfView * Mathf.Deg2Rad;
        float hfov = 2f * Mathf.Atan(Mathf.Tan(vfov * 0.5f) * cam.aspect);
        float dist = r / Mathf.Tan(Mathf.Min(vfov, hfov) * 0.5f) * 1.02f + 1f;
        float yaw = 0f;
        if (state == GameState.Menu) { menuOrbit += dt * 8f; yaw = Mathf.Sin(menuOrbit * 0.05f) * 30f; }
        var rot = Quaternion.Euler(68f, yaw, 0f);
        Vector3 p = rot * new Vector3(0f, 0f, -dist) + new Vector3(0f, 0f, cam.aspect < 1f ? -0.8f : 0f);
        if (shake > 0f) { p += Random.insideUnitSphere * shake * 0.5f; shake = Mathf.MoveTowards(shake, 0f, dt * 2f); }
        cam.transform.SetPositionAndRotation(p, rot);
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.4f, 0.3f, 0.95f, 0.97f);
    static readonly Color Dark = new Color(0.03f, 0.03f, 0.08f, 0.84f);
    static readonly Color Gold = new Color(1f, 0.8f, 0.25f, 0.97f);
    static readonly Color Slate = new Color(0.2f, 0.2f, 0.34f, 0.95f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + U(ZoneNames[stages[i].zone]);
    string GoalText()
    {
        string g = F("Survive {0} seconds", Mathf.RoundToInt(S.seconds));
        if (S.grazeGoal > 0) g += " · " + F("graze {0} times", S.grazeGoal);
        return g;
    }

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        var bar = new Rect(8f, 8f, w - 16f, 58f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 140f, 24f), "<b>" + StageTitle(stageIdx) + "</b>", 16, new Color(0.7f, 0.8f, 1f));
        string hearts = $"<color=#9ff3ff>{new string('♥', Mathf.Max(0, hp))}</color><color=#ffffff33>{new string('♥', MaxHp - Mathf.Max(0, hp))}</color>";
        string g = S.grazeGoal > 0 ? $"{U("Grazes")} <b>{grazes}/{S.grazeGoal}</b>" : $"{U("Grazes")} <b>{grazes}</b>";
        OiyoArcade.Text(new Rect(20f, 36f, w - 140f, 24f), $"{hearts}  {U("Time")} <b>{Mathf.CeilToInt(Mathf.Max(0f, S.seconds - survived))}s</b>  {g}  {U("Score")} <b>{score}</b>", 14, Color.white);
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        OiyoArcade.Bar(new Rect(16f, 70f, w - 32f, 8f), survived / S.seconds, new Color(0f, 0f, 0f, 0.35f), Gold);

        if (popupTimer > 0f && state == GameState.Playing)
            OiyoArcade.Shadowed(new Rect(0f, 86f, w, 36f), popup, Mathf.RoundToInt(20 + popupTimer * 12f), popupColor, TextAnchor.MiddleCenter);

        if (state == GameState.Playing || state == GameState.Ready)
        {
            bool full = energy >= 100f;
            OiyoArcade.Shadowed(new Rect(72f, h - 58f, w - 206f, 22f), U("Shadow energy") + (dashCd > 0f ? $"   <color=#ffffff88>{U("Dash")} {dashCd:0.0}s</color>" : $"   <color=#9ff3ff>{U("Dash ready")}</color>"), 13, Color.white);
            OiyoArcade.Bar(new Rect(72f, h - 34f, w - 206f, 14f), energy / 100f, new Color(0f, 0f, 0f, 0.45f), full ? new Color(0.7f, 0.5f, 1f) : Spirit);
            if (OiyoArcade.Button(new Rect(w - 120f, h - 132f, 104f, 104f), full ? "<b>" + U("PULSE") + "</b>" : $"<b>{Mathf.FloorToInt(energy)}%</b>", full ? new Color(0.55f, 0.3f, 0.95f, 0.97f) : new Color(0.15f, 0.15f, 0.25f, 0.85f), full ? 20 : 18, null, full)) Pulse();
        }
        if (state == GameState.Ready)
        {
            var r = new Rect(w * 0.5f - 175f, h * 0.58f, 350f, 104f);
            OiyoArcade.Panel(r, Dark);
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 8f, r.width - 24f, r.height - 16f),
                $"<b>{U("Drag anywhere or use the arrow keys to move")}</b>\n<size=14>{GoalText()} · {U("double-tap or Space to dash")}</size>", 16, Color.white, TextAnchor.MiddleCenter);
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
            OiyoArcade.Panel(box, new Color(0.03f, 0.03f, 0.08f, 0.93f));
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
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("Shadow Dodge 3D"), 30, new Color(0.7f, 0.85f, 1f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 62f, cw - 40f, 46f), U("Brush past the shadow orbs to slow time and charge a pulse. Just don't touch them."), 15, new Color(1f, 1f, 1f, 0.85f), TextAnchor.MiddleCenter);
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
            $"{U("Score")} <b>{score}</b>   {U("Grazes")} <b>{grazes}</b>\n<size=14>{U("Best combo")} {maxCombo} · {U("Pulses")} {pulses}</size>", 16, Color.white, TextAnchor.MiddleCenter);
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
