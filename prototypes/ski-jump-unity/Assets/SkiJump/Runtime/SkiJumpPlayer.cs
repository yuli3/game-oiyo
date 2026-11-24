using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Ski Jump 3D: the web Ski Jump (src/components/games/SkiJump.tsx, src/lib/games/ski-jump.ts) rebuilt in
// Unity. The rules are the web's, in metres: hold to tuck down a 35° in-run (full in-run speed only in a
// tuck), let go within 0.14 s of the lip to spring (up to +1.6 m/s), then hold to lean forward and let go
// to sit up; the air carries 0.62 of gravity at the centre of the green band (12° ± 7°) plus a little
// from a headwind, and gusts push the body angle. A press within 0.3 s of touchdown is a telemark. Points
// are 60 at the K-point plus 2 per metre and 20/15/6 for style. The 30 hills are the web's own
// (SkiJumpStages.cs). Keyboard: Space.
public class SkiJumpPlayer : MonoBehaviour
{
    const string Slug = "ski-jump";
    const int StageCount = 30;
    const float G = 9.81f, BandC = 12f, BandW = 7f, PopWindow = 0.14f, TelemarkWindow = 0.3f, M = 0.25f; // world units per metre

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of ski-jump.ts) ----------------
    SkiJumpStages.Level hill;
    int stageIdx;
    const int InRun = 0, Flight = 1, Landed = 2;
    int phase;
    float time, s, v, x, y, vx, vy, alpha, telemarkAt, popQuality, distance, points;
    bool holding, over, won;
    string landing = "";
    int starsWon;
    float[] table;

    float HillY(float xx)
    {
        float steep = Mathf.Tan(35f * Mathf.Deg2Rad);
        float yy = -2.5f;
        const float step = 0.5f;
        for (float t = 0f; t < xx; t += step)
        {
            float d = Mathf.Min(step, xx - t);
            float ramp = 1f - Mathf.Exp(-t / (hill.k * 0.18f));
            float flat = t < hill.k * 1.25f ? 1f : Mathf.Max(0f, 1f - (t - hill.k * 1.25f) / (hill.k * 0.4f));
            yy -= steep * ramp * flat * d;
        }
        return yy;
    }
    float GroundAt(float xx)
    {
        float f = Mathf.Max(0f, xx / 0.25f);
        int i = Mathf.Min(table.Length - 2, Mathf.FloorToInt(f));
        return table[i] + (table[i + 1] - table[i]) * Mathf.Min(1f, f - i);
    }

    void NewJump()
    {
        phase = InRun; time = 0f; s = 0f; v = 0f; x = 0f; y = 0f; vx = vy = 0f; alpha = 30f; holding = false;
        telemarkAt = -1f; popQuality = 0f; landing = ""; distance = 0f; points = 0f; over = false; won = false;
        table = new float[Mathf.CeilToInt(hill.k * 2.2f / 0.25f) + 2];
        for (int i = 0; i < table.Length; i++) table[i] = HillY(i * 0.25f);
    }

    // On the in-run (called when the tuck is released) it springs off near the lip; in flight every press readies the telemark.
    string Tap()
    {
        if (over) return null;
        if (phase == InRun)
        {
            float left = (hill.inrun - s) / Mathf.Max(1f, v);
            if (left > PopWindow) return "early";
            Takeoff(Mathf.Max(0f, 1f - left / PopWindow));
            return "pop";
        }
        if (phase == Flight) { telemarkAt = time; return "telemark"; }
        return null;
    }

    void Takeoff(float quality)
    {
        popQuality = quality;
        float table0 = -10f * Mathf.Deg2Rad;
        vx = Mathf.Cos(table0) * v;
        vy = Mathf.Sin(table0) * v + 1.6f * quality;
        phase = Flight; time = 0f; x = 0f; y = 0f; alpha = 28f;
        OnTakeoff();
    }

    static float Lift(float a)
    {
        float d = (a - BandC) / BandW;
        return 0.58f * Mathf.Exp(-d * d * 0.5f) + 0.04f;
    }

    void Step(float dt)
    {
        if (over) return;
        int n = Mathf.Max(1, Mathf.CeilToInt(dt / (1f / 240f)));
        float sub = dt / n;
        for (int k = 0; k < n && !over; k++)
        {
            time += sub;
            if (phase == InRun)
            {
                float tuck = holding ? 1f : 0.8f;
                float vmax = hill.gateSpeed * (tuck == 1f ? 1f : 0.85f);
                v += (G * Mathf.Sin(35f * Mathf.Deg2Rad) * 0.9f * tuck + 0.4f) * sub;
                v = Mathf.Min(vmax, v);
                s += v * sub;
                if (s >= hill.inrun) { Takeoff(0f); Toast(U("Stood up too early"), new Color(0.8f, 0.82f, 0.85f)); }
            }
            else if (phase == Flight)
            {
                int gi = Mathf.Min(hill.gusts.Length - 1, Mathf.FloorToInt(time * 2f));
                alpha += ((holding ? -32f : 26f) + hill.gusts[gi]) * sub;
                alpha = Mathf.Clamp(alpha, -5f, 45f);
                float lf = Lift(alpha) + hill.wind * 0.012f;
                vx -= 0.02f * vx * sub;
                vy += -G * (1f - lf) * sub;
                x += vx * sub;
                y += vy * sub;
                if (y <= GroundAt(x))
                {
                    y = GroundAt(x);
                    distance = Mathf.Round(x * 2f) / 2f;
                    float off = Mathf.Abs(alpha - BandC);
                    float before = telemarkAt >= 0f ? time - telemarkAt : float.PositiveInfinity;
                    landing = off > 16f ? "fall" : before <= TelemarkWindow ? "telemark" : "clean";
                    float style = landing == "telemark" ? 20f : landing == "clean" ? 15f : 6f;
                    points = Mathf.Round((60f + 2f * (distance - hill.k) + style) * 10f) / 10f;
                    phase = Landed; over = true; won = points >= hill.goal;
                    OnLand();
                }
            }
        }
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (points >= hill.goal + 14f) return 3;
        if (points >= hill.goal + 6f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    Camera cam;
    Transform root, jumper, ghostK;
    Renderer jumperR;
    Material tuckMat, flyMat, snowMat, woodMat, pineMat, mountMat, flagMat, redMat, markMat;
    Bursts bursts;
    Synth synth;
    bool showStages;
    Vector3 camPos;

    static readonly float Sin35 = Mathf.Sin(35f * Mathf.Deg2Rad), Cos35 = Mathf.Cos(35f * Mathf.Deg2Rad);
    static Vector3 P(float mx, float my, float mz = 0f) => new Vector3(mx * M, my * M, mz * M);

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 45f; cam.nearClipPlane = 0.3f; cam.farClipPlane = 300f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.45f, 0.72f, 0.95f);
        OiyoField.Lights(new Color(0.62f, 0.67f, 0.75f), 0.9f, 40f, -40f);
        bursts = new Bursts(transform, 0.7f);
        synth = new Synth(gameObject);
        tuckMat = OiyoField.Sprite("SJ/tuck"); flyMat = OiyoField.Sprite("SJ/fly");
        snowMat = OiyoArcade.Lit(Color.white, 0.25f, OiyoArcade.Art("SJ/snow", true));
        woodMat = OiyoArcade.Lit(Color.white, 0.3f, OiyoArcade.Art("SJ/wood", true));
        pineMat = OiyoField.Sprite("SJ/pine"); mountMat = OiyoField.Sprite("SJ/mountains"); flagMat = OiyoField.Sprite("SJ/flag");
        redMat = OiyoArcade.Glow(new Color(0.88f, 0.19f, 0.19f));
        markMat = OiyoArcade.Glow(new Color(0.11f, 0.49f, 0.84f));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        hill = SkiJumpStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Hill").transform;
        NewJump();
        starsWon = 0;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        camPos = Vector3.zero;
        Animate(0f, true);
    }

    void BuildScene()
    {
        // far mountains
        for (int k = -1; k < 4; k++)
        {
            var m = OiyoField.Quad("Mountains", mountMat, root, 1f, 1f);
            m.localScale = new Vector3(90f, 22f, 1f);
            m.position = new Vector3(k * 88f, -hill.k * 0.18f, 60f);
        }
        // the in-run: a wooden ramp down at 35°, with snow on top
        var ramp = OiyoArcade.Prim(PrimitiveType.Cube, "InRun", woodMat, root);
        float len = hill.inrun;
        ramp.transform.position = P(-len * Cos35 * 0.5f, len * Sin35 * 0.5f - 0.6f);
        ramp.transform.rotation = Quaternion.Euler(0f, 0f, -35f);
        ramp.transform.localScale = new Vector3(len * M, 0.3f, 4f * M);
        var tower = OiyoArcade.Prim(PrimitiveType.Cube, "Tower", woodMat, root);
        tower.transform.position = P(-len * Cos35, len * Sin35 * 0.5f - 2f);
        tower.transform.localScale = new Vector3(2f, len * Sin35 * M, 2f);
        // the landing hill: an extruded profile strip
        var mesh = new Mesh();
        var verts = new List<Vector3>(); var uvs = new List<Vector2>(); var tris = new List<int>();
        int rows = 0;
        for (float xx = -2f; xx <= hill.k * 2.2f; xx += 1f, rows++)
        {
            float yy = xx < 0f ? -2.5f : GroundAt(xx);
            verts.Add(P(xx, yy, -20f)); verts.Add(P(xx, yy, 20f));
            uvs.Add(new Vector2(0f, xx / 8f)); uvs.Add(new Vector2(5f, xx / 8f));
        }
        for (int r = 0; r + 1 < rows; r++) { int i = r * 2; tris.Add(i); tris.Add(i + 1); tris.Add(i + 2); tris.Add(i + 1); tris.Add(i + 3); tris.Add(i + 2); }
        mesh.SetVertices(verts); mesh.SetUVs(0, uvs); mesh.SetTriangles(tris, 0); mesh.RecalculateNormals(); mesh.RecalculateBounds();
        var hillGo = new GameObject("Landing"); hillGo.transform.SetParent(root, false);
        hillGo.AddComponent<MeshFilter>().sharedMesh = mesh;
        hillGo.AddComponent<MeshRenderer>().sharedMaterial = snowMat;
        // distance marks every 10 m and the red K line
        for (int d = 20; d <= hill.k * 1.8f; d += 10)
        {
            bool isK = Mathf.Abs(d - hill.k) < 5f;
            var mk = OiyoArcade.Prim(PrimitiveType.Cube, "Mark", isK ? redMat : markMat, root);
            mk.transform.position = P(d, GroundAt(d) + 0.05f, 0f);
            mk.transform.localScale = new Vector3(0.12f, 0.03f, isK ? 8f : 3f);
        }
        ghostK = OiyoArcade.Prim(PrimitiveType.Cube, "K", redMat, root).transform;
        ghostK.position = P(hill.k, GroundAt(hill.k) + 0.08f, 0f);
        ghostK.localScale = new Vector3(0.3f, 0.04f, 10f);
        // pines lining the hill
        var rs = new System.Random(stageIdx * 7 + 1);
        for (float d = -10f; d < hill.k * 2f; d += 9f)
            for (int side = 1; side <= 1; side += 2)
            {
                var p = OiyoField.Quad("Pine", pineMat, root, 1f, 1f);
                float sz = 1.6f + (float)rs.NextDouble();
                p.localScale = new Vector3(sz, sz * 1.15f, 1f);
                float gy = d < 0f ? -d * Mathf.Tan(35f * Mathf.Deg2Rad) * 0.6f : GroundAt(d);
                p.position = P(d, gy, side * (24f + (float)rs.NextDouble() * 18f)) + new Vector3(0f, sz * 0.55f, 0f);
                p.name = "Pine";
            }
        if (hill.wind != 0f)
        {
            var flag = OiyoField.Quad("Flag", flagMat, root, 1f, 1f);
            flag.localScale = new Vector3(hill.wind > 0f ? -1.2f : 1.2f, 0.9f, 1f);
            flag.position = P(6f, 6f, -10f);
        }
        jumper = OiyoField.Quad("Jumper", tuckMat, root, 1f, 1f);
        jumperR = jumper.GetComponent<Renderer>();
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("ski-jump", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            Step(dt);
            if (over) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt, false);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 1.2f; msgC = c; }

    void OnTakeoff()
    {
        if (popQuality > 0f) { Toast(U("Spring!"), new Color(0.55f, 0.8f, 1f)); synth.Tone(660f, 0.12f, Wave.Triangle, 0.18f, 990f, 8f); }
        bursts.Emit(P(0f, 0.5f), Color.white, 14, 2.5f, 0.2f, 0.5f);
    }
    void OnLand()
    {
        bool good = landing != "fall";
        Toast(landing == "telemark" ? U("Telemark landing!") : landing == "clean" ? U("Landed") : U("Fell over"), good ? new Color(0.5f, 1f, 0.6f) : new Color(1f, 0.5f, 0.45f));
        bursts.Emit(P(x, y + 0.5f), Color.white, 30, 4f, 0.25f, 0.7f);
        synth.Tone(good ? 784f : 200f, 0.25f, Wave.Triangle, 0.2f, good ? 1175f : 110f, 5f);
    }

    bool keyHeld;
    void ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; holding = false; return; }
                    // the one button: a finger anywhere (not on the pause button) or Space
                    bool down = false, up = false;
                    foreach (var b in OiyoArcade.Began()) { down = true; }
                    foreach (var e in OiyoArcade.Ended()) up = true;
                    if (Input.GetKeyDown(KeyCode.Space)) { down = true; keyHeld = true; }
                    if (Input.GetKeyUp(KeyCode.Space) && keyHeld) { up = true; keyHeld = false; }
                    if (down)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        holding = true;
                        if (phase == Flight) Tap();
                    }
                    if (up && state == GameState.Playing)
                    {
                        holding = false;
                        if (phase == InRun && Tap() == "early") Toast(U("Stood up too early"), new Color(0.8f, 0.82f, 0.85f));
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
        holding = false;
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.RoundToInt(points), StageCount);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
        }
        else
        {
            starsWon = 0;
            state = GameState.GameOver;
            synth.Tone(220f, 0.6f, Wave.Triangle, 0.2f, 110f, 3f);
        }
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.18f, Wave.Triangle, 0.22f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    Vector3 JumperPos() => phase == InRun ? P(-(hill.inrun - s) * Cos35, (hill.inrun - s) * Sin35) : P(x, y);

    void Animate(float dt, bool snap)
    {
        if (root == null) return;
        var pos = JumperPos();
        jumperR.sharedMaterial = phase == InRun ? tuckMat : flyMat;
        jumper.position = pos + new Vector3(0f, 0.45f, -0.6f);
        float rot = phase == InRun ? -35f : landing == "fall" ? -70f : (alpha - 20f) * -1f + Mathf.Atan2(vy, vx) * Mathf.Rad2Deg * (over ? 0f : 0.4f);
        jumper.rotation = Quaternion.Euler(0f, 0f, rot);
        jumper.localScale = new Vector3(phase == InRun ? 1.0f : 1.2f, phase == InRun ? 0.8f : 0.9f, 1f);
        // camera: beside and a little ahead of the jumper, looking along the hill
        bool portrait = cam.aspect < 1f;
        var want = pos + new Vector3(portrait ? 2.5f : 4f, portrait ? 1.5f : 1.2f, portrait ? -16f : -12f);
        camPos = snap || camPos == Vector3.zero ? want : Vector3.Lerp(camPos, want, Mathf.Min(1f, dt * 4f));
        cam.transform.position = camPos;
        cam.transform.LookAt(pos + new Vector3(portrait ? 2.5f : 4.5f, -1.2f, 0f));
    }

    // ?oiyotest=1 prints the run state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        float left = phase == InRun ? (hill.inrun - s) / Mathf.Max(1f, v) : -1f;
        // time to touchdown on the current path, ignoring lift a little (as the web autopilot does)
        float ttl = -1f;
        if (phase == Flight)
        {
            float px = x, py = y, pvy = vy;
            for (float t = 0f; t < 8f; t += 1f / 120f) { pvy -= G * 0.55f / 120f; px += vx / 120f; py += pvy / 120f; if (py <= GroundAt(px)) { ttl = t; break; } }
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"phase\":{phase},\"left\":{left:F3},\"alpha\":{alpha:F1},\"ttl\":{ttl:F2},\"dist\":{distance:F1},\"points\":{points:F1},\"goal\":{hill.goal:F0},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.11f, 0.49f, 0.84f, 0.97f);
    static readonly Color Dark = new Color(0.05f, 0.15f, 0.28f, 0.86f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · K" + Mathf.RoundToInt(SkiJumpStages.All[i].k);

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu)
        {
            if (showStages)
            {
                int pick = OiyoScreens.Stages(w, h, Dark, Accent, Slug, StageCount, U("Choose a stage"), U("Back"), U("Stage"));
                if (pick == -2) showStages = false; else if (pick >= 0) LoadStage(pick);
                return;
            }
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.85f, 0.95f, 1f), U("Ski Jump"),
                U("Hold to tuck, let go at the lip to spring, then hold and release to keep your body in the green band."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        string wind = hill.wind != 0f ? "   " + U("Wind") + $" <b>{(hill.wind > 0f ? "←" : "→")} {Mathf.Abs(hill.wind):F1}</b>" : "";
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + StageTitle(stageIdx) + "</b>" + wind, 15, new Color(0.85f, 0.95f, 1f));
        string res = over ? F("{0} m · {1} pts", distance.ToString("0.#"), points.ToString("0.#")) : F("Mark {0} pts", Mathf.RoundToInt(hill.goal));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), res, 16, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; holding = false; }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 80f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        // the body-angle gauge with its green band
        if (state == GameState.Playing || state == GameState.Ready)
        {
            var gauge = new Rect(w - 34f, h * 0.5f - 110f, 18f, 220f);
            OiyoArcade.Fill(gauge, new Color(1f, 1f, 1f, 0.35f));
            float GY(float a) => gauge.y + (45f - a) / 50f * gauge.height;
            OiyoArcade.Fill(new Rect(gauge.x, GY(BandC + BandW), gauge.width, GY(BandC - BandW) - GY(BandC + BandW)), new Color(0.55f, 0.91f, 0.6f, 0.9f));
            if (phase == Flight)
            {
                bool inBand = Mathf.Abs(alpha - BandC) <= BandW;
                OiyoArcade.Fill(new Rect(gauge.x - 6f, GY(alpha) - 3f, gauge.width + 12f, 6f), inBand ? new Color(0.18f, 0.62f, 0.27f) : new Color(0.88f, 0.19f, 0.19f));
            }
            if (phase == InRun && state == GameState.Playing)
            {
                float left = (hill.inrun - s) / Mathf.Max(1f, v);
                OiyoArcade.Bar(new Rect(16f, h - 30f, w - 32f, 10f), 1f - left / 2f, new Color(0f, 0f, 0f, 0.35f), left <= PopWindow ? new Color(0.18f, 0.62f, 0.27f) : new Color(1f, 1f, 1f, 0.6f));
            }
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Hold to tuck, let go at the lip"), U("In the air, hold to lean and let go to sit up. Press again just before touchdown for a telemark."), 170f, 110f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("Mark {0} pts", Mathf.RoundToInt(hill.goal));
            string land = landing == "telemark" ? U("Telemark landing!") : landing == "clean" ? U("Landed") : U("Fell over");
            string body = $"<b>{F("{0} m · {1} pts", distance.ToString("0.#"), points.ToString("0.#"))}</b>\n<size=14>{land}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("Past the mark!") : U("Just short"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
