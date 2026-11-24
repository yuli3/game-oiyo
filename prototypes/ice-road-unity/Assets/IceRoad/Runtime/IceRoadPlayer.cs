using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Ice Road 3D: the web Ice Road (src/components/games/IceRoad.tsx, src/lib/games/ice-road.ts) rebuilt in
// Unity: one world unit is one metre of road. Holding accelerates the truck at 6 m/s², letting go brakes at
// 11 m/s², top speed 26 m/s. Each stretch of the lake has a wave speed; within its band (|v − wave| <
// width) the ice takes stress at 0.55 × (1 − (d/width)²) per second, and outside every band it heals at
// 0.1 per second. Stress 1 breaks the ice; a pressure ridge taken over its limit + 1.5 m/s spins the
// truck out; the clock is the stage's time limit. The 30 roads are the web's own (IceRoadStages.cs).
public class IceRoadPlayer : MonoBehaviour
{
    const string Slug = "ice-road";
    const int StageCount = 30;
    const float VMax = 26f, Accel = 6f, Brake = 11f, StressRate = 0.55f, StressHeal = 0.1f, RidgeSlack = 1.5f, Kmh = 3.6f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of ice-road.ts) ----------------
    IceRoadStages.Level st;
    int stageIdx, ridgeIdx, starsWon;
    float t, x, v, stress;
    bool over, won;
    string fail = "";

    int StretchCount => st.stretches.Length / 4;
    int StretchAt(float at)
    {
        for (int i = 0; i < StretchCount; i++) if (at < st.stretches[i * 4 + 1]) return i;
        return StretchCount - 1;
    }
    float WaveAt(int i) => st.stretches[i * 4 + 2];
    float Width(int i) => st.stretches[i * 4 + 3];
    float BandLoad(int i, float speed)
    {
        float d = Mathf.Abs(speed - WaveAt(i)) / Width(i);
        return d >= 1f ? 0f : 1f - d * d;
    }
    int RidgeCount => st.ridges.Length / 2;

    void NewDrive() { t = 0f; x = 0f; v = 0f; stress = 0f; over = false; won = false; fail = ""; ridgeIdx = 0; }

    bool ridgeNow, crackingNow;
    bool Step(bool gas, float dt)
    {
        ridgeNow = false; crackingNow = false;
        if (over) return false;
        t += dt;
        v = Mathf.Clamp(v + (gas ? Accel : -Brake) * dt, 0f, VMax);
        x += v * dt;
        float load = BandLoad(StretchAt(x), v);
        if (load > 0f) { stress += StressRate * load * dt; crackingNow = true; }
        else stress = Mathf.Max(0f, stress - StressHeal * dt);
        if (ridgeIdx < RidgeCount && x >= st.ridges[ridgeIdx * 2])
        {
            float limit = st.ridges[ridgeIdx * 2 + 1];
            ridgeIdx++; ridgeNow = true;
            if (v > limit + RidgeSlack) return Finish(false, "ridge");
        }
        if (stress >= 1f) return Finish(false, "crack");
        if (x >= st.length) return Finish(true, "");
        if (t >= st.timeLimit) return Finish(false, "time");
        return false;
    }
    bool Finish(bool w, string f) { over = true; won = w; fail = f; return true; }

    int StarsFor()
    {
        if (!won) return 0;
        if (t <= st.par * 1.06f) return 3;
        if (t <= st.timeLimit * 0.92f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    Camera cam;
    Transform root, truck, crack;
    readonly List<Transform> wheels = new List<Transform>();
    Material iceMat, roadMat, ridgeMat, cabMat, boxMat, wheelMat, glassMat, crackMat, finishMat, snowMat;
    Bursts bursts, spray;
    Synth synth;
    bool showStages;
    float camZ;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 55f; cam.nearClipPlane = 0.3f; cam.farClipPlane = 400f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.78f, 0.86f, 0.94f);
        RenderSettings.fog = true; RenderSettings.fogMode = FogMode.Linear;
        RenderSettings.fogColor = cam.backgroundColor; RenderSettings.fogStartDistance = 90f; RenderSettings.fogEndDistance = 260f;
        OiyoField.Lights(new Color(0.5f, 0.55f, 0.62f), 0.75f, 50f, -30f);
        bursts = new Bursts(transform, 0.9f);
        spray = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        var iceTex = OiyoArcade.Art("IR/ice", true);
        iceMat = OiyoArcade.Lit(Color.white, 0.35f, iceTex);
        roadMat = OiyoArcade.Transparent(OiyoArcade.Solid(Color.white), new Color(1f, 1f, 1f, 0.22f));
        ridgeMat = OiyoArcade.Lit(new Color(0.97f, 0.98f, 1f), 0.2f);
        snowMat = OiyoArcade.Lit(new Color(0.95f, 0.96f, 0.98f), 0.1f);
        cabMat = OiyoArcade.Lit(new Color(0.88f, 0.19f, 0.19f), 0.5f);
        boxMat = OiyoArcade.Lit(new Color(0.42f, 0.46f, 0.5f), 0.3f);
        wheelMat = OiyoArcade.Lit(new Color(0.13f, 0.14f, 0.16f), 0.2f);
        glassMat = OiyoArcade.Lit(new Color(0.65f, 0.85f, 1f), 0.9f);
        crackMat = OiyoField.Sprite("IR/crack");
        finishMat = OiyoArcade.Lit(Color.white, 0.2f, OiyoArcade.Art("IR/finish", true));
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        st = IceRoadStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Lake").transform;
        NewDrive();
        starsWon = 0;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        camZ = 0f;
        Animate(0f);
    }

    static Color IceColor(float wave)
    {
        float k = Mathf.Clamp01((wave - 10f) / 17f);
        return new Color((215f - 185f * k) / 255f, (240f - 160f * k) / 255f, (250f - 90f * k) / 255f);
    }

    void BuildScene()
    {
        // the lake, stretch by stretch, tinted by depth; snowy banks either side; the road down the middle
        for (int i = 0; i < StretchCount; i++)
        {
            float a = st.stretches[i * 4], b = st.stretches[i * 4 + 1];
            var m = new Material(iceMat) { color = IceColor(WaveAt(i)) };
            var s = OiyoArcade.Prim(PrimitiveType.Cube, "Stretch", m, root);
            s.transform.position = new Vector3(0f, -0.25f, (a + b) * 0.5f);
            s.transform.localScale = new Vector3(60f, 0.5f, b - a);
        }
        var before = OiyoArcade.Prim(PrimitiveType.Cube, "Shore", snowMat, root);
        before.transform.position = new Vector3(0f, -0.2f, -40f);
        before.transform.localScale = new Vector3(60f, 0.6f, 80f);
        var after = OiyoArcade.Prim(PrimitiveType.Cube, "Far shore", snowMat, root);
        after.transform.position = new Vector3(0f, -0.2f, st.length + 60f);
        after.transform.localScale = new Vector3(60f, 0.6f, 120f);
        var road = OiyoArcade.Prim(PrimitiveType.Cube, "Road", roadMat, root);
        road.transform.position = new Vector3(0f, 0.02f, st.length * 0.5f);
        road.transform.localScale = new Vector3(8f, 0.02f, st.length + 80f);
        for (int k = 0; k < RidgeCount; k++)
        {
            var r = OiyoArcade.Prim(PrimitiveType.Cube, "Ridge", ridgeMat, root);
            r.transform.position = new Vector3(0f, 0.2f, st.ridges[k * 2]);
            r.transform.localScale = new Vector3(14f, 0.5f, 1.4f);
            r.transform.rotation = Quaternion.Euler(0f, 0f, 2f);
        }
        var fin = OiyoArcade.Prim(PrimitiveType.Cube, "Finish", finishMat, root);
        fin.transform.position = new Vector3(0f, 0.05f, st.length);
        fin.transform.localScale = new Vector3(8f, 0.05f, 1.6f);
        // the truck: a red cab and a grey box on six wheels
        truck = new GameObject("Truck").transform;
        truck.SetParent(root, false);
        var cab = OiyoArcade.Prim(PrimitiveType.Cube, "Cab", cabMat, truck);
        cab.transform.localPosition = new Vector3(0f, 1.3f, 3.2f); cab.transform.localScale = new Vector3(2.4f, 2f, 1.8f);
        var glass = OiyoArcade.Prim(PrimitiveType.Cube, "Glass", glassMat, truck);
        glass.transform.localPosition = new Vector3(0f, 1.7f, 4.12f); glass.transform.localScale = new Vector3(2.1f, 0.8f, 0.05f);
        var box = OiyoArcade.Prim(PrimitiveType.Cube, "Box", boxMat, truck);
        box.transform.localPosition = new Vector3(0f, 1.6f, -0.6f); box.transform.localScale = new Vector3(2.5f, 2.6f, 5.6f);
        wheels.Clear();
        foreach (float z in new[] { 3.2f, -1.6f, -2.9f })
            foreach (float side in new[] { -1.2f, 1.2f })
            {
                var w = OiyoArcade.Prim(PrimitiveType.Cylinder, "Wheel", wheelMat, truck);
                w.transform.localPosition = new Vector3(side, 0.5f, z);
                w.transform.localRotation = Quaternion.Euler(0f, 0f, 90f);
                w.transform.localScale = new Vector3(1f, 0.25f, 1f);
                wheels.Add(w.transform);
            }
        crack = OiyoArcade.Prim(PrimitiveType.Quad, "Cracks", crackMat, root).transform;
        crack.rotation = Quaternion.Euler(90f, 0f, 0f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("ice-road", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        bool gas = ReadInput();
        if (state == GameState.Playing)
        {
            bool end = Step(gas, dt);
            crackCue -= dt;
            if (crackingNow && crackCue <= 0f)
            {
                crackCue = 0.35f;
                Toast(U("Crack…"), new Color(1f, 0.5f, 0.45f));
                synth.Tone(900f, 0.08f, Wave.Noise, 0.08f, 300f, 14f);
                bursts.Emit(new Vector3(0f, 0.2f, x), new Color(0.9f, 0.96f, 1f), 6, 2f, 0.1f, 0.4f, Vector3.up);
            }
            if (ridgeNow && !end) synth.Tone(160f, 0.12f, Wave.Square, 0.1f, 90f, 10f);
            if (v > 4f && Mathf.FloorToInt(t * 8f) != Mathf.FloorToInt((t - dt) * 8f))
                spray.Emit(new Vector3(Random.Range(-1f, 1f), 0.3f, x - 3.5f), new Color(1f, 1f, 1f, 0.7f), 2, 1f, 0.1f, 0.5f, Vector3.up * 0.8f);
            if (end) End();
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    float crackCue;
    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.6f; msgC = c; }

    int pressId = int.MinValue;

    // returns whether the pedal is down this frame
    bool ReadInput()
    {
        bool confirm = Input.GetKeyDown(KeyCode.Return);
        switch (state)
        {
            case GameState.Ready:
            case GameState.Playing:
                {
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; pressId = int.MinValue; return false; }
                    // the finger is read once per frame: held down is the gas, lifted is the brake
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos)) continue;
                        if (state == GameState.Ready) state = GameState.Playing;
                        pressId = b.id;
                    }
                    foreach (var e in OiyoArcade.Ended()) if (e.id == pressId) pressId = int.MinValue;
                    bool held = false;
                    foreach (var hp in OiyoArcade.Held()) if (hp.id == pressId) held = true;
                    if (!held) pressId = int.MinValue;
                    bool key = Input.GetKey(KeyCode.Space) || Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.W);
                    if (key && state == GameState.Ready) state = GameState.Playing;
                    return held || key;
                }
            case GameState.Paused:
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) state = GameState.Playing;
                return false;
            case GameState.Victory:
            case GameState.GameOver:
                if (confirm && ResultLive) LoadStage(state == GameState.Victory ? Mathf.Min(stageIdx + 1, StageCount - 1) : stageIdx);
                return false;
            case GameState.Menu:
                if (!showStages && confirm) LoadStage(stageIdx);
                return false;
        }
        return false;
    }

    float endTime;
    bool ResultLive => Time.unscaledTime - endTime > 0.45f;

    void End()
    {
        if (state != GameState.Playing) return;
        endTime = Time.unscaledTime;
        pressId = int.MinValue;
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.Max(0, Mathf.RoundToInt((st.timeLimit - t) * 10f)), StageCount);
            StartCoroutine(Arp(new[] { 523f, 659f, 784f, 1047f, 1319f }, 0.09f));
        }
        else
        {
            starsWon = 0;
            state = GameState.GameOver;
            if (fail == "crack") bursts.Emit(truck.position + Vector3.up, new Color(0.45f, 0.75f, 0.99f), 30, 5f, 0.2f, 0.9f, Vector3.up * 2f);
            synth.Tone(220f, 0.6f, Wave.Triangle, 0.2f, 110f, 3f);
        }
    }

    IEnumerator Arp(float[] fs, float gap)
    {
        foreach (var f in fs) { synth.Tone(f, 0.18f, Wave.Triangle, 0.22f, 0f, 6f); yield return new WaitForSeconds(gap); }
    }

    void Animate(float dt)
    {
        if (root == null) return;
        bool sunk = over && fail == "crack";
        truck.position = new Vector3(0f, sunk ? -0.8f : 0f, x);
        truck.rotation = sunk ? Quaternion.Euler(-12f, 0f, 6f) : over && fail == "ridge" ? Quaternion.Euler(0f, 35f, 0f) : Quaternion.identity;
        foreach (var w in wheels) w.Rotate(Vector3.up, v * dt * 120f, Space.Self);
        crack.gameObject.SetActive(stress > 0.04f);
        crack.position = new Vector3(0f, 0.06f, x + 0.5f);
        float cs = 4f + stress * 14f;
        crack.localScale = new Vector3(cs, cs, 1f);
        // a chase camera, further back on a phone held upright so the road ahead still shows
        camZ = Mathf.Lerp(camZ, x, dt <= 0f ? 1f : Mathf.Min(1f, dt * 6f));
        bool portrait = cam.aspect < 1f;
        float back = portrait ? 22f : 15f, up = portrait ? 14f : 9f;
        cam.transform.position = new Vector3(portrait ? 0f : -3f, up, camZ - back);
        cam.transform.LookAt(new Vector3(0f, 0f, camZ + (portrait ? 22f : 18f)));
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: time, distance,
    // speed and stress; the band (wave, half-width) here and on the next stretch with where that starts;
    // the next ridge (at, limit); length and time limit.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        int i = StretchAt(x);
        int j = Mathf.Min(StretchCount - 1, i + 1);
        string ridge = ridgeIdx < RidgeCount ? $"[{st.ridges[ridgeIdx * 2]:F2},{st.ridges[ridgeIdx * 2 + 1]:F3}]" : "null";
        var stretches = new System.Text.StringBuilder();
        for (int k = 0; k < StretchCount; k++)
        {
            if (k > 0) stretches.Append(',');
            stretches.Append('[').Append(st.stretches[k * 4 + 1].ToString("F2")).Append(',').Append(WaveAt(k).ToString("F3")).Append(',').Append(Width(k).ToString("F3")).Append(']');
        }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F3},\"x\":{x:F2},\"v\":{v:F3},\"stress\":{stress:F3},\"band\":[{WaveAt(i):F3},{Width(i):F3}],\"next\":[{WaveAt(j):F3},{Width(j):F3},{st.stretches[i * 4 + 1]:F2}],\"stretches\":[{stretches}],\"ridge\":{ridge},\"length\":{st.length:F1},\"limit\":{st.timeLimit:F1},\"fail\":\"{fail}\",\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.11f, 0.49f, 0.84f, 0.97f);
    static readonly Color Dark = new Color(0.07f, 0.12f, 0.2f, 0.88f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("Limit {0}s", Mathf.RoundToInt(IceRoadStages.All[i].timeLimit));

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.75f, 0.9f, 1f), U("Ice Road"),
                U("Hold to speed up, let go to brake. Keep out of the speed that cracks the ice."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>  " + F("{0} m to go", Mathf.Max(0, Mathf.CeilToInt(st.length - x))), 15, new Color(0.8f, 0.92f, 1f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), F("{0} km/h", Mathf.RoundToInt(v * Kmh)) + "   " + $"{Mathf.Max(0f, st.timeLimit - t):F1}s", 16, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; pressId = int.MinValue; }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Playing || state == GameState.Ready || state == GameState.Paused)
        {
            // the speedometer: this stretch's band in red, the next one's faint, and the needle
            float gx = w - 58f, gy = 96f, gh = Mathf.Min(300f, h - 220f);
            OiyoArcade.Panel(new Rect(gx - 6f, gy - 8f, 52f, gh + 16f), Dark);
            System.Func<float, float> vy = s => gy + gh - s / VMax * gh;
            int i = StretchAt(x), j = Mathf.Min(StretchCount - 1, i + 1);
            if (j != i) OiyoArcade.Fill(new Rect(gx + 22f, vy(Mathf.Min(VMax, WaveAt(j) + Width(j))), 14f, (Mathf.Min(VMax, WaveAt(j) + Width(j)) - Mathf.Max(0f, WaveAt(j) - Width(j))) / VMax * gh), new Color(0.98f, 0.32f, 0.32f, 0.35f));
            OiyoArcade.Fill(new Rect(gx, vy(Mathf.Min(VMax, WaveAt(i) + Width(i))), 20f, (Mathf.Min(VMax, WaveAt(i) + Width(i)) - Mathf.Max(0f, WaveAt(i) - Width(i))) / VMax * gh), new Color(0.98f, 0.32f, 0.32f));
            for (int s = 0; s <= 25; s += 5) OiyoArcade.Fill(new Rect(gx, vy(s), 6f, 1f), Color.white);
            OiyoArcade.Fill(new Rect(gx - 6f, vy(v) - 2f, 46f, 4f), BandLoad(i, v) > 0f ? new Color(1f, 0.83f, 0.23f) : new Color(0.41f, 0.86f, 0.49f));
            // the next ridge's limit
            if (ridgeIdx < RidgeCount && st.ridges[ridgeIdx * 2] - x < 120f)
                OiyoArcade.Shadowed(new Rect(12f, 80f, w - 90f, 26f), F("Ridge ≤{0}", Mathf.RoundToInt(st.ridges[ridgeIdx * 2 + 1] * Kmh)) + $" km/h · {Mathf.CeilToInt(st.ridges[ridgeIdx * 2] - x)} m", 15, Color.white);
            // stress along the bottom
            OiyoArcade.Bar(new Rect(16f, h - 30f, w - 90f, 10f), Mathf.Min(1f, stress), new Color(0f, 0f, 0f, 0.4f), stress > 0.6f ? new Color(0.88f, 0.19f, 0.19f) : new Color(0.98f, 0.69f, 0.02f));
        }
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, 110f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Hold to drive"), U("Under the red band or over it, and cross it fast."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("{0} m to go", Mathf.Max(0, Mathf.CeilToInt(st.length - x)));
            string body = w0 ? $"<size=14>{F("Made it in {0}s", t.ToString("F1"))}</size>" : "";
            string head = w0 ? U("Across the lake!") : fail == "crack" ? U("The ice broke") : fail == "ridge" ? U("Spun out on a pressure ridge") : U("Out of time");
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, head, detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
