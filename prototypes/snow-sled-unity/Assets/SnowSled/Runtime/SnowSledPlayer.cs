using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Snow Sled 3D: the web Snow Sled (src/components/games/SnowSled.tsx, src/lib/games/snow-sled.ts)
// rebuilt in Unity with a chase camera down the slope. The rules are the web's, in its own 360 px wide
// course measured in px: speed builds by 70 px/s² to the course's top speed, the sled turns toward the
// finger's x (lateral speed (tx - x) * 6, at most 0.9 v + 80, eased by grip), ice drops grip to 0.08,
// a ramp launches the sled for 0.55 s + v/1200, a pine or snowman knocks it over for 0.9 s, a missed
// gate adds 2 s and a lucky pouch takes 0.5 s off. Stars against the web's autopilot par (1, 1.2 and
// 1.5 x par; slower than that does not clear). The 30 courses are the web's own (SnowSledStages.cs).
// Keyboard: left/right arrows (or A/D) steer, Space starts.
public class SnowSledPlayer : MonoBehaviour
{
    const string Slug = "snow-sled";
    const int StageCount = 30;
    const float FW = 360f, PX = 30f, MissPenalty = 2f, PouchBonus = 0.5f;
    const int Tree = 0, Snowman = 1, Pouch = 2, Ice = 3, Ramp = 4;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of snow-sled.ts) ----------------
    class Gate { public float x, y, half; public int passed = -1; public Transform l, r, line; }
    class Obj { public int kind; public float x, y, w, h; public bool taken; public Transform t; public float fall; }
    SnowSledStages.Level level;
    int stageIdx;
    readonly List<Gate> gates = new List<Gate>();
    readonly List<Obj> objs = new List<Obj>();
    float rx, ry, v, vx, tx, time, tumble, air;
    bool onIce, finished;
    int missed, pouches, crashes, starsWon;
    float finalT;

    void NewRun()
    {
        rx = FW / 2f; ry = 0f; v = 140f; vx = 0f; tx = FW / 2f; time = 0f; tumble = 0f; air = 0f;
        onIce = false; finished = false; missed = 0; pouches = 0; crashes = 0;
    }

    void Steer(float x) => tx = Mathf.Clamp(x, 16f, FW - 16f);

    static bool Overlaps(float ax, float ay, float aw, float ah, Obj b) =>
        Mathf.Abs(ax - b.x) * 2f < aw + b.w && Mathf.Abs(ay - b.y) * 2f < ah + b.h;

    void Step(float dt)
    {
        if (finished) return;
        time += dt;
        if (tumble > 0f) { tumble -= dt; v = Mathf.Max(40f, v - 300f * dt); }
        else v = Mathf.Min(level.vmax, v + 70f * dt);
        if (air > 0f) air -= dt;
        float grip = tumble > 0f ? 0f : onIce && air <= 0f ? 0.08f : 1f;
        float maxLat = 0.9f * v + 80f;
        float want = Mathf.Clamp((tx - rx) * 6f, -maxLat, maxLat);
        vx += (want - vx) * Mathf.Min(1f, dt * 12f * grip);
        if (air <= 0f) v -= Mathf.Abs(vx) * 0.12f * dt * (onIce ? 0f : 1f);
        rx = Mathf.Clamp(rx + vx * dt, 12f, FW - 12f);
        float prevY = ry;
        ry += v * dt;
        foreach (var g in gates)
        {
            if (g.passed != -1 || ry < g.y || prevY >= g.y) continue;
            bool ok = Mathf.Abs(rx - g.x) <= g.half;
            g.passed = ok ? 1 : 0;
            if (ok) { synth.Tone(880f, 0.07f, Wave.Triangle, 0.14f, 1100f, 12f); }
            else { missed++; Toast("+2", new Color(1f, 0.4f, 0.35f)); synth.Tone(220f, 0.2f, Wave.Square, 0.1f, 140f, 8f); }
        }
        onIce = false;
        foreach (var o in objs)
        {
            if (o.y > ry + 40f) break;
            if (o.y < ry - 60f || o.taken) continue;
            if (!Overlaps(rx, ry, 18f, 22f, o)) continue;
            if (o.kind == Ice) onIce = true;
            else if (o.kind == Pouch)
            {
                o.taken = true; pouches++;
                Toast("-0.5", new Color(0.5f, 1f, 0.55f));
                bursts.Emit(P(rx, ry, 0.6f), new Color(1f, 0.83f, 0.23f), 14, 3f, 0.25f, 0.5f);
                synth.Tone(990f, 0.12f, Wave.Triangle, 0.18f, 1480f, 9f);
            }
            else if (o.kind == Ramp)
            {
                if (air <= 0f)
                {
                    air = 0.55f + v / 1200f; airMax = air;
                    v = Mathf.Min(level.vmax + 40f, v + 40f);
                    synth.Tone(440f, 0.3f, Wave.Triangle, 0.16f, 880f, 4f);
                }
            }
            else if (air <= 0f && tumble <= 0f)
            {
                o.taken = true; tumble = 0.9f; crashes++;
                vx = (rx < o.x ? -1f : 1f) * 120f;
                bursts.Emit(P(o.x, o.y, 0.6f), o.kind == Tree ? new Color(0.2f, 0.55f, 0.25f) : Color.white, 22, 4f, 0.3f, 0.6f);
                synth.Tone(140f, 0.35f, Wave.Noise, 0.2f, 70f, 6f);
            }
        }
        if (ry >= level.length) finished = true;
    }

    float FinalTime() => Mathf.Max(0f, time + missed * MissPenalty - pouches * PouchBonus);
    static int StarsFor(float t, float par) => t <= par ? 3 : t <= par * 1.2f ? 2 : t <= par * 1.5f ? 1 : 0;

    // ---------------- Scene ----------------
    // Course px -> world: x across, y down the slope (+z), the ground at y = 0.
    static Vector3 P(float x, float y, float h = 0f) => new Vector3((x - FW * 0.5f) / PX, h, y / PX);

    Camera cam;
    Light sun, lamp;
    Transform root, sled, sledShadow;
    Renderer sledR;
    Material sledMat, tumbleMat, pineMat, snowmanMat, pouchMat, flagRedMat, flagBlueMat, slopeMat, boardsMat, checkerMat, iceMat, poleMat, bankMat, passMat, shadowMat;
    readonly List<Transform> tracks = new List<Transform>();
    int trackNext;
    Bursts bursts, spray;
    Synth synth;
    bool showStages;
    float airMax = 1f;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 50f; cam.nearClipPlane = 0.3f; cam.farClipPlane = 120f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        sun = new GameObject("Sun").AddComponent<Light>();
        sun.type = LightType.Directional;
        sun.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        bursts = new Bursts(transform, 0.8f);
        spray = new Bursts(transform, 0.4f);
        synth = new Synth(gameObject);
        sledMat = OiyoField.Sprite("SS/sled"); tumbleMat = OiyoField.Sprite("SS/tumble");
        pineMat = OiyoField.Sprite("SS/pine"); snowmanMat = OiyoField.Sprite("SS/snowman"); pouchMat = OiyoField.Sprite("SS/pouch");
        flagRedMat = OiyoField.Sprite("SS/flag_red"); flagBlueMat = OiyoField.Sprite("SS/flag_blue");
        slopeMat = OiyoArcade.Lit(Color.white, 0.15f, OiyoArcade.Art("SS/slope", true));
        boardsMat = OiyoArcade.Lit(Color.white, 0.2f, OiyoArcade.Art("SS/boards", true));
        checkerMat = OiyoArcade.Textured(OiyoArcade.Art("SS/checker", true));
        iceMat = OiyoField.Sprite("SS/ice");
        poleMat = OiyoArcade.Lit(new Color(0.29f, 0.22f, 0.16f), 0.3f);
        bankMat = OiyoArcade.Lit(new Color(0.95f, 0.97f, 1f), 0.2f, OiyoArcade.Art("SS/slope", true));
        passMat = OiyoArcade.Transparent(OiyoArcade.GlowTexture(), new Color(0.3f, 0.85f, 0.4f, 0.5f));
        shadowMat = OiyoArcade.Transparent(OiyoArcade.GlowTexture(), new Color(0.1f, 0.15f, 0.25f, 0.35f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        level = SnowSledStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Course").transform;
        gates.Clear(); objs.Clear(); tracks.Clear(); trackNext = 0;
        for (int i = 0; i + 2 < level.gates.Length; i += 3) gates.Add(new Gate { x = level.gates[i], y = level.gates[i + 1], half = level.gates[i + 2] });
        for (int i = 0; i + 4 < level.objs.Length; i += 5) objs.Add(new Obj { kind = (int)level.objs[i], x = level.objs[i + 1], y = level.objs[i + 2], w = level.objs[i + 3], h = level.objs[i + 4] });
        NewRun();
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Billboard(string name, Material m, float wPx, float hPx, float x, float y)
    {
        var t = OiyoField.Quad(name, m, root, wPx, hPx);
        t.position = P(x, y, hPx * 0.5f / PX);
        return t;
    }

    void BuildScene()
    {
        bool night = level.night;
        cam.backgroundColor = night ? new Color(0.06f, 0.08f, 0.2f) : new Color(0.62f, 0.8f, 0.97f);
        sun.intensity = night ? 0.25f : 1f;
        sun.color = night ? new Color(0.6f, 0.7f, 1f) : Color.white;
        RenderSettings.ambientLight = night ? new Color(0.22f, 0.26f, 0.42f) : new Color(0.62f, 0.66f, 0.72f);
        if (lamp == null)
        {
            lamp = new GameObject("Lamp").AddComponent<Light>();
            lamp.type = LightType.Point; lamp.range = 14f; lamp.color = new Color(1f, 0.92f, 0.75f);
        }
        lamp.intensity = night ? 2.2f : 0f;
        float len = level.length;
        var ground = OiyoArcade.Prim(PrimitiveType.Quad, "Slope", slopeMat, root);
        ground.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        ground.transform.position = P(FW * 0.5f, len * 0.5f + 200f, 0f);
        ground.transform.localScale = new Vector3((FW * 4f) / PX, (len + 1600f) / PX, 1f);
        slopeMat.mainTextureScale = new Vector2(8f, (len + 1600f) / 360f);
        // snow banks along both edges, and a forest beyond them
        for (int s = 0; s < 2; s++)
        {
            var bank = OiyoArcade.Prim(PrimitiveType.Cube, "Bank", bankMat, root);
            bank.transform.position = P(s == 0 ? -14f : FW + 14f, len * 0.5f + 200f, 0.12f);
            bank.transform.localScale = new Vector3(20f / PX, 0.5f, (len + 1600f) / PX);
        }
        var rs = new System.Random(stageIdx * 41 + 9);
        for (float y = -300f; y < len + 900f; y += 70f)
            for (int s = 0; s < 2; s++)
            {
                float x = s == 0 ? -40f - (float)rs.NextDouble() * 120f : FW + 40f + (float)rs.NextDouble() * 120f;
                float k = 0.8f + (float)rs.NextDouble() * 0.6f;
                Billboard("Forest", pineMat, 56f * k, 66f * k, x, y + (float)rs.NextDouble() * 40f);
            }
        // start and finish lines
        foreach (var ly in new[] { 0f, len })
        {
            var line = OiyoArcade.Prim(PrimitiveType.Quad, "Line", checkerMat, root);
            line.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
            line.transform.position = P(FW * 0.5f, ly, 0.02f);
            line.transform.localScale = new Vector3(FW / PX, 12f / PX, 1f);
            if (ly > 0f)
                for (int s = 0; s < 2; s++)
                {
                    var post = OiyoArcade.Prim(PrimitiveType.Cylinder, "Post", poleMat, root);
                    post.transform.position = P(s == 0 ? 4f : FW - 4f, ly, 1.4f);
                    post.transform.localScale = new Vector3(0.15f, 1.4f, 0.15f);
                }
        }
        {
            var banner = OiyoArcade.Prim(PrimitiveType.Quad, "Banner", checkerMat, root);
            banner.transform.position = P(FW * 0.5f, len, 2.7f);
            banner.transform.localScale = new Vector3(FW / PX, 0.5f, 1f);
        }
        foreach (var o in objs)
        {
            switch (o.kind)
            {
                case Tree: o.t = Billboard("Pine", pineMat, 40f, 48f, o.x, o.y); break;
                case Snowman: o.t = Billboard("Snowman", snowmanMat, 38f, 44f, o.x, o.y); break;
                case Pouch: o.t = Billboard("Pouch", pouchMat, 26f, 26f, o.x, o.y); o.t.position += Vector3.up * 0.25f; break;
                case Ice:
                    {
                        var q = OiyoArcade.Prim(PrimitiveType.Quad, "Ice", iceMat, root);
                        q.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
                        q.transform.position = P(o.x, o.y, 0.015f);
                        q.transform.localScale = new Vector3(o.w / PX, o.h / PX, 1f);
                        o.t = q.transform; break;
                    }
                default:
                    {
                        // a wooden ramp: boards tilted up toward the bottom of the hill
                        var r = OiyoArcade.Prim(PrimitiveType.Cube, "Ramp", boardsMat, root);
                        r.transform.position = P(o.x, o.y, 0.18f);
                        r.transform.rotation = Quaternion.Euler(-14f, 0f, 0f);
                        r.transform.localScale = new Vector3(o.w / PX, 0.12f, o.h * 1.6f / PX);
                        o.t = r.transform; break;
                    }
            }
        }
        foreach (var g in gates)
        {
            g.l = Flag(g.x - g.half, g.y, flagRedMat, false);
            g.r = Flag(g.x + g.half, g.y, flagBlueMat, true);
            var line = OiyoArcade.Prim(PrimitiveType.Quad, "Pass", passMat, root);
            line.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
            line.transform.position = P(g.x, g.y, 0.03f);
            line.transform.localScale = new Vector3(g.half * 2f / PX, 0.25f, 1f);
            line.SetActive(false);
            g.line = line.transform;
        }
        sled = OiyoArcade.Prim(PrimitiveType.Quad, "Sled", sledMat, root).transform;
        sledR = sled.GetComponent<Renderer>();
        sledShadow = OiyoArcade.Prim(PrimitiveType.Quad, "Shadow", shadowMat, root).transform;
        sledShadow.rotation = Quaternion.Euler(90f, 0f, 0f);
        for (int i = 0; i < 90; i++)
        {
            var tr = OiyoArcade.Prim(PrimitiveType.Quad, "Track", OiyoArcade.Glow(night ? new Color(0.55f, 0.62f, 0.78f) : new Color(0.78f, 0.84f, 0.9f)), root);
            tr.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
            tr.transform.localScale = new Vector3(0.07f, 0.16f, 1f);
            tr.SetActive(false);
            tracks.Add(tr.transform);
        }
    }

    Transform Flag(float x, float y, Material m, bool flip)
    {
        var t = new GameObject("Flag").transform; t.SetParent(root, false);
        t.position = P(x, y, 0f);
        var pole = OiyoArcade.Prim(PrimitiveType.Cylinder, "Pole", poleMat, t);
        pole.transform.localPosition = new Vector3(0f, 0.6f, 0f);
        pole.transform.localScale = new Vector3(0.06f, 0.6f, 0.06f);
        var cloth = OiyoField.Quad("Cloth", m, t, 22f, 22f);
        cloth.localPosition = new Vector3(flip ? -0.36f : 0.36f, 0.98f, 0f);
        if (flip) cloth.localScale = new Vector3(-cloth.localScale.x, cloth.localScale.y, 1f);
        return t;
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("snow-sled", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput(dt);
        if (state == GameState.Playing)
        {
            Step(dt);
            if (finished) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string s, Color c) { msg = s; msgT = 0.8f; msgC = c; }

    // the finger's x across the course at the sled's depth on screen
    float ScreenToCourseX(Vector2 screen)
    {
        var l = cam.WorldToScreenPoint(P(0f, ry));
        var r = cam.WorldToScreenPoint(P(FW, ry));
        if (Mathf.Abs(r.x - l.x) < 1f) return FW * 0.5f;
        return (screen.x - l.x) / (r.x - l.x) * FW;
    }

    int steerId = int.MinValue;
    void ReadInput(float dt)
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; return; }
                    var began = OiyoArcade.Began();
                    if (began.Count > 0) { steerId = began[0].id; if (state == GameState.Ready) state = GameState.Playing; Steer(ScreenToCourseX(began[0].pos)); }
                    foreach (var h in OiyoArcade.Held()) if (h.id == steerId && !OiyoArcade.OverUi(h.pos)) Steer(ScreenToCourseX(h.pos));
                    int dir = (Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D) ? 1 : 0) - (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A) ? 1 : 0);
                    if (dir != 0 || Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.UpArrow))
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        if (dir != 0) Steer(rx + dir * 70f);
                    }
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

    float endTime;
    bool ResultLive => Time.unscaledTime - endTime > 0.45f;

    void End()
    {
        if (state != GameState.Playing) return;
        endTime = Time.unscaledTime;
        finalT = FinalTime();
        starsWon = StarsFor(finalT, level.par);
        bursts.Emit(P(rx, ry + 60f, 1f), new Color(1f, 0.85f, 0.3f), 40, 6f, 0.3f, 0.8f);
        if (starsWon > 0)
        {
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, starsWon, StageCount);
            float best = PlayerPrefs.GetFloat(Slug + ".time." + stageIdx, 0f);
            if (best <= 0f || finalT < best) { PlayerPrefs.SetFloat(Slug + ".time." + stageIdx, finalT); PlayerPrefs.Save(); }
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

    float camX;
    void Animate(float dt)
    {
        if (root == null) return;
        // sled: laid on the snow, leaning into turns, lifted off ramps, spinning when it tumbles
        float lift = air > 0f ? Mathf.Sin(Mathf.Clamp01(air / Mathf.Max(0.01f, airMax)) * Mathf.PI) * 1.1f : 0f;
        sledR.sharedMaterial = tumble > 0f ? tumbleMat : sledMat;
        sled.position = P(rx, ry, 0.08f + lift);
        float yaw = tumble > 0f ? time * 800f : Mathf.Clamp(-vx / 500f, -0.45f, 0.45f) * Mathf.Rad2Deg;
        sled.rotation = Quaternion.Euler(90f, 0f, 0f) * Quaternion.Euler(0f, 0f, yaw) * Quaternion.Euler(-lift * 20f, 0f, 0f);
        float s = 1f + lift * 0.25f;
        sled.localScale = new Vector3(34f / PX * s, 44f / PX * s, 1f);
        sledShadow.position = P(rx, ry, 0.012f);
        sledShadow.localScale = new Vector3(1.4f - lift * 0.3f, 1.8f - lift * 0.4f, 1f);
        if (lamp != null) lamp.transform.position = P(rx, ry + 90f, 2.5f);
        // runner tracks and powder spray
        if (state == GameState.Playing && air <= 0f && tracks.Count > 0)
        {
            for (int k = 0; k < 2; k++)
            {
                var tr = tracks[trackNext]; trackNext = (trackNext + 1) % tracks.Count;
                tr.gameObject.SetActive(true);
                tr.position = P(rx + (k == 0 ? -8f : 8f), ry - 16f, 0.011f);
            }
            if (Mathf.Abs(vx) > 140f && Random.value < 0.6f)
                spray.Emit(P(rx - Mathf.Sign(vx) * 10f, ry - 10f, 0.2f), Color.white, 2, 1.6f, 0.18f, 0.4f, new Vector3(-Mathf.Sign(vx) * 1.5f, 1.2f, -0.5f));
        }
        foreach (var o in objs)
        {
            if (o.t == null) continue;
            if (o.kind == Pouch)
            {
                o.t.gameObject.SetActive(!o.taken);
                o.t.position = P(o.x, o.y, 0.45f + Mathf.Sin(time * 5f + o.y) * 0.07f);
            }
            else if ((o.kind == Tree || o.kind == Snowman) && o.taken && o.fall < 1f)
            {
                o.fall = Mathf.Min(1f, o.fall + dt * 3f);
                o.t.rotation = Quaternion.Euler(0f, 0f, (o.kind == Tree ? 30f : -70f) * o.fall);
            }
        }
        foreach (var g in gates)
        {
            if (g.passed == 1) g.line.gameObject.SetActive(true);
            if (g.passed == 0)
            {
                foreach (var t in new[] { g.l, g.r }) t.localScale = Vector3.one * 0.8f;
            }
        }
        // chase camera: high behind the sled, wide enough to show the whole course width
        float halfV = cam.fieldOfView * 0.5f * Mathf.Deg2Rad;
        float halfH = Mathf.Atan(Mathf.Tan(halfV) * cam.aspect);
        float needHalf = (FW * 0.5f + 8f) / PX;
        float dist = Mathf.Max(cam.aspect < 1f ? 9f : 14f, needHalf / Mathf.Tan(halfH));
        dist = Mathf.Min(dist, 34f);
        camX = Mathf.Lerp(camX, (rx - FW * 0.5f) / PX * 0.35f, dt > 0f ? Mathf.Min(1f, dt * 3f) : 1f);
        var look = P(FW * 0.5f, ry + (cam.aspect < 1f ? 150f : 150f), 0f) + new Vector3(camX, 0f, 0f);
        var dir = Quaternion.Euler(cam.aspect < 1f ? 44f : 40f, 0f, 0f) * Vector3.forward;
        cam.transform.position = look - dir * dist;
        cam.transform.rotation = Quaternion.LookRotation(dir, Vector3.up);
        // keep billboards facing the camera
        var face = Quaternion.Euler(cam.transform.eulerAngles.x * 0.6f, 0f, 0f);
        foreach (Transform c in root)
            if (c.name == "Forest") c.rotation = face;
        foreach (var o in objs)
            if (o.t != null && (o.kind == Tree || o.kind == Snowman || o.kind == Pouch) && !(o.taken && o.kind != Pouch)) o.t.rotation = face;
        foreach (var g in gates) { g.l.rotation = face; g.r.rotation = face; }
    }

    // ?oiyotest=1 prints the run state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.1f;
        float aim = rx;
        // where the web autopilot would steer (the clean line 70 px ahead), for the automated check
        float py = ry + 70f, px = FW / 2f, prev = 0f;
        aim = -1f;
        foreach (var g in gates) { if (py <= g.y) { aim = px + (g.x - px) * (py - prev) / Mathf.Max(1f, g.y - prev); break; } px = g.x; prev = g.y; }
        if (aim < 0f) aim = px;
        var l = cam.WorldToScreenPoint(P(0f, ry)); var r = cam.WorldToScreenPoint(P(FW, ry));
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{time:F1},\"y\":{ry:F0},\"len\":{level.length:F0},\"x\":{rx:F0},\"aim\":{aim:F0},\"missed\":{missed},\"crashes\":{crashes},\"edge\":[{l.x:F0},{r.x:F0},{l.y:F0}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.88f, 0.19f, 0.19f, 0.97f);
    static readonly Color Dark = new Color(0.06f, 0.12f, 0.24f, 0.86f);
    static readonly Color Gold = new Color(1f, 0.82f, 0.25f, 0.97f);

    string StageTitle(int i) => F("Course {0}", i + 1) + " · " + F("Par {0} s", SnowSledStages.All[i].par.ToString("F1"));

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu)
        {
            if (showStages)
            {
                int pick = OiyoScreens.Stages(w, h, Dark, Accent, Slug, StageCount, U("Choose a course"), U("Back"), U("Course"));
                if (pick == -2) showStages = false; else if (pick >= 0) LoadStage(pick);
                return;
            }
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.85f, 0.95f, 1f), U("Snow Sled"),
                U("Steer down the hill between the red and blue flags. Dodge pines and snowmen, grab lucky pouches, beat the par time."),
                StageTitle(stageIdx), F("Ride course {0}", stageIdx + 1), U("All 30 courses") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 78f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Course {0}", stageIdx + 1) + "</b>   " + F("Par {0} s", level.par.ToString("F1")), 15, new Color(0.85f, 0.95f, 1f));
        OiyoArcade.Text(new Rect(20f, 34f, w - 90f, 24f), $"{U("Time")} <b>{FinalTime():F1}</b>   {F("Missed {0}", missed)}   {F("Pouches {0}", pouches)}", 16, Color.white);
        OiyoArcade.Bar(new Rect(20f, 64f, w - 96f, 8f), ry / level.length, new Color(0f, 0f, 0f, 0.4f), new Color(0.9f, 0.3f, 0.3f));
        if (OiyoArcade.Button(new Rect(w - 64f, 14f, 46f, 46f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 92f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Touch to start"), U("Hold and drag left or right: the sled turns toward your finger. A missed flag costs 2 s, a pouch takes 0.5 s off."));
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Course list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("Par {0} s", level.par.ToString("F1"));
            string body = $"<b>{F("{0} s", finalT.ToString("F1"))}</b>\n<size=14>{F("Missed flags +{0} s · pouches -{1} s", missed * MissPenalty, (pouches * PouchBonus).ToString("F1"))}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? F("Finish! {0} s", finalT.ToString("F1")) : U("Too slow"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next course") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 courses!") : null, U("Ride again"), U("Course list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
