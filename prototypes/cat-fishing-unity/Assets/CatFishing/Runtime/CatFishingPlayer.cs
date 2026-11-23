using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Cat Fishing 3D: the web Cat Fishing (src/components/games/CatFishing.tsx, src/lib/games/cat-fishing.ts)
// rebuilt in Unity. The fish rules are the web's: positions and headings in % of the pond, a heading
// clamp to the base speed, a random new heading with turnChance per 60 Hz frame, x/y bounced off the
// 2..94 / 2..92 walls, fish pushed away from the paw inside escapeDistance, and a strike that catches
// the nearest uncaught fish within 9.5 % (vertical distance x 0.75). The ice laser freezes every fish
// for 3 s. The web's three difficulties become 30 ponds that grow from 5 slow koi to 14 fast, shy koi,
// with a golden koi from pond 7 and puffers you must not touch from pond 10 (a puffer strike costs 3 s).
// Clear a pond by catching every koi before the clock runs out; stars for the time it took.
public class CatFishingPlayer : MonoBehaviour
{
    const string Slug = "cat-fishing";
    const int StageCount = 30;
    const float PW = 12f, PH = 9f;          // pond size in world units (x% across PW, y% across PH)
    const float HitRadius = 9.5f;           // the web's strike radius, in %
    const float FreezeTime = 3f, PufferPenalty = 3f;
    const int StoneCount = 64;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Stage table ----------------
    struct Pond { public int fish, puffers; public float speed, turn, escape, limit, par3, par2; public bool golden; }
    static Pond PondFor(int i)
    {
        var p = new Pond();
        p.fish = 5 + Mathf.RoundToInt(i * 9f / 29f);
        p.speed = 1.6f + i * 0.06f;
        p.turn = 0.02f + i * 0.0007f;
        p.escape = i < 4 ? 0f : Mathf.Min(30f, 16f + (i - 4) * 0.6f);
        p.puffers = i < 9 ? 0 : 1 + (i - 9) / 7;
        p.golden = i >= 6;
        p.limit = 12f + p.fish * 4.5f;
        p.par3 = p.fish * (2.0f + (p.escape > 0f ? 0.9f : 0f)) + p.puffers * 0.6f;
        p.par2 = p.par3 * 1.7f;
        return p;
    }

    class Fish
    {
        public float x, y, vx, vy; public bool caught, puffer, golden; public int coat;
        public Transform t, body, shadow; public float wiggle, puff, fly; public Vector3 flyFrom;
    }

    int stageIdx;
    Pond pond;
    readonly List<Fish> fish = new List<Fish>();
    System.Random rng;
    float elapsed, frozen, comboT, msgT;
    int score, combo, bestCombo, starsWon, misses, pufferHits, freezeLeft, caughtCount;
    string msg = "";
    Vector2 pointerPct = new Vector2(-1000f, -1000f);

    Camera cam;
    Transform root;
    Material waterMat;
    Material[] koiMats;
    Material goldMat, pufferMat, pawMat, shadowMat, lilyMat, flowerMat;
    Transform paw; float pawT; Vector3 pawAt;
    readonly List<Transform> rings = new List<Transform>();
    readonly List<float> ringT = new List<float>();
    Bursts bursts;
    Synth synth;
    bool showStages;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 35f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.36f, 0.6f, 0.34f);
        var sun = new GameObject("Sun").AddComponent<Light>();
        sun.type = LightType.Directional; sun.intensity = 1f;
        sun.transform.rotation = Quaternion.Euler(35f, -25f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.62f, 0.64f, 0.62f);
        bursts = new Bursts(transform, 0.9f);
        synth = new Synth(gameObject);
        koiMats = new Material[4];
        for (int k = 0; k < 4; k++) koiMats[k] = OiyoArcade.Transparent(OiyoArcade.Art("CF/koi" + k), Color.white);
        goldMat = OiyoArcade.Transparent(OiyoArcade.Art("CF/koigold"), Color.white);
        pufferMat = OiyoArcade.Transparent(OiyoArcade.Art("CF/puffer"), Color.white);
        pawMat = OiyoArcade.Transparent(OiyoArcade.Art("CF/paw"), Color.white);
        lilyMat = OiyoArcade.Transparent(OiyoArcade.Art("CF/lily"), Color.white);
        flowerMat = OiyoArcade.Transparent(OiyoArcade.Art("CF/flower"), Color.white);
        shadowMat = OiyoArcade.Transparent(OiyoArcade.GlowTexture(), new Color(0f, 0.05f, 0.08f, 0.45f));
        waterMat = OiyoArcade.Textured(OiyoArcade.Art("CF/water"));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        LoadStage(stageIdx, false);
    }

    // ---------------- Pond space <-> world ----------------
    bool portrait;
    Vector3 W(float x, float y, float z)
    {
        return portrait
            ? new Vector3((y - 50f) / 100f * PH, (50f - x) / 100f * PW, z)
            : new Vector3((x - 50f) / 100f * PW, (50f - y) / 100f * PH, z);
    }
    Vector2 Dir(float vx, float vy) => portrait ? new Vector2(vy * PH, -vx * PW) : new Vector2(vx * PW, -vy * PH);
    bool ToPond(Vector2 screen, out Vector2 pct)
    {
        pct = default;
        var ray = cam.ScreenPointToRay(screen);
        if (Mathf.Abs(ray.direction.z) < 1e-4f) return false;
        float t = (0.15f - ray.origin.z) / ray.direction.z;
        var p = ray.origin + ray.direction * t;
        pct = portrait ? new Vector2(50f - p.y / PW * 100f, p.x / PH * 100f + 50f) : new Vector2(p.x / PW * 100f + 50f, 50f - p.y / PH * 100f);
        return true;
    }

    // ---------------- Stage ----------------
    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Pond").transform;
        rings.Clear(); ringT.Clear();
        pond = PondFor(stageIdx);
        rng = new System.Random(20261123 + stageIdx * 7919);
        elapsed = 0f; frozen = 0f; comboT = 0f; msgT = 0f;
        score = combo = bestCombo = starsWon = misses = pufferHits = caughtCount = 0;
        freezeLeft = 1;
        pointerPct = new Vector2(-1000f, -1000f);
        showStages = false;
        portrait = cam.aspect < 1f;
        fish.Clear();
        int total = pond.fish + pond.puffers;
        for (int i = 0; i < total; i++)
        {
            // createFish: 10..90 % start, random heading at base speed
            double a = rng.NextDouble() * Mathf.PI * 2;
            var f = new Fish
            {
                x = 10f + (float)rng.NextDouble() * 80f,
                y = 10f + (float)rng.NextDouble() * 80f,
                puffer = i >= pond.fish,
                golden = pond.golden && i == 0,
                coat = i % 4,
                wiggle = (float)rng.NextDouble() * 6f,
            };
            float sp = Speed(f);
            f.vx = Mathf.Cos((float)a) * sp; f.vy = Mathf.Sin((float)a) * sp;
            fish.Add(f);
        }
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        UpdateCamera();
    }

    float Speed(Fish f) => pond.speed * (f.golden ? 1.3f : f.puffer ? 0.7f : 1f);

    void BuildScene()
    {
        var water = OiyoArcade.Prim(PrimitiveType.Quad, "Water", waterMat, root);
        water.name = "Water";
        // stone rim
        var stoneMat = OiyoArcade.Lit(Color.white, 0.2f, OiyoArcade.Art("CF/stone", true));
        var rs = new System.Random(stageIdx * 31 + 7);
        for (int i = 0; i < StoneCount; i++)
        {
            var s = OiyoArcade.Prim(PrimitiveType.Sphere, "Stone", stoneMat, root);
            s.transform.localScale = new Vector3(0.9f + (float)rs.NextDouble() * 0.6f, 0.8f + (float)rs.NextDouble() * 0.5f, 0.6f);
            s.name = "Stone" + i;
        }
        // lily pads float above the fish and hide them a little
        int pads = 3 + stageIdx / 6;
        for (int i = 0; i < pads; i++)
        {
            var pad = OiyoArcade.Prim(PrimitiveType.Quad, "Lily" + i, lilyMat, root);
            pad.transform.localScale = Vector3.one * (1.3f + (float)rs.NextDouble() * 0.9f);
            pad.transform.localRotation = Quaternion.Euler(0f, 0f, (float)rs.NextDouble() * 360f);
            if (i % 2 == 0)
            {
                var fl = OiyoArcade.Prim(PrimitiveType.Quad, "Flower", flowerMat, pad.transform);
                fl.transform.localPosition = new Vector3(0.12f, 0.08f, -0.02f);
                fl.transform.localScale = Vector3.one * 0.34f;
            }
        }
        foreach (var f in fish)
        {
            f.t = new GameObject("Fish").transform; f.t.SetParent(root, false);
            var body = OiyoArcade.Prim(PrimitiveType.Quad, "Body", f.puffer ? pufferMat : f.golden ? goldMat : koiMats[f.coat], f.t);
            f.body = body.transform;
            f.body.localScale = f.puffer ? new Vector3(1.05f, 1.05f, 1f) : new Vector3(1.7f, 0.85f, 1f);
            var sh = OiyoArcade.Prim(PrimitiveType.Quad, "Shadow", shadowMat, root);
            f.shadow = sh.transform;
            f.shadow.localScale = f.puffer ? new Vector3(1.1f, 1.1f, 1f) : new Vector3(1.8f, 0.9f, 1f);
        }
        paw = OiyoArcade.Prim(PrimitiveType.Quad, "Paw", pawMat, root).transform;
        paw.localScale = Vector3.one * 1.6f;
        paw.gameObject.SetActive(false);
        LayoutScene();
    }

    // Places everything that depends on portrait/landscape (called when the screen turns).
    void LayoutScene()
    {
        var water = root.Find("Water");
        water.position = new Vector3(0f, 0f, 0.3f);
        water.localScale = portrait ? new Vector3(PH, PW, 1f) : new Vector3(PW, PH, 1f);
        var rs = new System.Random(stageIdx * 31 + 7);
        float hw = (portrait ? PH : PW) * 0.5f + 0.45f, hh = (portrait ? PW : PH) * 0.5f + 0.45f;
        float per = 4f * (hw + hh);
        for (int i = 0; i < StoneCount; i++)
        {
            var s = root.Find("Stone" + i); if (s == null) continue;
            float d = (i + (float)rs.NextDouble() * 0.4f) / StoneCount * per;
            Vector3 p;
            if (d < 2f * hw) p = new Vector3(-hw + d, hh, 0.2f);
            else if (d < 2f * hw + 2f * hh) p = new Vector3(hw, hh - (d - 2f * hw), 0.2f);
            else if (d < 4f * hw + 2f * hh) p = new Vector3(hw - (d - 2f * hw - 2f * hh), -hh, 0.2f);
            else p = new Vector3(-hw, -hh + (d - 4f * hw - 2f * hh), 0.2f);
            s.position = p;
        }
        int pads = 3 + stageIdx / 6;
        var pr = new System.Random(stageIdx * 53 + 3);
        for (int i = 0; i < pads; i++)
        {
            var pad = root.Find("Lily" + i); if (pad == null) continue;
            // pads sit near the edges so the middle of the pond stays readable
            float px = (float)pr.NextDouble() < 0.5f ? 8f + (float)pr.NextDouble() * 18f : 74f + (float)pr.NextDouble() * 18f;
            float py = 8f + (float)pr.NextDouble() * 84f;
            pad.position = W(px, py, 0.02f);
        }
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("cat-fishing", state, score);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        bool nowPortrait = cam.aspect < 1f;
        if (nowPortrait != portrait) { portrait = nowPortrait; LayoutScene(); }
        ReadInput();
        if (state == GameState.Playing)
        {
            elapsed += dt;
            comboT = Mathf.Max(0f, comboT - dt);
            if (comboT <= 0f) combo = 0;
            if (frozen > 0f) frozen = Mathf.Max(0f, frozen - dt);
            else StepFish(dt);
            if (elapsed >= pond.limit) End(false);
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
        UpdateCamera();
    }

    // stepFish from the web, one call per frame with deltaScale = dt * 60
    void StepFish(float dt)
    {
        float ds = dt * 60f;
        foreach (var f in fish)
        {
            if (f.caught) continue;
            float x = f.x, y = f.y, vx = f.vx, vy = f.vy;
            float baseSpeed = Speed(f);
            if (pond.escape > 0f && !f.puffer)
            {
                float dx = x - pointerPct.x, dy = y - pointerPct.y;
                float dist = Mathf.Sqrt(dx * dx + dy * dy);
                if (dist > 0f && dist < pond.escape)
                {
                    float m = (pond.escape - dist) / pond.escape * 0.9f;
                    vx += dx / dist * m; vy += dy / dist * m;
                }
            }
            float speed = Mathf.Sqrt(vx * vx + vy * vy);
            if (speed > baseSpeed) { vx = vx / speed * baseSpeed; vy = vy / speed * baseSpeed; }
            if (rng.NextDouble() < pond.turn * ds)
            {
                float a = (float)(rng.NextDouble() * Mathf.PI * 2);
                vx = Mathf.Cos(a) * baseSpeed; vy = Mathf.Sin(a) * baseSpeed;
            }
            x += vx * 0.4f * ds; y += vy * 0.4f * ds;
            if (x < 2f || x > 94f) { vx = -vx; x = Mathf.Clamp(x, 2f, 94f); }
            if (y < 2f || y > 92f) { vy = -vy; y = Mathf.Clamp(y, 2f, 92f); }
            f.x = x; f.y = y; f.vx = vx; f.vy = vy;
        }
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
                    // fish shy away from a hovering mouse on a computer, and from the last touch on a phone
                    if (!Application.isMobilePlatform && Input.touchCount == 0 && ToPond(Input.mousePosition, out var hover)) pointerPct = hover;
                    foreach (var h in OiyoArcade.Held()) if (ToPond(h.pos, out var hp)) pointerPct = hp;
                    var began = OiyoArcade.Began();
                    bool freezeKey = Input.GetKeyDown(KeyCode.F) || Input.GetKeyDown(KeyCode.Space);
                    if (state == GameState.Ready && (began.Count > 0 || (Input.anyKeyDown && !freezeKey))) state = GameState.Playing;
                    if (state == GameState.Playing && freezeKey) Freeze();
                    if (state != GameState.Playing) return;
                    foreach (var b in began)
                        if (ToPond(b.pos, out var pct)) Strike(pct);
                    return;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm && ResultLive) LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                return;
            case GameState.Menu:
                if (!showStages && (confirm || Input.GetKeyDown(KeyCode.Space))) LoadStage(stageIdx);
                return;
        }
    }

    void Freeze()
    {
        if (freezeLeft <= 0 || frozen > 0f || state != GameState.Playing) return;
        freezeLeft--;
        frozen = FreezeTime;
        Toast(U("Ice laser! Every fish is frozen for 3 s"));
        synth.Tone(1400f, 0.35f, Wave.Triangle, 0.14f, 600f, 5f);
        foreach (var f in fish) if (!f.caught) bursts.Emit(W(f.x, f.y, 0.05f), new Color(0.7f, 0.95f, 1f), 6, 2f, 0.25f, 0.5f);
    }

    // handleCanvasPointerDown from the web: nearest uncaught fish within 9.5 %, vertical distance x 0.75
    void Strike(Vector2 pct)
    {
        pointerPct = pct;
        pawAt = W(pct.x, pct.y, -0.2f); pawT = 0.28f;
        Fish hit = null; float best = float.MaxValue;
        foreach (var f in fish)
        {
            if (f.caught) continue;
            float dx = f.x - pct.x, dy = (f.y - pct.y) * 0.75f;
            float d = Mathf.Sqrt(dx * dx + dy * dy);
            if (d <= HitRadius && d < best) { best = d; hit = f; }
        }
        Ring(pct, hit == null ? new Color(0.7f, 0.95f, 1f, 0.5f) : new Color(1f, 0.95f, 0.6f, 0.7f));
        if (hit == null)
        {
            misses++;
            synth.Tone(210f, 0.12f, Wave.Sine, 0.12f, 120f, 14f);
            bursts.Emit(W(pct.x, pct.y, 0.1f), new Color(0.75f, 0.95f, 1f), 8, 2.6f, 0.18f, 0.4f, new Vector3(0f, 0f, -2f));
            return;
        }
        if (hit.puffer)
        {
            // a puffer puffs up, stings the paw and costs time; it stays in the pond
            pufferHits++;
            elapsed += PufferPenalty;
            combo = 0; comboT = 0f;
            hit.puff = 0.6f;
            Toast(F("Ouch! A puffer: -{0} s", (int)PufferPenalty));
            synth.Tone(160f, 0.3f, Wave.Square, 0.14f, 90f, 6f);
            bursts.Emit(W(hit.x, hit.y, 0f), new Color(1f, 0.85f, 0.4f), 14, 3.5f, 0.2f, 0.5f);
            return;
        }
        hit.caught = true; caughtCount++;
        combo = comboT > 0f ? combo + 1 : 1;
        comboT = 1.6f;
        bestCombo = Mathf.Max(bestCombo, combo);
        int pts = (hit.golden ? 300 : 100) * (1 + (combo - 1) / 2);
        score += pts;
        hit.fly = 0f; hit.flyFrom = W(hit.x, hit.y, 0.1f);
        bursts.Emit(hit.flyFrom, new Color(0.8f, 0.97f, 1f), 18, 4.5f, 0.24f, 0.55f, new Vector3(0f, 0f, -3f));
        if (hit.golden) bursts.Emit(hit.flyFrom, new Color(1f, 0.85f, 0.3f), 20, 5f, 0.25f, 0.7f);
        synth.Tone(660f + Mathf.Min(combo, 8) * 70f, 0.12f, Wave.Triangle, 0.18f, 990f + Mathf.Min(combo, 8) * 70f, 9f);
        if (combo >= 2) Toast(F("{0} in a row!", combo) + $"  +{pts}");
        else Toast($"+{pts}");
        if (caughtCount >= pond.fish) End(true);
    }

    void Ring(Vector2 pct, Color c)
    {
        Transform r = null; int idx = -1;
        for (int i = 0; i < rings.Count; i++) if (ringT[i] <= 0f) { r = rings[i]; idx = i; break; }
        if (r == null)
        {
            r = OiyoArcade.GlowQuad("Ring", c, 1f, root).transform;
            rings.Add(r); ringT.Add(0f); idx = rings.Count - 1;
        }
        r.gameObject.SetActive(true);
        r.position = W(pct.x, pct.y, 0.25f);
        r.GetComponent<Renderer>().material.color = c;
        ringT[idx] = 0.5f;
    }

    void Toast(string s) { msg = s; msgT = 1.3f; }

    float endTime;
    // the tap that catches the last koi must not also press a result button under the finger
    bool ResultLive => Time.unscaledTime - endTime > 0.45f;

    void End(bool won)
    {
        if (state != GameState.Playing) return;
        endTime = Time.unscaledTime;
        if (won)
        {
            float t = elapsed;
            starsWon = t <= pond.par3 ? 3 : t <= pond.par2 ? 2 : 1;
            score += Mathf.RoundToInt(Mathf.Max(0f, pond.limit - t) * 10f);
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, score, StageCount);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
        }
        else
        {
            state = GameState.GameOver;
            synth.Tone(220f, 0.6f, Wave.Triangle, 0.2f, 110f, 3f);
        }
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.18f, Wave.Triangle, 0.22f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void Animate(float dt)
    {
        foreach (var f in fish)
        {
            if (f.t == null) continue;
            if (f.caught)
            {
                // flung out of the pond towards the cat's basket in the top corner
                f.fly += dt;
                float k = Mathf.Clamp01(f.fly / 0.6f);
                var to = new Vector3((portrait ? PH : PW) * 0.5f + 1f, (portrait ? PW : PH) * 0.5f + 2.5f, -1f);
                var p = Vector3.Lerp(f.flyFrom, to, k) + new Vector3(0f, 0f, -Mathf.Sin(k * Mathf.PI) * 3f);
                f.t.position = p;
                f.t.localRotation = Quaternion.Euler(0f, 0f, f.fly * 720f);
                f.t.localScale = Vector3.one * (1f - k * 0.6f);
                f.shadow.gameObject.SetActive(false);
                if (k >= 1f) f.t.gameObject.SetActive(false);
                continue;
            }
            var pos = W(f.x, f.y, 0.15f);
            f.t.position = pos;
            var d = Dir(f.vx, f.vy);
            float ang = Mathf.Atan2(d.y, d.x) * Mathf.Rad2Deg;
            bool still = frozen > 0f && state == GameState.Playing;
            if (!still) f.wiggle += dt * (6f + pond.speed * 2f);
            float sway = f.puffer ? 0f : Mathf.Sin(f.wiggle) * 9f;
            f.t.localRotation = Quaternion.Euler(0f, 0f, f.puffer ? 0f : ang + sway);
            f.puff = Mathf.Max(0f, f.puff - dt);
            float s = f.puffer ? 1f + f.puff * 0.9f + Mathf.Sin(f.wiggle * 0.5f) * 0.04f : 1f;
            f.t.localScale = Vector3.one * s;
            f.body.localPosition = still ? new Vector3(Mathf.Sin(Time.time * 40f + f.wiggle) * 0.03f, 0f, 0f) : Vector3.zero;
            f.shadow.position = pos + new Vector3(0.18f, -0.22f, 0.13f);
            f.shadow.localRotation = f.t.localRotation;
        }
        // paw strike: drops onto the water and lifts away
        pawT = Mathf.Max(0f, pawT - dt);
        paw.gameObject.SetActive(pawT > 0f);
        if (pawT > 0f)
        {
            float k = 1f - pawT / 0.28f;
            float drop = k < 0.35f ? 1f - k / 0.35f : (k - 0.35f) / 0.65f;
            paw.position = pawAt + new Vector3(0f, 0.4f, -drop * 2.2f);
            paw.localScale = Vector3.one * (1.5f + drop * 0.4f);
        }
        for (int i = 0; i < rings.Count; i++)
        {
            if (ringT[i] <= 0f) { rings[i].gameObject.SetActive(false); continue; }
            ringT[i] -= dt;
            float k = 1f - ringT[i] / 0.5f;
            rings[i].localScale = Vector3.one * (0.6f + k * 2.6f);
            var c = rings[i].GetComponent<Renderer>().material.color; c.a = 0.6f * (1f - k);
            rings[i].GetComponent<Renderer>().material.color = c;
        }
        cam.backgroundColor = Color.Lerp(cam.backgroundColor, frozen > 0f && state == GameState.Playing ? new Color(0.62f, 0.82f, 0.92f) : new Color(0.36f, 0.6f, 0.34f), dt * 4f);
    }

    void UpdateCamera()
    {
        // fit the pond and rim with room for the HUD at the top and the ice button below
        float needW = (portrait ? PH : PW) + 1.8f, needH = (portrait ? PW : PH) + 1.8f + (portrait ? 5.2f : 3.4f);
        float halfV = cam.fieldOfView * 0.5f * Mathf.Deg2Rad;
        float distH = needH * 0.5f / Mathf.Tan(halfV);
        float distW = needW * 0.5f / (Mathf.Tan(halfV) * cam.aspect);
        float dist = Mathf.Max(distH, distW);
        cam.transform.position = new Vector3(0f, portrait ? 1.1f : 0.9f, -dist);
        cam.transform.rotation = Quaternion.identity;
    }

    // ?oiyotest=1 prints the run state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.1f;
        Debug.Log("OIYOTEST " + TestState());
    }
    string TestState()
    {
        var sb = new System.Text.StringBuilder();
        foreach (var f in fish)
        {
            if (f.caught) continue;
            var s = cam.WorldToScreenPoint(W(f.x, f.y, 0.15f));
            var s2 = cam.WorldToScreenPoint(W(f.x + f.vx * 24f, f.y + f.vy * 24f, 0.15f)); // where it will be in 1 s at 60 Hz
            if (sb.Length > 0) sb.Append(',');
            sb.Append($"[{s.x:F0},{s.y:F0},{s2.x:F0},{s2.y:F0},{(f.puffer ? 1 : 0)}]");
        }
        return $"{{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"score\":{score},\"t\":{elapsed:F1},\"left\":{pond.fish - caughtCount},\"frozen\":{frozen:F1},\"ice\":{freezeLeft},\"fish\":[{sb}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}";
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.98f, 0.5f, 0.3f, 0.97f);
    static readonly Color Dark = new Color(0.04f, 0.12f, 0.16f, 0.84f);
    static readonly Color Gold = new Color(1f, 0.82f, 0.25f, 0.97f);
    static readonly Color Slate = new Color(0.16f, 0.3f, 0.36f, 0.95f);
    static readonly Color Ice = new Color(0.35f, 0.7f, 0.95f, 0.97f);

    string StageTitle(int i) => F("Pond {0}", i + 1) + " · " + F("{0} koi", PondFor(i).fish);

    Rect IceButton(float w, float h)
    {
        // bottom right, clear of the page's full-window exit button in the bottom-left corner
        float s = Mathf.Clamp(Mathf.Min(w, h) * 0.2f, 64f, 92f);
        return new Rect(w - s - 16f, h - s - 22f, s, s);
    }

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu) { DrawMenu(w, h); return; }
        var bar = new Rect(8f, 8f, w - 16f, 78f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 140f, 22f), "<b>" + StageTitle(stageIdx) + "</b>", 15, new Color(0.85f, 0.97f, 1f));
        float left = Mathf.Max(0f, pond.limit - elapsed);
        string cb = combo >= 2 ? $"   <color=#ffd54a><b>x{combo}</b></color>" : "";
        OiyoArcade.Text(new Rect(20f, 34f, w - 90f, 24f), $"{U("Koi")} <b>{pond.fish - caughtCount}</b>   {U("Time")} <b>{left:F1}</b>   {U("Score")} <b>{score:N0}</b>{cb}", 16, Color.white);
        OiyoArcade.Bar(new Rect(20f, 62f, w - 96f, 9f), caughtCount / (float)pond.fish, new Color(0f, 0f, 0f, 0.45f), Gold);
        OiyoArcade.Bar(new Rect(20f, 73f, w - 96f, 4f), left / pond.limit, new Color(0f, 0f, 0f, 0.35f), left < 8f ? new Color(1f, 0.4f, 0.35f) : new Color(0.55f, 0.9f, 1f));
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 92f, w - 16f, 40f), msg, w < 520f ? 16 : 20, Gold, TextAnchor.MiddleCenter);
        if (state == GameState.Ready || state == GameState.Playing)
        {
            var ib = IceButton(w, h);
            string label = frozen > 0f ? $"<b>{frozen:F1}</b>" : $"<b>{U("Ice")}</b>\n<size=13>× {freezeLeft}</size>";
            if (OiyoArcade.Button(ib, label, Ice, 22, null, freezeLeft > 0 || frozen > 0f))
            {
                if (state == GameState.Ready) state = GameState.Playing;
                Freeze();
            }
        }
        if (state == GameState.Ready)
        {
            var r = new Rect(w * 0.5f - Mathf.Min(170f, w * 0.5f - 12f), h - 160f - (portrait ? 70f : 0f), Mathf.Min(340f, w - 24f), 104f);
            if (!portrait) r.x = 16f;
            OiyoArcade.Panel(r, Dark);
            string extra = pond.puffers > 0 ? "\n<size=13><color=#ffd27a>" + U("Leave the spiky puffers alone!") + "</color></size>" : "";
            OiyoArcade.Text(new Rect(r.x + 12f, r.y + 6f, r.width - 24f, r.height - 12f),
                $"<b>{F("Catch all {0} koi in {1} s", pond.fish, Mathf.RoundToInt(pond.limit))}</b>\n<size=14>{U("Tap a fish to swat it out of the pond.")}</size>{extra}", 16, Color.white, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Paused) DrawPause(w, h);
        if (state == GameState.Victory || state == GameState.GameOver) DrawResult(w, h);
    }

    void DrawMenu(float w, float h)
    {
        if (showStages)
        {
            float bw = Mathf.Min(w - 16f, 760f);
            var box = new Rect(w * 0.5f - bw * 0.5f, 12f, bw, Mathf.Min(h - 24f, 520f));
            OiyoArcade.Panel(box, new Color(0.04f, 0.12f, 0.16f, 0.95f));
            OiyoArcade.Text(new Rect(box.x + 16f, box.y + 12f, box.width - 120f, 30f), "<b>" + U("Choose a pond") + "</b>", 20, Color.white);
            OiyoArcade.Text(new Rect(box.x + 16f, box.y + 40f, box.width - 32f, 22f), $"★ {OiyoArcade.TotalStars(Slug, StageCount)}/{StageCount * 3}", 15, Gold);
            if (OiyoArcade.Button(new Rect(box.xMax - 100f, box.y + 12f, 86f, 40f), U("Back"), Slate, 16)) showStages = false;
            int pick = OiyoArcade.StageGrid(new Rect(box.x + 14f, box.y + 70f, box.width - 28f, box.height - 84f), Slug, StageCount, Accent, U("Pond"));
            if (pick >= 0) LoadStage(pick);
            return;
        }
        float cw = Mathf.Min(380f, w - 24f);
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - 170f, cw, 340f);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 18f, cw, 40f), U("Cat Fishing"), 30, new Color(1f, 0.88f, 0.62f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 20f, card.y + 62f, cw - 40f, 46f), U("Swat every koi out of the pond before the clock runs out. Shy fish flee your paw."), 15, new Color(1f, 1f, 1f, 0.88f), TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x, card.y + 110f, cw, 24f), StageTitle(stageIdx), 15, Gold, TextAnchor.MiddleCenter);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 142f, cw - 48f, 58f), "<b>▶ " + F("Play pond {0}", stageIdx + 1) + "</b>", Accent, 21)) LoadStage(stageIdx);
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 210f, cw - 48f, 46f), U("All 30 ponds") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}", Slate, 17)) showStages = true;
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
        if (OiyoArcade.Button(new Rect(card.x + 24f, card.y + 188f, cw - 48f, 46f), U("Pond list"), Slate, 17)) { LoadStage(stageIdx, false); showStages = true; }
    }

    void DrawResult(float w, float h)
    {
        bool won = state == GameState.Victory;
        float cw = Mathf.Min(360f, w - 24f);
        float ch = 158f + (won ? 58f : 0f) + 52f + 40f + 18f;
        var card = new Rect(w * 0.5f - cw * 0.5f, h * 0.5f - ch * 0.5f, cw, ch);
        OiyoArcade.Panel(card, Dark);
        OiyoArcade.Shadowed(new Rect(card.x, card.y + 14f, cw, 38f), won ? U("Pond cleared!") : U("Time's up!"), 28, won ? new Color(0.6f, 1f, 0.65f) : new Color(1f, 0.6f, 0.5f), TextAnchor.MiddleCenter);
        string detail = won ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("{0} koi got away", pond.fish - caughtCount);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 56f, cw - 32f, 44f), detail, 16, Color.white, TextAnchor.MiddleCenter);
        OiyoArcade.Text(new Rect(card.x + 16f, card.y + 100f, cw - 32f, 52f),
            $"{U("Score")} <b>{score:N0}</b>\n<size=14>{F("{0} s", elapsed.ToString("F1"))} · {F("Best streak {0}", bestCombo)} · {F("{0} misses", misses)}</size>", 16, Color.white, TextAnchor.MiddleCenter);
        float y = card.y + 158f;
        if (won && stageIdx < StageCount - 1)
        {
            if (ResultLive & OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 50f), "<b>" + U("Next pond") + " ▶</b>", Accent, 19)) LoadStage(stageIdx + 1);
            y += 58f;
        }
        else if (won)
        {
            OiyoArcade.Text(new Rect(card.x, y, cw, 50f), "★ " + U("You cleared all 30 ponds!") + " ★", 17, Gold, TextAnchor.MiddleCenter);
            y += 58f;
        }
        if (ResultLive & OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 44f), U("Retry"), won ? Slate : Accent, 17)) LoadStage(stageIdx);
        y += 52f;
        if (ResultLive & OiyoArcade.Button(new Rect(card.x + 24f, y, cw - 48f, 40f), U("Pond list"), Slate, 16)) { LoadStage(stageIdx, false); showStages = true; }
    }
}
