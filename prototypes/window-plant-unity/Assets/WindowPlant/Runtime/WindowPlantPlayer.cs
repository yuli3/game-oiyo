using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// Window Plant 3D: the web Window Plant (src/components/games/WindowPlant.tsx, src/lib/games/window-plant.ts) rebuilt
// in Unity on the web's own 360 × 560 px field (OiyoField). Over the day the sun crosses from −1 to +1; soil dries at
// the stage's rate (0.45 × in cloud) and a watering adds 0.35. Growth per second = light (×0.35 in cloud, ×0.35 facing
// away from the sun) × roots (−0.3 below 0.15, 0.4 below 0.3, 1 up to 0.85, 0.3 above) × rot (0.4 after 6 s soaked)
// × (1 − 0.45 per bug nibbling, i.e. sitting more than 9 s). Reach the day's height by evening. The 30 days are the
// web's own (WindowPlantStages.cs).
public class WindowPlantPlayer : MonoBehaviour
{
    const string Slug = "window-plant";
    const int StageCount = 30;
    const float Water = 0.35f, BugLife = 9f, PotY = 440f;
    static readonly Rect[] Plates = { new Rect(10f, 500f, 108f, 50f), new Rect(126f, 500f, 108f, 50f), new Rect(242f, 500f, 108f, 50f) };

    string U(string en) => OiyoI18n.Ui(en, OiyoArcade.Lang);
    string F(string en, params object[] a) => string.Format(U(en), a);

    public enum GameState { Menu, Ready, Playing, Paused, Victory, GameOver }
    GameState state = GameState.Menu;

    // ---------------- Rules (a straight port of window-plant.ts) ----------------
    WindowPlantStages.Level st;
    int stageIdx, starsWon, facing, waterings;
    float t, moisture, height, soggy;
    bool[] bugGone;
    bool over, won;

    float Sun => -1f + 2f * Mathf.Min(t, st.day) / st.day;
    bool Cloudy { get { for (int i = 0; i + 1 < st.clouds.Length; i += 2) if (t >= st.clouds[i] && t < st.clouds[i + 1]) return true; return false; } }
    float Light => (Cloudy ? 0.35f : 1f) * ((facing * Sun > 0f || Mathf.Abs(Sun) < 0.15f) ? 1f : 0.35f);
    bool BugOn(int k) => !bugGone[k] && st.bugs[k] <= t;
    int BugsOn { get { int n = 0; for (int k = 0; k < st.bugs.Length; k++) if (BugOn(k)) n++; return n; } }

    void NewPlant() { t = 0f; moisture = 0.6f; facing = 1; height = 0f; soggy = 0f; waterings = 0; bugGone = new bool[st.bugs.Length]; over = false; won = false; }

    bool Act(int what) // 0 water, 1 turn, 2 bug
    {
        if (over) return false;
        if (what == 0) { moisture = Mathf.Min(1.2f, moisture + Water); waterings++; return true; }
        if (what == 1) { facing = facing == 1 ? -1 : 1; return true; }
        for (int k = 0; k < st.bugs.Length; k++) if (BugOn(k)) { bugGone[k] = true; return true; }
        return false;
    }

    float GrowthRate()
    {
        float m = moisture;
        float roots = m < 0.15f ? -0.3f : m < 0.3f ? 0.4f : m <= 0.85f ? 1f : 0.3f;
        int nibble = 0;
        for (int k = 0; k < st.bugs.Length; k++) if (BugOn(k) && t - st.bugs[k] > BugLife) nibble++;
        float rot = soggy > 6f ? 0.4f : 1f;
        return Light * roots * rot * Mathf.Max(0f, 1f - nibble * 0.45f);
    }

    bool Step(float dt)
    {
        if (over) return false;
        t += dt;
        moisture = Mathf.Max(0f, moisture - st.dry * dt * (Cloudy ? 0.45f : 1f));
        if (moisture > 0.95f) soggy += dt; else soggy = Mathf.Max(0f, soggy - dt * 0.5f);
        height += GrowthRate() * dt;
        if (height >= st.target) { over = true; won = true; return true; }
        if (t >= st.day) { over = true; return true; }
        return false;
    }

    int StarsFor()
    {
        if (!won) return 0;
        if (t <= st.par * 1.08f) return 3;
        if (t <= (st.par + st.day) / 2f) return 2;
        return 1;
    }

    // ---------------- Scene ----------------
    OiyoField field;
    Camera cam;
    Transform root, sun, cloud, stem, soil, moistBar;
    readonly List<Transform> leaves = new List<Transform>();
    readonly List<Transform> bugQuads = new List<Transform>();
    Material skyMat, duskMat, frameMat, sillMat, potMat, rimMat, stemMat, leafA, leafB, soilMat, plateMat, cloudMat, barMat, barLow, barHigh;
    Renderer skyR, soilR, barR;
    Bursts drops;
    Synth synth;
    bool showStages;

    void Awake()
    {
        Application.targetFrameRate = 60;
        testLog = Application.absoluteURL.Contains("oiyotest=1");
        field = new OiyoField(360f, 560f, new Color(0.91f, 0.93f, 0.94f));
        cam = field.Cam;
        OiyoField.Lights(new Color(0.78f, 0.78f, 0.8f), 0.8f, 35f, -30f);
        drops = new Bursts(transform, 0.8f);
        synth = new Synth(gameObject);
        skyMat = OiyoArcade.Lit(new Color(0.45f, 0.75f, 0.99f), 0.1f, OiyoArcade.Art("WP/sky", true));
        duskMat = OiyoArcade.Lit(new Color(0.96f, 0.62f, 0f), 0.1f, OiyoArcade.Art("WP/sky", true));
        frameMat = OiyoArcade.Lit(new Color(0.68f, 0.71f, 0.74f), 0.3f);
        sillMat = OiyoArcade.Lit(new Color(0.75f, 0.63f, 0.5f), 0.2f, OiyoArcade.Art("WP/wood", true));
        potMat = OiyoArcade.Lit(new Color(0.85f, 0.28f, 0.05f), 0.3f);
        rimMat = OiyoArcade.Lit(new Color(0.91f, 0.35f, 0.05f), 0.3f);
        stemMat = OiyoArcade.Lit(new Color(0.18f, 0.62f, 0.27f), 0.2f);
        leafA = OiyoArcade.Lit(new Color(0.25f, 0.75f, 0.34f), 0.3f);
        leafB = OiyoArcade.Lit(new Color(0.32f, 0.81f, 0.4f), 0.3f);
        soilMat = OiyoArcade.Lit(new Color(0.45f, 0.32f, 0.2f), 0.1f);
        plateMat = OiyoArcade.Lit(new Color(0.1f, 0.44f, 0.76f), 0.4f);
        cloudMat = OiyoArcade.Lit(new Color(0.97f, 0.98f, 0.98f), 0.1f);
        barMat = OiyoArcade.Lit(new Color(0.3f, 0.67f, 0.97f), 0.3f);
        barLow = OiyoArcade.Lit(new Color(0.91f, 0.35f, 0.05f), 0.3f);
        barHigh = OiyoArcade.Lit(new Color(0.1f, 0.44f, 0.76f), 0.3f);
        stageIdx = Mathf.Clamp(OiyoArcade.Unlocked(Slug) - 1, 0, StageCount - 1);
        if (OiyoField.TestStage(StageCount) >= 0) stageIdx = OiyoField.TestStage(StageCount);
        LoadStage(stageIdx, false);
    }

    void LoadStage(int i, bool ready = true)
    {
        stageIdx = Mathf.Clamp(i, 0, StageCount - 1);
        StopAllCoroutines();
        st = WindowPlantStages.All[stageIdx];
        if (root != null) Destroy(root.gameObject);
        root = new GameObject("Windowsill").transform;
        NewPlant();
        starsWon = 0;
        showStages = false;
        BuildScene();
        state = ready ? GameState.Ready : GameState.Menu;
        Animate(0f);
    }

    Transform Box(Material m, float x, float y, float w, float h, float z, float depth)
    {
        var q = OiyoArcade.Prim(PrimitiveType.Cube, "Box", m, root).transform;
        q.position = field.W(x, y, z);
        q.localScale = new Vector3(OiyoField.U(w), OiyoField.U(h), depth);
        return q;
    }

    void BuildScene()
    {
        skyR = Box(skyMat, 180f, 200f, 300f, 320f, 0.6f, 0.1f).GetComponent<Renderer>();
        Box(frameMat, 180f, 200f, 6f, 320f, 0.3f, 0.2f);
        Box(frameMat, 180f, 198f, 300f, 6f, 0.3f, 0.2f);
        Box(frameMat, 25f, 200f, 10f, 340f, 0.3f, 0.3f);
        Box(frameMat, 335f, 200f, 10f, 340f, 0.3f, 0.3f);
        Box(frameMat, 180f, 35f, 320f, 10f, 0.3f, 0.3f);
        Box(sillMat, 180f, PotY + 45f, 1600f, 30f, 0.1f, 0.8f);
        sun = OiyoField.Quad("Sun", OiyoField.Sprite("WP/sun"), root, 40f, 40f);
        cloud = Box(cloudMat, 0f, 0f, 120f, 36f, 0.4f, 0.1f);
        Box(potMat, 180f, PotY + 12f, 80f, 44f, -0.1f, 0.8f);
        Box(rimMat, 180f, PotY - 10f, 92f, 12f, -0.2f, 0.9f);
        soilR = Box(soilMat, 180f, PotY - 15f, 80f, 6f, -0.25f, 0.85f).GetComponent<Renderer>();
        stem = Box(stemMat, 180f, PotY, 4f, 10f, -0.3f, 0.1f);
        leaves.Clear();
        for (int k = 0; k < 12; k++) leaves.Add(Box(k % 3 == 0 ? leafA : leafB, 0f, 0f, 22f, 9f, -0.35f, 0.15f));
        bugQuads.Clear();
        for (int k = 0; k < st.bugs.Length; k++) bugQuads.Add(OiyoField.Quad("Bug", OiyoField.Sprite("WP/bug"), root, 18f, 14f));
        Box(frameMat, 74f, PotY + 71f, 124f, 14f, -0.1f, 0.1f);
        moistBar = Box(barMat, 0f, 0f, 1f, 10f, -0.2f, 0.1f);
        barR = moistBar.GetComponent<Renderer>();
        Box(stemMat, 14f + 120f * (0.3f / 1.2f), PotY + 71f, 2f, 16f, -0.25f, 0.1f);
        Box(stemMat, 14f + 120f * (0.85f / 1.2f), PotY + 71f, 2f, 16f, -0.25f, 0.1f);
        foreach (var p in Plates) Box(plateMat, p.center.x, p.center.y, p.width, p.height, -0.2f, 0.3f);
    }

    // ---------------- Loop ----------------
    void Update()
    {
        // Run result for the embedding OIYO page (scripts/unity/oiyo-result).
        OiyoResult.Track("window-plant", state, starsWon);
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        TestTick(dt);
        ReadInput();
        if (state == GameState.Playing)
        {
            float was = moisture, sog = soggy;
            if (Step(dt)) End();
            if (was >= 0.15f && moisture < 0.15f) Toast(U("The soil is dry"), new Color(1f, 0.6f, 0.3f));
            if (sog <= 3f && soggy > 3f) Toast(U("Too much water"), new Color(0.45f, 0.7f, 1f));
        }
        msgT = Mathf.Max(0f, msgT - dt);
        Animate(dt);
    }

    string msg = ""; float msgT; Color msgC = Color.white;
    void Toast(string m, Color c) { msg = m; msgT = 1.5f; msgC = c; }

    void DoAct(int what)
    {
        if (!Act(what)) return;
        if (what == 0) { drops.Emit(field.W(180f, PotY - 20f, -0.6f), new Color(0.45f, 0.75f, 0.99f), 10, 2f, 0.05f, 0.5f); synth.Tone(moisture > 0.95f ? 220f : 520f, 0.1f, Wave.Sine, 0.14f, 360f, 8f); }
        else if (what == 1) synth.Tone(440f, 0.06f, Wave.Triangle, 0.1f, 0f, 12f);
        else { drops.Emit(field.W(200f, PotY - 60f, -0.6f), new Color(0.55f, 0.91f, 0.6f), 6, 3f, 0.05f, 0.4f); synth.Tone(880f, 0.08f, Wave.Triangle, 0.14f, 1175f, 10f); }
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
                    // taps are read once per frame: the plates water, turn and flick; the soil waters, the leaves flick
                    foreach (var b in OiyoArcade.Began())
                    {
                        if (OiyoArcade.OverUi(b.pos) || !field.ToField(b.pos, out Vector2 f)) continue;
                        if (state == GameState.Ready) { state = GameState.Playing; continue; }
                        for (int k = 0; k < Plates.Length; k++) if (Plates[k].Contains(f)) DoAct(k);
                        if (f.y < PotY - 20f && f.y > 60f && BugsOn > 0) DoAct(2);
                        else if (f.y >= PotY - 20f && f.y <= PotY + 34f) DoAct(0);
                    }
                    if (Input.GetKeyDown(KeyCode.W)) { if (state == GameState.Ready) state = GameState.Playing; DoAct(0); }
                    if (Input.GetKeyDown(KeyCode.T)) { if (state == GameState.Ready) state = GameState.Playing; DoAct(1); }
                    if (Input.GetKeyDown(KeyCode.B)) { if (state == GameState.Ready) state = GameState.Playing; DoAct(2); }
                    if (state == GameState.Ready && (confirm || Input.GetKeyDown(KeyCode.Space))) state = GameState.Playing;
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
                if (!showStages && confirm) LoadStage(stageIdx);
                return;
        }
    }

    float endTime;
    bool ResultLive => Time.unscaledTime - endTime > 0.45f;

    void End()
    {
        if (state != GameState.Playing) return;
        endTime = Time.unscaledTime;
        if (won)
        {
            starsWon = StarsFor();
            state = GameState.Victory;
            OiyoArcade.Record(Slug, stageIdx, starsWon, Mathf.RoundToInt(height), StageCount);
            drops.Emit(field.W(180f, PotY - 150f, -0.8f), new Color(1f, 0.85f, 0.25f), 30, 4f, 0.1f, 1f);
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
        field.Fit(80f, 10f, 0f);
        float dayT = Mathf.Min(1f, t / st.day);
        skyR.sharedMaterial = dayT > 0.85f ? duskMat : skyMat;
        float sx = 30f + (Sun + 1f) / 2f * 300f;
        sun.gameObject.SetActive(!Cloudy);
        sun.position = field.W(sx, 90f + Mathf.Abs(Sun) * 50f, 0.45f);
        cloud.gameObject.SetActive(Cloudy);
        cloud.position = field.W(sx, 105f, 0.4f);
        float m = Mathf.Min(1f, moisture);
        soilR.material.color = new Color((150f - m * 90f) / 255f, (110f - m * 70f) / 255f, (70f - m * 40f) / 255f);
        float tall = Mathf.Min(260f, 10f + height / st.target * 240f);
        stem.position = field.W(180f, PotY - 18f - tall / 2f, -0.3f);
        stem.localScale = new Vector3(OiyoField.U(4f), OiyoField.U(tall), 0.1f);
        float wilt = moisture < 0.15f ? 6f : 0f;
        int shown = Mathf.FloorToInt(tall / 22f);
        for (int k = 0; k < leaves.Count; k++)
        {
            leaves[k].gameObject.SetActive(k < shown);
            int side = (k % 2 == 0 ? 1 : -1) * facing;
            leaves[k].position = field.W(180f + (side > 0 ? 13f : -13f), PotY - 30f - k * 22f + wilt + 4.5f, -0.35f);
        }
        int n = 0;
        for (int k = 0; k < st.bugs.Length; k++)
        {
            bool on = BugOn(k);
            bugQuads[k].gameObject.SetActive(on);
            if (!on) continue;
            bool nib = t - st.bugs[k] > BugLife;
            bugQuads[k].position = field.W(200f - n * 30f, PotY - 50f - (n % 3) * 30f + (nib ? Mathf.Sin(Time.time * 12f) * 2f : 0f), -0.5f);
            n++;
        }
        float bw = 120f * Mathf.Min(1f, moisture / 1.2f);
        moistBar.position = field.W(14f + bw / 2f, PotY + 71f, -0.2f);
        moistBar.localScale = new Vector3(OiyoField.U(Mathf.Max(1f, bw)), OiyoField.U(10f), 0.1f);
        barR.sharedMaterial = moisture > 0.95f ? barHigh : moisture < 0.3f ? barLow : barMat;
    }

    // ?oiyotest=1 prints the state to the browser console for the automated play check: the clock, the sun, the soil,
    // which way the pot faces, bugs on the leaves, the height against the target, and the plates' screen points
    // (px from the top-left) in the order water, turn, bug.
    bool testLog; float testT;
    Vector2 Scr(Vector2 f) { var sp = cam.WorldToScreenPoint(field.W(f.x, f.y, -0.3f)); return new Vector2(sp.x, Screen.height - sp.y); }
    void TestTick(float dt)
    {
        if (!testLog || (testT -= dt) > 0f) return;
        testT = 0.1f;
        var pl = new System.Text.StringBuilder();
        for (int k = 0; k < Plates.Length; k++) { if (k > 0) pl.Append(','); var p = Scr(Plates[k].center); pl.Append('[').Append(p.x.ToString("F1")).Append(',').Append(p.y.ToString("F1")).Append(']'); }
        Debug.Log($"OIYOTEST {{\"s\":\"{state}\",\"stage\":{stageIdx + 1},\"t\":{t:F2},\"sun\":{Sun:F3},\"moisture\":{moisture:F3},\"facing\":{facing},\"bugs\":{BugsOn},\"height\":{height:F2},\"target\":{st.target:F1},\"plates\":[{pl}],\"sw\":{Screen.width},\"sh\":{Screen.height}}}");
    }

    // ---------------- GUI ----------------
    static readonly Color Accent = new Color(0.18f, 0.62f, 0.27f, 0.97f);
    static readonly Color Dark = new Color(0.1f, 0.14f, 0.12f, 0.88f);
    static readonly string[] PlateName = { "Water", "Turn pot", "Flick bug" };

    string StageTitle(int i) => F("Day {0}", i + 1) + " · " + F("Height {0}/{1}", 0, WindowPlantStages.All[i].target.ToString("F0"));

    void OnGUI()
    {
        OiyoArcade.Begin();
        float w = OiyoArcade.W, h = OiyoArcade.H;
        if (state == GameState.Menu)
        {
            if (showStages)
            {
                int pick = OiyoScreens.Stages(w, h, Dark, Accent, Slug, StageCount, U("Choose a day"), U("Back"), U("Stage"));
                if (pick == -2) showStages = false; else if (pick >= 0) LoadStage(pick);
                return;
            }
            int m = OiyoScreens.Menu(w, h, Dark, Accent, new Color(0.9f, 1f, 0.92f), U("Window Plant"),
                U("Leave it open beside your work. Water it when the soil is dry, turn it to the sun, flick off bugs, and grow it to the day's height by evening."),
                StageTitle(stageIdx), F("Play stage {0}", stageIdx + 1), U("All 30 stages") + $"  ★ {OiyoArcade.TotalStars(Slug, StageCount)}");
            if (m == 1) LoadStage(stageIdx); else if (m == 2) showStages = true;
            return;
        }
        var bar = new Rect(8f, 8f, w - 16f, 64f);
        OiyoArcade.Panel(bar, Dark);
        OiyoArcade.Text(new Rect(20f, 12f, w - 90f, 22f), "<b>" + F("Day {0}", stageIdx + 1) + "</b>  " + F("Height {0}/{1}", Mathf.FloorToInt(height), st.target.ToString("F0")), 15, new Color(0.9f, 1f, 0.92f));
        OiyoArcade.Bar(new Rect(20f, 42f, w - 100f, 10f), Mathf.Min(1f, t / st.day), new Color(1f, 1f, 1f, 0.2f), new Color(1f, 0.83f, 0.23f));
        if (OiyoArcade.Button(new Rect(w - 60f, 14f, 44f, 44f), "<b>II</b>", OiyoScreens.Slate, 18))
        {
            if (state == GameState.Playing) state = GameState.Paused;
            else if (state == GameState.Ready) state = GameState.Menu;
        }
        if (state == GameState.Playing || state == GameState.Ready)
            for (int k = 0; k < Plates.Length; k++)
            {
                var g = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(Plates[k].center.x, Plates[k].center.y, -0.4f)));
                OiyoArcade.Shadowed(new Rect(g.x - 54f, g.y - 11f, 108f, 22f), "<b>" + U(PlateName[k]) + "</b>", 14, Color.white, TextAnchor.MiddleCenter);
            }
        if (msgT > 0f)
        {
            var g = OiyoArcade.ToGui(cam.WorldToScreenPoint(field.W(180f, 390f, -0.8f)));
            OiyoArcade.Shadowed(new Rect(8f, g.y - 14f, w - 16f, 28f), "<b>" + msg + "</b>", 17, msgC, TextAnchor.MiddleCenter);
        }
        if (state == GameState.Ready)
            OiyoScreens.Hint(w, h, Dark, U("Tap to start"), U("Leave it open while you work and watch it grow."), 200f, 100f);
        if (state == GameState.Paused)
        {
            int p = OiyoScreens.Pause(w, h, Dark, Accent, U("Paused"), U("Resume"), U("Restart"), U("Stage list"));
            if (p == 1) state = GameState.Playing; else if (p == 2) LoadStage(stageIdx); else if (p == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
        if (state == GameState.Victory || state == GameState.GameOver)
        {
            bool w0 = state == GameState.Victory;
            string detail = w0 ? $"<size=30>{OiyoArcade.StarString(starsWon)}</size>" : "";
            string body = $"<size=14>{F("Height {0} · watered {1} times", Mathf.RoundToInt(height), waterings)}</size>";
            int r = OiyoScreens.Result(w, h, Dark, Accent, w0, ResultLive, w0 ? U("It shot up!") : U("Evening came"), detail, body,
                w0 && stageIdx < StageCount - 1 ? U("Next day") : null, w0 && stageIdx == StageCount - 1 ? U("You cleared all 30 stages!") : null, U("Retry"), U("Stage list"));
            if (r == 1) LoadStage(stageIdx + 1); else if (r == 2) LoadStage(stageIdx); else if (r == 3) { LoadStage(stageIdx, false); showStages = true; }
        }
    }
}
