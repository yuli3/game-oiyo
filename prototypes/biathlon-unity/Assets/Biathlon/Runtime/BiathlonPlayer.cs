using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Biathlon 3D: the web Biathlon (src/components/games/Biathlon.tsx, src/lib/games/biathlon.ts) rebuilt in
// Unity. The rules are the web's: holding pushes (3 m/s², drag 0.25/s) and raises the heart 8 bpm/s;
// gliding loses 0.4 m/s² and the heart eases 18 %/s toward 70 (30 %/s standing at the range). At the
// range the sight sways 2 + 0.2 (hr − 70) px with the breath, plus a seeded tremor of
// 0.35 (hr − 70) + 0.6 max(0, hr − 120) px/√s; after 0.6 s of raising the rifle a tap fires, a hit is
// within the stage's radius, and each miss adds a 10 s penalty loop. The 30 stages are the web's own
// (BiathlonStages.cs). Keyboard: Space.
public class BiathlonPlayer : MonoBehaviour
{
    const string Slug = "biathlon";
    const int StageCount = 30, Shots = 5;
    const float Rest = 70f, MaxHr = 195f, PushA = 3f, DragK = 0.25f, Glide = 0.4f, HrUp = 8f, HrEase = 0.18f, HrEaseRange = 0.3f;
    const float Penalty = 10f, SwayW = 2.2f, BreathW = 1.3f, TremorTau = 0.25f, AimTime = 0.6f;

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of biathlon.ts) ----------------
    BiathlonStages.Level stage;
    int stageIdx;
    float t, d, v, hr, penalty, rangeT, tx, ty;
    bool atRange, pushing, over, won;
    int leg, shot, hits, misses, starsWon;
    uint rngState;
    readonly List<Vector3> marks = new List<Vector3>(); // x, y, hit (1/0)

    void NewRacer()
    {
        t = 0f; atRange = false; leg = 0; d = 0f; v = 0f; hr = Rest + 20f; pushing = false; shot = 0; hits = 0; misses = 0;
        penalty = 0f; rangeT = 0f; tx = 0f; ty = 0f; rngState = stage.seed; over = false; won = false; marks.Clear();
    }

    double NextRand()
    {
        rngState = unchecked(rngState + 0x6d2b79f5u);
        uint q = rngState;
        q = unchecked((q ^ (q >> 15)) * (q | 1u));
        q ^= unchecked(q + (q ^ (q >> 7)) * (q | 61u));
        return (q ^ (q >> 14)) / 4294967296.0;
    }
    float Gauss()
    {
        double u = System.Math.Max(1e-9, NextRand());
        double w = NextRand();
        return (float)(System.Math.Sqrt(-2.0 * System.Math.Log(u)) * System.Math.Cos(2.0 * System.Math.PI * w));
    }

    static float SwayFor(float h) => 2f + 0.2f * (h - Rest);
    static float TremorFor(float h) => 0.35f * Mathf.Max(0f, h - Rest) + 0.6f * Mathf.Max(0f, h - 120f);
    Vector2 Sight() => new Vector2(SwayFor(hr) * Mathf.Sin(SwayW * rangeT) + tx, 4f * Mathf.Sin(BreathW * rangeT + 0.7f) + ty);

    // returns "hit", "miss" or null
    string Fire()
    {
        if (over || !atRange || rangeT < AimTime) return null;
        var s = Sight();
        bool hit = s.magnitude <= stage.radius;
        marks.Add(new Vector3(s.x, s.y, hit ? 1f : 0f));
        shot++;
        if (hit) hits++; else { misses++; penalty += Penalty; }
        if (shot >= Shots) { atRange = false; leg++; d = 0f; shot = 0; }
        return hit ? "hit" : "miss";
    }

    // returns "range", "finish" or null
    string Step(float dt)
    {
        if (over) return null;
        string ev = null;
        int n = Mathf.Max(1, Mathf.CeilToInt(dt / (1f / 240f)));
        float h = dt / n;
        for (int k = 0; k < n && !over; k++)
        {
            t += h;
            if (atRange)
            {
                rangeT += h;
                hr = Rest + (hr - Rest) * Mathf.Exp(-HrEaseRange * h);
                float sig = TremorFor(hr);
                tx += -tx / TremorTau * h + sig * Mathf.Sqrt(h) * Gauss();
                ty += -ty / TremorTau * h + sig * 0.6f * Mathf.Sqrt(h) * Gauss();
                continue;
            }
            if (pushing) { v += (PushA - DragK * v) * h; hr = Mathf.Min(MaxHr, hr + HrUp * h); }
            else { v = Mathf.Max(0f, v - (Glide + DragK * v) * h); hr = Rest + (hr - Rest) * Mathf.Exp(-HrEase * h); }
            if (penalty > 0f) { penalty = Mathf.Max(0f, penalty - h); continue; }
            d += v * h;
            if (d >= stage.leg)
            {
                if (leg >= stage.legs - 1) { over = true; won = t <= stage.goal; return "finish"; }
                atRange = true; pushing = false; v = 0f; rangeT = 0f; tx = 0f; ty = 0f; marks.Clear();
                ev = "range";
            }
        }
        return ev;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (t <= stage.goal * 0.95f) return 3;
        if (t <= stage.goal * 0.975f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    Camera cam;
    Transform root, skier, plate;
    Material skierMat, skierBMat, pineMat, snowMat, trackMat, plateMat, rangeMat;
    readonly List<Transform> pines = new List<Transform>();
    Renderer skierR;
    Bursts bursts;
    Synth synth;
    bool showStages;
    float trail; // metres skied in all (visual)
    Texture2D disc;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        cam = new GameObject("Camera").AddComponent<Camera>();
        cam.fieldOfView = 50f; cam.nearClipPlane = 0.1f; cam.farClipPlane = 220f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.45f, 0.75f, 0.99f);
        OiyoField.Lights(new Color(0.66f, 0.7f, 0.78f), 0.9f, 45f, -25f);
        bursts = new Bursts(transform, 0.5f);
        synth = new Synth(gameObject);
        skierMat = OiyoField.Sprite("BI/skier");
        skierBMat = OiyoField.Sprite("BI/skier_b");
        pineMat = OiyoField.Sprite("BI/pine");
        snowMat = OiyoArcade.Lit(Color.white, 0.35f, OiyoArcade.Art("BI/snow", true));
        trackMat = OiyoArcade.Lit(new Color(0.65f, 0.85f, 0.99f), 0.4f);
        plateMat = OiyoArcade.Lit(new Color(0.2f, 0.23f, 0.25f), 0.3f);
        rangeMat = OiyoArcade.Lit(new Color(0.55f, 0.36f, 0.2f), 0.2f);
        disc = MakeDisc(64);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    static Texture2D MakeDisc(int n)
    {
        var tex = new Texture2D(n, n, TextureFormat.RGBA32, false) { filterMode = FilterMode.Bilinear, wrapMode = TextureWrapMode.Clamp };
        var px = new Color[n * n];
        float r = n * 0.5f;
        for (int y = 0; y < n; y++)
            for (int x = 0; x < n; x++)
            {
                float dd = Mathf.Sqrt((x + 0.5f - r) * (x + 0.5f - r) + (y + 0.5f - r) * (y + 0.5f - r));
                px[y * n + x] = new Color(1f, 1f, 1f, Mathf.Clamp01(r - dd));
            }
        tex.SetPixels(px); tex.Apply();
        return tex;
    }

    void LoadStage(int idx, bool ready = true)
    {
        stageIdx = Mathf.Clamp(idx, 0, StageCount - 1);
        StopAllCoroutines();
        stage = BiathlonStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Course").transform;
        NewRacer();
        starsWon = 0;
        showStages = false;
        held = false;
        trail = 0f;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    void BuildScene()
    {
        var snow = OiyoArcade.Prim(PrimitiveType.Cube, "Snow", snowMat, root);
        snow.transform.localScale = new Vector3(400f, 0.1f, 60f);
        snow.transform.position = new Vector3(0f, -0.05f, 10f);
        for (int s = -1; s <= 1; s += 2)
        {
            var tr = OiyoArcade.Prim(PrimitiveType.Cube, "Track", trackMat, root);
            tr.transform.localScale = new Vector3(400f, 0.02f, 0.08f);
            tr.transform.position = new Vector3(0f, 0.01f, s * 0.25f);
        }
        pines.Clear();
        var rnd = OiyoField.Mulberry(stage.seed + 7u);
        for (int i = 0; i < 26; i++)
        {
            var p = OiyoField.Quad("Pine", pineMat, root, 1f, 1f);
            float sc = 2.5f + (float)rnd() * 2.5f;
            p.localScale = new Vector3(sc, sc * 1.15f, 1f);
            p.position = new Vector3(i * 6f + (float)rnd() * 3f, sc * 0.55f, 4f + (float)rnd() * 14f);
            pines.Add(p);
        }
        // the range: a wooden stand and the black target plate with five targets
        plate = new GameObject("Range").transform;
        plate.SetParent(root, false);
        var stand = OiyoArcade.Prim(PrimitiveType.Cube, "Stand", rangeMat, plate);
        stand.transform.localPosition = new Vector3(0f, 0.6f, 0f);
        stand.transform.localScale = new Vector3(4.6f, 1.2f, 0.3f);
        var board = OiyoArcade.Prim(PrimitiveType.Cube, "Plate", plateMat, plate);
        board.transform.localPosition = new Vector3(0f, 1.7f, 0f);
        board.transform.localScale = new Vector3(4.4f, 1.1f, 0.2f);
        skier = OiyoField.Quad("Skier", skierMat, root, 1f, 1f);
        skier.localScale = new Vector3(1.6f, 1.6f, 1f);
        skierR = skier.GetComponent<Renderer>();
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("biathlon", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            pushing = held && !atRange;
            string ev = Step(dt);
            if (ev == "range") { held = false; synth.Tone(330f, 0.12f, Wave.Triangle, 0.12f, 440f, 10f); }
            else if (ev == "finish") End();
            trail += v * dt;
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 0.9f; msgC = c; }

    bool held;
    void Press()
    {
        held = true;
        if (!atRange) return;
        string r = Fire();
        if (r == "hit") { Toast(U("Hit!"), new Color(0.55f, 1f, 0.6f)); synth.Tone(1200f, 0.05f, Wave.Noise, 0.16f, 600f, 20f); synth.Tone(988f, 0.12f, Wave.Triangle, 0.12f, 1319f, 8f); }
        else if (r == "miss") { Toast(U("Miss +10s"), new Color(1f, 0.5f, 0.45f)); synth.Tone(1200f, 0.05f, Wave.Noise, 0.16f, 600f, 20f); synth.Tone(180f, 0.2f, Wave.Square, 0.08f, 120f, 8f); }
        if (r != null && !atRange) held = false; // that was the last shot here
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
                    if (state == GameState.Playing && (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P))) { state = GameState.Paused; held = false; pushing = false; return; }
                    // the button is read once per frame: a press pushes (skiing) or fires (at the range)
                    bool pressed = OiyoArcade.Began().Count > 0;
                    bool released = OiyoArcade.Ended().Count > 0 && OiyoArcade.Held().Count == 0;
                    if (Input.GetKeyDown(KeyCode.Space)) { pressed = true; keyHeld = true; }
                    if (Input.GetKeyUp(KeyCode.Space) && keyHeld) { released = true; keyHeld = false; }
                    if (pressed)
                    {
                        if (state == GameState.Ready) state = GameState.Playing;
                        Press();
                    }
                    if (released) held = false;
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
        held = false; pushing = false;
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, hits, StageCount);
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

    void Animate(float dt)
    {
        if (root == null) return;
        // the skier stays put; the world (pines) scrolls past, looping
        float x0 = trail * 0.5f;
        skier.position = new Vector3(x0, 0.85f, 0f);
        skierR.sharedMaterial = pushing && Mathf.FloorToInt(t * 4f) % 2 == 1 ? skierBMat : skierMat;
        foreach (var p in pines)
        {
            float px = p.position.x;
            if (px < x0 - 40f) p.position = new Vector3(px + 160f, p.position.y, p.position.z);
        }
        plate.gameObject.SetActive(false); // the sight view is drawn in the GUI
        plate.position = new Vector3(x0 + 2f, 0f, 9f);
        plate.rotation = Quaternion.identity;
        bool portrait = cam.aspect < 1f;
        Vector3 camPos, look;
        if (atRange) { camPos = new Vector3(x0 + 2f, 1.9f, 9f - (portrait ? 9f : 6.5f)); look = new Vector3(x0 + 2f, 1.6f, 9f); }
        else { camPos = new Vector3(x0 - (portrait ? 3.5f : 4.5f), portrait ? 3.2f : 2.6f, -(portrait ? 9f : 7f)); look = new Vector3(x0 + 2.5f, 1.2f, 2f); }
        cam.transform.position = dt <= 0f ? camPos : Vector3.Lerp(cam.transform.position, camPos, 1f - Mathf.Exp(-dt * 5f));
        cam.transform.LookAt(look);
        skier.rotation = cam.transform.rotation;
        skier.gameObject.SetActive(!atRange);
        foreach (var p in pines) p.rotation = cam.transform.rotation;
    }

    // ?oiyotest=1 prints the race state to the browser console for the automated play check.
    bool testLog; float testT;
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.02f;
        var s = atRange ? Sight() : Vector2.zero;
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F3},\"range\":{(atRange ? 1 : 0)},\"leg\":{leg},\"d\":{d:F1},\"v\":{v:F2},\"hr\":{hr:F1},\"push\":{(pushing ? 1 : 0)},\"rangeT\":{rangeT:F3},\"sx\":{s.x:F2},\"sy\":{s.y:F2},\"r\":{stage.radius:F2},\"shot\":{shot},\"hits\":{hits},\"misses\":{misses},\"penalty\":{penalty:F1},\"goal\":{stage.goal:F1},\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.1f, 0.44f, 0.76f, 0.97f);
    static readonly Color Dark = new Color(0.04f, 0.14f, 0.28f, 0.86f);

    string StageTitle(int i) => F("Stage {0}", i + 1) + " · " + F("{0} ranges", BiathlonStages.All[i].legs - 1);

    void Disc(float cx, float cy, float r, Color c)
    {
        var old = GUI.color;
        GUI.color = c;
        GUI.DrawTexture(new Rect(cx - r, cy - r, r * 2f, r * 2f), disc);
        GUI.color = old;
    }

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
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.8f, 0.92f, 1f), U("Biathlon"),
                U("Hold to ski hard (your heart races), let go to glide. At the range, tap when the sight is on the target."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        float hrShare = (hr - Rest) / (MaxHr - Rest);
        var hrCol = hrShare > 0.6f ? new Color(1f, 0.4f, 0.4f) : hrShare > 0.3f ? new Color(1f, 0.7f, 0.3f) : new Color(0.5f, 1f, 0.55f);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Stage {0}", stageIdx + 1) + "</b>   " + F("Rival {0}s", stage.goal.ToString("F1")) + "   " + F("Leg {0}/{1}", Mathf.Min(leg + 1, stage.legs), stage.legs), 15, new Color(1f, 0.92f, 0.75f));
        OiyoArcade.Text(new Rect(20f, 36f, w - 90f, 24f), $"<b>{t:F1}s</b>   <color=#{ColorUtility.ToHtmlStringRGB(hrCol)}>♥ {hr:F0} bpm</color>", 16, Color.white);
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) { state = GameState.Paused; held = false; pushing = false; }
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Playing && atRange)
        {
            // the view through the sight: five targets, the shots so far and the swaying crosshair
            float scope = Mathf.Min(5f, (w - 40f) / 70f);
            float cx = w * 0.5f, cy = h * 0.5f + 10f;
            OiyoArcade.Fill(new Rect(cx - 156f, cy - 156f, 312f, 312f), new Color(0.55f, 0.36f, 0.2f, 0.95f));
            OiyoArcade.Fill(new Rect(cx - 150f, cy - 150f, 300f, 300f), new Color(0.2f, 0.23f, 0.25f, 0.97f));
            for (int k = 0; k < Shots; k++)
            {
                bool done = k < marks.Count;
                Disc(cx - 120f + k * 60f, cy - 120f, 15f, Color.white);
                Disc(cx - 120f + k * 60f, cy - 120f, 13f, done && marks[k].z > 0.5f ? Color.white : new Color(0.1f, 0.1f, 0.1f));
            }
            Disc(cx, cy, stage.radius * scope + 2f, Color.white);
            Disc(cx, cy, stage.radius * scope, new Color(0.1f, 0.1f, 0.1f));
            foreach (var mk in marks) Disc(cx + mk.x * scope, cy + mk.y * scope, 4f, mk.z > 0.5f ? new Color(1f, 0.8f, 0.1f) : new Color(1f, 0.42f, 0.42f));
            if (rangeT >= AimTime)
            {
                var s = Sight();
                float sx = cx + s.x * scope, sy = cy + s.y * scope;
                var col = s.magnitude <= stage.radius ? new Color(0.25f, 0.75f, 0.34f) : new Color(1f, 0.53f, 0.53f);
                OiyoArcade.Fill(new Rect(sx - 26f, sy - 1.5f, 52f, 3f), col);
                OiyoArcade.Fill(new Rect(sx - 1.5f, sy - 26f, 3f, 52f), col);
            }
            OiyoArcade.Shadowed(new Rect(8f, cy + 160f, w - 16f, 26f), rangeT < AimTime ? U("Raising the rifle…") : U("Range — shoot once your heart settles"), 16, Color.white, TextAnchor.MiddleCenter);
        }
        else if (state == GameState.Playing && penalty > 0f)
            OiyoArcade.Shadowed(new Rect(8f, 116f, w - 16f, 28f), F("Penalty loop {0}s", penalty.ToString("F1")), 18, new Color(1f, 0.6f, 0.5f), TextAnchor.MiddleCenter);
        if (state == GameState.Playing && !atRange)
            OiyoArcade.Bar(new Rect(20f, 80f, w - 40f, 8f), Mathf.Clamp01(d / stage.leg), new Color(0f, 0f, 0f, 0.3f), new Color(0.1f, 0.44f, 0.76f));
        if (msgT > 0f) OiyoArcade.Shadowed(new Rect(8f, h - 120f, w - 16f, 36f), msg, 22, msgC, TextAnchor.MiddleCenter);
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Hold to push, let go to glide"), U("Calm your heart before you shoot. Each miss is a 10-second penalty loop."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : F("Rival {0}s", stage.goal.ToString("F1"));
            string body = $"<b>{t:F1}s</b>\n<size=14>{F("{0}/{1} hits", hits, hits + misses)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("You beat the rival!") : U("The rival was faster"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next stage") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
